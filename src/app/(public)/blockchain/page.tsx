'use client';

import { useEffect, useState } from 'react';
import {
  Blocks,
  CheckCircle2,
  ChevronDown,
  Database,
  FileText,
  Hash,
  Loader2,
  Lock,
  Network,
  Send,
  Shield,
  UserCheck,
  Wifi,
  WifiOff,
  ArrowRight,
  ScrollText,
} from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/utils/formatters';

interface Block {
  id: number;
  timestamp: string;
  data: Record<string, unknown>;
  previous_hash: string;
  hash: string;
  nonce: number;
}

interface NodeStatus {
  id: number;
  name: string;
  url_hint: string;
  block_count: number;
  latest_hash: string | null;
  status: 'synced' | 'out_of_sync' | 'unreachable';
}

const ACTION_CONFIG: Record<
  string,
  {
    label: string;
    icon: typeof Blocks;
    variant: 'default' | 'success' | 'info' | 'warning' | 'accent';
    accentClass: string;
  }
> = {
  genesis: { label: 'Genesis block', icon: Shield, variant: 'accent', accentClass: 'text-[var(--ink-700)]' },
  document_upload: {
    label: 'Document upload',
    icon: FileText,
    variant: 'warning',
    accentClass: 'text-[var(--warn)]',
  },
  document_approved: {
    label: 'Approval',
    icon: UserCheck,
    variant: 'info',
    accentClass: 'text-[var(--info)]',
  },
  document_published: {
    label: 'Published',
    icon: Send,
    variant: 'success',
    accentClass: 'text-[var(--ok)]',
  },
  test: { label: 'Test block', icon: Blocks, variant: 'default', accentClass: 'text-[var(--text-mute)]' },
};

function getActionConfig(data: Record<string, unknown>) {
  const action = data.action as string | undefined;
  if (!action) {
    return ACTION_CONFIG.genesis;
  }

  return ACTION_CONFIG[action] ?? ACTION_CONFIG.test;
}

