import type { TimelineEntryDTO } from '@/contracts/dto';
import { HashChip, formatPht } from './evidence';

/** Replaces the inherited government AuditTimeline. Each hash keeps its own kind label. */
export function PlanTimeline({ entries }: { entries: TimelineEntryDTO[] }) {
  if (entries.length === 0) return <p className="text-sm text-[#5f7167]">No recorded events yet.</p>;
  return (
    <ol className="space-y-4">
      {entries.map((e, i) => (
        <li key={`${e.at}-${i}`} className="border-l-2 border-[#d6e2d9] pl-4">
          <div className="text-[11px] text-[#6d7f75]">{formatPht(e.at)} · {e.actorRole}</div>
          <div className="mt-0.5 text-sm font-medium text-[#25483a]">{e.summary}</div>
          <div className="mt-1.5 space-y-1">
            {e.stellarTxHash && <div><HashChip value={e.stellarTxHash} kind="stellarTxHash" explorer /></div>}
            {e.sha256 && <div><HashChip value={e.sha256} kind="sha256" /></div>}
            {e.auditHash && <div><HashChip value={e.auditHash} kind="auditHash" /></div>}
            {e.ledgerBlockId != null && <div className="text-[11px] text-[#6d7f75]">CYFER ledger block #{e.ledgerBlockId} (application record, not a Stellar transaction)</div>}
          </div>
        </li>
      ))}
    </ol>
  );
}
