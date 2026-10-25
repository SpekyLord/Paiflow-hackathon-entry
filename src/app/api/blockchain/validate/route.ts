// Blockchain Validation API
// GET /api/blockchain/validate — Validate entire chain integrity
// GET /api/blockchain/validate?consensus=true — Also check cross-node consensus

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getNodeClients } from '@/lib/nodes';
import { Blockchain } from '@/lib/blockchain';
import type { ApiResponse, ChainValidationResult } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const checkConsensus = searchParams.get('consensus') === 'true';

    const supabase = createServerClient();

    // Fetch all blocks from primary for display
    const { data: blocks, error } = await supabase
      .from('blockchain')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      return NextResponse.json(
        { success: false, error: `Failed to fetch blockchain: ${error.message}` } as ApiResponse,
        { status: 500 }
      );
    }

    // Run full chain validation on primary
    const validation: ChainValidationResult = await Blockchain.validateChain();

    // Build base response
    const responseData: Record<string, unknown> = {
      valid: validation.valid,
      errors: validation.errors,
      totalBlocks: blocks?.length ?? 0,
      blocks: blocks ?? [],
    };

    // Cross-node consensus check
    if (checkConsensus) {
      const primaryCount = blocks?.length ?? 0;
      const primaryLatestHash = blocks?.[blocks.length - 1]?.hash ?? null;

      const nodeResults: Array<{
        name: string;
        block_count: number;
        latest_hash: string | null;
        status: 'synced' | 'out_of_sync' | 'unreachable';
      }> = [
        {
          name: 'Node 1 (Primary)',
          block_count: primaryCount,
          latest_hash: primaryLatestHash,
          status: 'synced',
        },
      ];

      const secondaryNodes = getNodeClients();

      await Promise.allSettled(
        secondaryNodes.map(async ({ name, client }) => {
          try {
            const { data: nodeBlocks, error: nodeError } = await client
              .from('blockchain')
              .select('id, hash')
              .order('id', { ascending: false });

            if (nodeError) throw nodeError;

            const nodeCount = nodeBlocks?.length ?? 0;
            const nodeLatestHash = nodeBlocks?.[0]?.hash ?? null;
            const synced = nodeCount === primaryCount && nodeLatestHash === primaryLatestHash;

            nodeResults.push({
              name,
              block_count: nodeCount,
              latest_hash: nodeLatestHash,
              status: synced ? 'synced' : 'out_of_sync',
            });
          } catch {
            nodeResults.push({
              name,
              block_count: 0,
              latest_hash: null,
              status: 'unreachable',
            });
          }
        })
      );

      const consensus = nodeResults.every((n) => n.status === 'synced');
      responseData.consensus = consensus;
      responseData.nodeResults = nodeResults;
    }

    return NextResponse.json({
      success: true,
      data: responseData,
    } as ApiResponse);
  } catch (error) {
    console.error('GET /api/blockchain/validate error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' } as ApiResponse,
      { status: 500 }
    );
  }
}