export default function BlockchainPage() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [chainValid, setChainValid] = useState<boolean | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [nodes, setNodes] = useState<NodeStatus[]>([]);
  const [nodesLoading, setNodesLoading] = useState(true);
  const [consensus, setConsensus] = useState<boolean | null>(null);

  useEffect(() => {
    async function fetchBlockchain() {
      try {
        const res = await fetch('/api/blockchain/validate');
        const json = await res.json();

        if (json.success) {
          setBlocks(json.data.blocks ?? []);
          setChainValid(json.data.valid);
        }
      } catch (error) {
        console.error('Failed to fetch blockchain:', error);
      } finally {
        setLoading(false);
      }
    }

    async function fetchNodes() {
      try {
        const res = await fetch('/api/blockchain/nodes');
        const json = await res.json();

        if (json.success) {
          setNodes(json.data.nodes ?? []);
          setConsensus(json.data.consensus);
        }
      } catch (error) {
        console.error('Failed to fetch nodes:', error);
      } finally {
        setNodesLoading(false);
      }
    }

    fetchBlockchain();
    fetchNodes();
  }, []);

  const reversedBlocks = [...blocks].reverse();

  return (
    <main id="main" className="container-page" style={{ paddingBottom: "var(--s-11)" }}>
      <div className="page-head">
        <div className="eyebrow">
          <span className="eyebrow-dot" />
          Advanced transparency tool
        </div>
        <h1>Blockchain ledger view</h1>
        <p className="lead">
          The technical ledger that backs every published record.
        </p>
        <div className="page-head-actions">
          <Link
            href="/audit"
            className="btn btn-outline inline-flex items-center gap-2"
          >
            <ScrollText size={15} />
            View Public Audit Log
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      <section style={{ paddingBlock: 'var(--s-3)' }}>
        <div className="section-head mb-4">
          <h2>How it works</h2>
          <p>The protections behind every public record.</p>
        </div>
        <div className="grid gap-x-6 gap-y-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {[
            {
              icon: Hash,
              title: 'Hash',
              description: 'Each block gets a unique cryptographic fingerprint.',
            },
            {
              icon: Lock,
              title: 'Link',
              description: 'Every block stores the previous hash, chaining records together.',
            },
            {
              icon: Network,
              title: 'Distribute',
              description: 'The same chain is stored across multiple nodes rather than one server.',
            },
            {
              icon: Shield,
              title: 'Verify',
              description: "If a block changes unexpectedly, the hashes stop matching and the issue becomes visible.",
            },
          ].map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex items-start gap-3">
              <span className="grid h-8 w-8 flex-none place-items-center rounded-[var(--r-md)] bg-[var(--ink-050)] text-[var(--ink-700)]">
                <Icon size={16} />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-[var(--ink-900)]">{title}</div>
                <p className="mt-0.5 text-sm leading-6 text-[var(--text-soft)]">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ paddingBlock: 'var(--s-3)' }}>
        <div className="card p-6">
          <div className="row-between">
            <div>
              <div className="eyebrow">
                <Network size={12} />
                Network consensus
              </div>
              <h2 className="mt-2 font-serif text-2xl font-semibold text-[var(--ink-900)]">
                Distributed node status
              </h2>
            </div>
            <Badge variant={consensus ? 'success' : consensus === false ? 'error' : 'info'}>
              {consensus === null ? 'Checking consensus' : consensus ? 'Consensus reached' : 'Consensus failed'}
            </Badge>
          </div>

          <div className="mt-5 flex flex-wrap gap-x-8 gap-y-3 border-y border-[var(--line)] py-4">
            <div className="min-w-0">
              <div className="eyebrow">Total blocks</div>
              <div className="mt-1 font-serif text-xl font-semibold text-[var(--ink-900)]">{blocks.length}</div>
            </div>
            <div className="min-w-0">
              <div className="eyebrow">Chain integrity</div>
              <div
                className="mt-1 font-serif text-xl font-semibold"
                style={{ color: chainValid ? 'var(--ok)' : 'var(--bad)' }}
              >
                {chainValid === null ? '…' : chainValid ? 'Valid' : 'Broken'}
              </div>
            </div>
            <div className="min-w-0">
              <div className="eyebrow">Published docs</div>
              <div className="mt-1 font-serif text-xl font-semibold text-[var(--ink-900)]">
                {blocks.filter((block) => (block.data.action as string) === 'document_published').length}
              </div>
            </div>
            <div className="min-w-0">
              <div className="eyebrow">Latest hash</div>
              <div className="mono mt-1 truncate text-sm text-[var(--ink-900)]">
                {blocks.length > 0 ? `${blocks[blocks.length - 1].hash.slice(0, 16)}…` : '---'}
              </div>
            </div>
          </div>

          {nodesLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 size={24} className="animate-spin text-[var(--text-mute)]" />
            </div>
          ) : (
            <div className="mt-6 grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
              {nodes.map((node) => {
                const synced = node.status === 'synced';
                const unreachable = node.status === 'unreachable';

                return (
                  <div
                    key={node.id}
                    className={`card card-flat flex flex-col items-center p-3 text-center ${
                      synced
                        ? 'border-[var(--ok-line)] bg-[var(--ok-soft)]'
                        : unreachable
                          ? 'border-[var(--line)] bg-[var(--ink-025)]'
                          : 'border-[var(--bad-line)] bg-[var(--bad-soft)]'
                    }`}
                  >
                    <span
                      className={`mb-2 grid h-8 w-8 place-items-center rounded-[var(--r-md)] ${
                        synced
                          ? 'bg-white text-[var(--ok)]'
                          : unreachable
                            ? 'bg-white text-[var(--text-mute)]'
                            : 'bg-white text-[var(--bad)]'
                      }`}
                    >
                      {unreachable ? <WifiOff size={15} /> : <Wifi size={15} />}
                    </span>
                    <div className="strong text-sm">{node.name}</div>
                    <div className="text-xs text-[var(--text-soft)]">{node.block_count} blocks</div>
                    <Badge
                      className="mt-2"
                      variant={synced ? 'success' : unreachable ? 'default' : 'error'}
                    >
                      {node.status === 'out_of_sync' ? 'Out of sync' : node.status}
                    </Badge>
                    {node.latest_hash ? (
                      <div className="mt-3 break-all text-xs text-[var(--text-mute)]">
                        Latest hash: <span className="mono">{node.latest_hash.slice(0, 16)}…</span>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Recent blocks</h2>
          <p>Expand any block to see its hashes and links.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={32} className="animate-spin text-[var(--text-mute)]" />
          </div>
        ) : reversedBlocks.length === 0 ? (
          <div className="card p-10 text-center">
            <div className="font-serif text-2xl font-semibold text-[var(--ink-900)]">No blocks found</div>
            <p className="mt-2 text-sm text-[var(--text-soft)]">
              Blocks will appear here once ledger data is available.
            </p>
          </div>
        ) : (
          <div className="chain" style={{ paddingLeft: 'clamp(24px, 6vw, 44px)' }}>
            {reversedBlocks.map((block, index) => {
              const isExpanded = expandedId === block.id;
              const isLatest = index === 0;
              const config = getActionConfig(block.data);
              const ActionIcon = config.icon;

              return (
                <div key={block.id} className="chain-node" data-kind={isLatest ? 'ok' : undefined}>
                  <button
                    type="button"
                    className="btn-row overflow-hidden"
                    aria-expanded={isExpanded}
                    onClick={() => setExpandedId((current) => (current === block.id ? null : block.id))}
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <span className="grid h-11 w-11 flex-none place-items-center rounded-[var(--r-md)] bg-[var(--ink-025)]">
                        <ActionIcon size={18} className={config.accentClass} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap gap-1">
                          <span className="mono text-xs text-[var(--text-mute)]">#{block.id}</span>
                          <Badge variant={config.variant}>{config.label}</Badge>
                          {isLatest ? <Badge variant="success">Latest</Badge> : null}
                        </div>
                        <div className="truncate text-sm font-medium text-[var(--ink-900)]">
                          {(block.data.title as string) ||
                            (block.data.uploaded_by_name as string) ||
                            (block.data.approved_by_name as string) ||
                            `Block #${block.id}`}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-[var(--text-mute)]">
                          <span className="shrink-0">{formatDate(block.timestamp)}</span>
                          <span className="mono shrink-0">{block.hash.slice(0, 12)}…</span>
                        </div>
                      </div>
                    </div>
                    <ChevronDown
                      size={16}
                      className={`ml-2 flex-none text-[var(--text-mute)] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {isExpanded ? (
                    <div className="card card-flat mt-3 p-4" style={{ background: 'var(--ink-025)' }}>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <div className="eyebrow mb-2">Previous hash</div>
                          <div className="hash-block">
                            {block.previous_hash === '0'
                              ? '0000000000000000000000000000000000000000000000000000000000000000'
                              : block.previous_hash}
                          </div>
                        </div>
                        <div>
                          <div className="eyebrow mb-2">This block hash</div>
                          <div className="hash-block hash-ok">{block.hash}</div>
                        </div>
                      </div>

                      <div className="grid gap-3 pt-4 md:grid-cols-3">
                        <div className="card card-flat p-3">
                          <div className="eyebrow">Nonce</div>
                          <div className="mt-1 mono text-sm text-[var(--ink-900)]">{block.nonce}</div>
                        </div>
                        <div className="card card-flat p-3">
                          <div className="eyebrow">Timestamp</div>
                          <div className="mt-1 text-sm text-[var(--ink-900)]">
                            {new Date(block.timestamp).toLocaleString()}
                          </div>
                        </div>
                        <div className="card card-flat p-3">
                          <div className="eyebrow">Link status</div>
                          <div className="mt-1 row text-sm text-[var(--ok)]" style={{ gap: 6 }}>
                            <CheckCircle2 size={14} />
                            Hash-linked
                          </div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="eyebrow mb-2">
                          <Database size={12} />
                          Block data
                        </div>
                        <pre className="overflow-x-auto rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--card)] p-4 text-xs leading-6 text-[var(--ink-900)]">
{JSON.stringify(block.data, null, 2)}
                        </pre>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>

    </main>
  );
}
