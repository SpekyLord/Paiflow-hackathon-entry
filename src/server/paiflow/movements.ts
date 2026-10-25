import "server-only";
import type { ErrorCode } from "@/contracts/errors";
import { stellarExpertTxUrl } from "@/lib/explorer";
import {
  isVerifiedMovement,
  movementTotals,
  type MoneyMovementDTO,
  type MoneyMovementRow,
  type MoneyMovementsPage,
} from "@/lib/money-movements";
import { requireSession, type PaymentDeps } from "@/server/paiflow/deps";
import { movementsToCsv } from "@/server/paiflow/movements-csv";
import { fail, requireUuid, respond, RouteError } from "@/server/paiflow/route-kit";

// ERP-LOG-1: GET /api/orgs/:orgId/money-movements (members only). A
// read-only expense log of payments and envelope payouts. It never calls
// Paiflow and never returns XDR or request ids. Verified and pending rows
// are kept apart: only verified rows enter the totals.
export const DEFAULT_PAGE = 50;
export const MAX_PAGE = 200;

// The list_money_movements RPC (CR drafted in docs/CARLOS-ERP-MODULES.md).
export interface MovementsPort {
  listMoneyMovements(input: {
    orgId: string;
    actorUserId: string;
    limit: number;
    before: string | null;
  }): Promise<{ ok: true; value: MoneyMovementRow[] } | { ok: false; code: ErrorCode }>;
}

// Until the RPC exists the route answers honestly instead of inventing rows.
export const unavailableMovementsPort: MovementsPort = {
  listMoneyMovements: async () => {
    throw new RouteError("INTERNAL", "The money movements log is not available yet.");
  },
};

const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const STELLAR_HASH = /^[a-f0-9]{64}$/;

function parseQuery(url: URL) {
  const rawLimit = url.searchParams.get("limit");
  let limit = DEFAULT_PAGE;
  if (rawLimit !== null) {
    if (!/^\d{1,4}$/.test(rawLimit) || Number(rawLimit) < 1) fail("VALIDATION_SHAPE", "Invalid limit.");
    limit = Math.min(Number(rawLimit), MAX_PAGE);
  }
  const before = url.searchParams.get("before");
  if (before !== null && (!ISO_UTC.test(before) || Number.isNaN(Date.parse(before)))) fail("VALIDATION_SHAPE", "Invalid before.");
  const format = url.searchParams.get("format");
  if (format !== null && format !== "csv" && format !== "json") fail("VALIDATION_SHAPE", "Invalid format.");
  return { limit, before, csv: format === "csv" };
}

function toDto(row: MoneyMovementRow): MoneyMovementDTO {
  // Anything that is not a 64-hex Stellar hash (e.g. a CYFER audit hash) is dropped.
  const stellarTxHash = row.stellarTxHash && STELLAR_HASH.test(row.stellarTxHash) ? row.stellarTxHash : null;
  return {
    at: row.at,
    kind: row.kind,
    planId: row.planId,
    planPurpose: row.planPurpose,
    label: row.label,
    amountStroops: row.amountStroops,
    stellarTxHash,
    verification: row.verification,
    explorerUrl: stellarTxHash ? stellarExpertTxUrl(stellarTxHash) : null,
    verified: isVerifiedMovement(row),
  };
}

export async function moneyMovementsHandler(
  deps: PaymentDeps,
  port: MovementsPort,
  request: Request,
  params: { orgId: string },
): Promise<{ page: MoneyMovementsPage; csv: boolean }> {
  const session = await requireSession(deps, request);
  deps.rateLimit("check", session.userId);
  requireUuid(params.orgId, "organisation");
  const { limit, before, csv } = parseQuery(new URL(request.url));

  const result = await port.listMoneyMovements({ orgId: params.orgId, actorUserId: session.userId, limit, before });
  if (!result.ok) return fail(result.code);
  const rows = result.value.slice(0, limit);
  return {
    csv,
    page: {
      rows: rows.map(toDto),
      nextBefore: rows.length === limit ? rows[rows.length - 1].at : null,
      totals: movementTotals(rows),
    },
  };
}

export async function moneyMovementsResponse(
  deps: PaymentDeps,
  port: MovementsPort,
  request: Request,
  params: { orgId: string },
): Promise<Response> {
  let outcome: Awaited<ReturnType<typeof moneyMovementsHandler>>;
  try {
    outcome = await moneyMovementsHandler(deps, port, request, params);
  } catch (error) {
    return respond(async () => Promise.reject(error)); // shared error envelope
  }
  if (!outcome.csv) return respond(async () => outcome.page);
  return new Response(movementsToCsv(outcome.page.rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="cyfer-money-movements.csv"',
      "Cache-Control": "private, no-store",
    },
  });
}
