// Blockchain Nodes API
// GET /api/blockchain/nodes — Returns status of all blockchain nodes

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getNodeClients } from '@/lib/nodes';
import type { ApiResponse } from '@/lib/types';

export interface NodeStatus {
  id: number;
  name: string;
  url_hint: string;
  block_count: number;
  latest_hash: string | null;
  status: 'synced' | 'out_of_sync' | 'unreachable';
}

export async function GET() {
  try {
    // Fetch primary node (Node 1) stats
    const primary = createServerClient();
    const { data: primaryBlocks, error: primaryError } = await primary
      .from('blockchain')
      .select('id, hash')
      .order('id', { ascending: false });

    const primaryCount = primaryBlocks?.length ?? 0;
    const primaryLatestHash = primaryBlocks?.[0]?.hash ?? null;

    const nodeStatuses: NodeStatus[] = [
      {
        id: 1,
        name: 'Node 1 (Primary)',
        url_hint: process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('https://', '').split('.')[0].slice(-8) ?? 'primary',
        block_count: primaryError ? 0 : primaryCount,
        latest_hash: primaryError ? null : primaryLatestHash,
        status: primaryError ? 'unreachable' : 'synced',
      },
    ];

    // Fetch secondary nodes
    const secondaryNodes = getNodeClients();

    await Promise.allSettled(
      secondaryNodes.map(async ({ name, urlHint, client }, idx) => {
        try {
          const { data, error } = await client
            .from('blockchain')
            .select('id, hash')
            .order('id', { ascending: false });

          if (error) throw error;

          const nodeCount = data?.length ?? 0;
          const nodeLatestHash = data?.[0]?.hash ?? null;

          // Compare with primary: same block count AND same latest hash = synced
          const synced =
            nodeCount === primaryCount && nodeLatestHash === primaryLatestHash;

          nodeStatuses.push({
            id: idx + 2,
            name,
            url_hint: urlHint,
            block_count: nodeCount,
            latest_hash: nodeLatestHash,
            status: synced ? 'synced' : 'out_of_sync',
          });
        } catch {
          nodeStatuses.push({
            id: idx + 2,
            name,
            url_hint: urlHint,
            block_count: 0,
            latest_hash: null,
            status: 'unreachable',
          });
        }
      })
    );

    // Sort by id to keep order consistent
    nodeStatuses.sort((a, b) => a.id - b.id);

    const allSynced = nodeStatuses.every((n) => n.status === 'synced');

    return NextResponse.json({
      success: true,
      data: {
        nodes: nodeStatuses,
        consensus: allSynced,
        total_nodes: nodeStatuses.length,
      },
    } as ApiResponse);
  } catch (error) {
    console.error('GET /api/blockchain/nodes error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' } as ApiResponse,
      { status: 500 }
    );
  }
}
