// Blockchain Integrity API
// GET /api/blockchain — Get blockchain info
// GET /api/blockchain/validate is handled by the validate sub-route

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { Blockchain } from '@/lib/blockchain';
import type { ApiResponse } from '@/lib/types';

export async function GET() {
  try {
    const supabase = createServerClient();

    // Fetch blockchain stats
    const { count: blockCount } = await supabase
      .from('blockchain')
      .select('*', { count: 'exact', head: true });

    const latestBlock = await Blockchain.getLatestBlock();

    // Run chain validation
    const validation = await Blockchain.validateChain();

    return NextResponse.json({
      success: true,
      data: {
        totalBlocks: blockCount ?? 0,
        latestBlock,
        validation,
      },
    } as ApiResponse);
  } catch (error) {
    console.error('GET /api/blockchain error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' } as ApiResponse,
      { status: 500 }
    );
  }
}
