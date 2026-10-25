// Blockchain node client factory — server-side only
// Returns Supabase clients for Node 2 and Node 3 (secondary replica nodes)

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface NodeClient {
  name: string;
  urlHint: string; // last 8 chars of URL for display
  client: SupabaseClient;
}

/**
 * Returns configured secondary node clients.
 * Skips any node whose env vars are not set (graceful degradation).
 */
export function getNodeClients(): NodeClient[] {
  const nodes: NodeClient[] = [];

  const node2Url = process.env.NODE2_SUPABASE_URL;
  const node2Key = process.env.NODE2_SUPABASE_ANON_KEY;
  if (node2Url && node2Key) {
    nodes.push({
      name: 'Node 2',
      urlHint: node2Url.replace('https://', '').split('.')[0].slice(-8),
      client: createClient(node2Url, node2Key),
    });
  }

  const node3Url = process.env.NODE3_SUPABASE_URL;
  const node3Key = process.env.NODE3_SUPABASE_ANON_KEY;
  if (node3Url && node3Key) {
    nodes.push({
      name: 'Node 3',
      urlHint: node3Url.replace('https://', '').split('.')[0].slice(-8),
      client: createClient(node3Url, node3Key),
    });
  }

  return nodes;
}
