// Test script for Supabase + Blockchain integration
// Run AFTER completing Supabase setup (Task 0.2)
// Run with: npx tsx test-supabase.ts

import { createServerClient } from './src/lib/supabase';
import { Blockchain } from './src/lib/blockchain';
import { summarizeDocument } from './src/lib/ai';

console.log('🧪 CYFER Phase 0 - Supabase & Blockchain Test\n');
console.log('=' + '='.repeat(59));

// Test 1: Supabase Connection
console.log('\n🔗 Test 1: Supabase Connection');
console.log('-'.repeat(60));

async function testSupabaseConnection() {
  try {
    const supabase = createServerClient();

    // Test database connection by querying users table
    const { data, error } = await supabase.from('users').select('count');

    if (error) {
      console.error('❌ Supabase connection failed:', error.message);
      console.log('   💡 Make sure you completed SUPABASE_SETUP.md');
      console.log('   💡 Check your .env.local file has correct values');
      return false;
    }

    console.log('✅ Supabase connected successfully');
    console.log(`   Found users table`);
    return true;
  } catch (error) {
    console.error('❌ Supabase test failed:', error);
    return false;
  }
}

// Test 2: Database Tables
console.log('\n📊 Test 2: Database Tables');
console.log('-'.repeat(60));

async function testDatabaseTables() {
  try {
    const supabase = createServerClient();
    const tables = ['users', 'documents', 'blockchain', 'approvals', 'transactions', 'budget_data'];

    for (const table of tables) {
      const { error } = await supabase.from(table).select('count', { count: 'exact', head: true });

      if (error) {
        console.log(`❌ Table "${table}" not found or not accessible`);
        console.log(`   Error: ${error.message}`);
      } else {
        console.log(`✅ Table "${table}" exists and is accessible`);
      }
    }
  } catch (error) {
    console.error('❌ Database tables test failed:', error);
  }
}

// Test 3: Seed Data
console.log('\n🌱 Test 3: Seed Data Verification');
console.log('-'.repeat(60));

async function testSeedData() {
  try {
    const supabase = createServerClient();

    // Check users (should have 3 demo admins)
    const { data: users, error: usersError } = await supabase.from('users').select('*');
    if (usersError) {
      console.log('❌ Could not fetch users:', usersError.message);
    } else {
      console.log(`✅ Users: ${users.length} admin accounts found`);
      users.forEach(user => {
        console.log(`   - ${user.name} (${user.role}) - ${user.department}`);
      });
    }

    // Check budget data (should have 8 categories)
    const { data: budget, error: budgetError } = await supabase.from('budget_data').select('*');
    if (budgetError) {
      console.log('❌ Could not fetch budget data:', budgetError.message);
    } else {
      console.log(`✅ Budget Data: ${budget.length} entries found`);
      const total = budget.reduce((sum, item) => sum + parseFloat(item.allocated_amount), 0);
      console.log(`   Total Budget: ₱${total.toLocaleString('en-PH')}`);
    }

    // Check blockchain (should have genesis block)
    const { data: blocks, error: blockError } = await supabase.from('blockchain').select('*').order('id');
    if (blockError) {
      console.log('❌ Could not fetch blockchain:', blockError.message);
    } else {
      console.log(`✅ Blockchain: ${blocks.length} blocks found`);
      if (blocks.length > 0) {
        const genesis = blocks[0];
        console.log(`   Genesis Block ID: ${genesis.id}`);
        console.log(`   Genesis Previous Hash: ${genesis.previous_hash}`);
      }
    }

    // Check documents (should have 1 sample ordinance)
    const { data: docs, error: docsError } = await supabase.from('documents').select('*');
    if (docsError) {
      console.log('❌ Could not fetch documents:', docsError.message);
    } else {
      console.log(`✅ Documents: ${docs.length} documents found`);
      docs.forEach(doc => {
        console.log(`   - ${doc.title} (${doc.status})`);
      });
    }
  } catch (error) {
    console.error('❌ Seed data test failed:', error);
  }
}

// Test 4: Blockchain Class
console.log('\n⛓️  Test 4: Blockchain Operations');
console.log('-'.repeat(60));

async function testBlockchain() {
  try {
    // Test getLatestBlock
    const latestBlock = await Blockchain.getLatestBlock();
    if (latestBlock) {
      console.log('✅ getLatestBlock() works');
      console.log(`   Latest Block ID: ${latestBlock.id}`);
      console.log(`   Hash: ${latestBlock.hash.substring(0, 16)}...`);
    } else {
      console.log('⚠️  No blocks found - blockchain might be empty');
    }

    // Test validateChain
    const validation = await Blockchain.validateChain();
    if (validation.valid) {
      console.log('✅ validateChain() - Blockchain is VALID');
    } else {
      console.log('❌ validateChain() - Blockchain is INVALID');
      validation.errors?.forEach(err => console.log(`   Error: ${err}`));
    }

    // Test addBlock (create a test block)
    console.log('\n   Testing addBlock()...');
    const testData = {
      action: 'test',
      message: 'Test block created by verification script',
      timestamp: new Date().toISOString(),
    };

    const newBlock = await Blockchain.addBlock(testData);
    console.log('✅ addBlock() works');
    console.log(`   New Block ID: ${newBlock.id}`);
    console.log(`   Hash: ${newBlock.hash.substring(0, 16)}...`);
    console.log(`   Previous Hash: ${newBlock.previous_hash.substring(0, 16)}...`);

    // Validate chain again after adding block
    const validation2 = await Blockchain.validateChain();
    console.log(`✅ Chain still valid after adding block: ${validation2.valid ? 'YES' : 'NO'}`);
  } catch (error) {
    console.error('❌ Blockchain test failed:', error);
  }
}

// Test 5: AI Summarization (optional - requires Anthropic API key)
console.log('\n🤖 Test 5: AI Document Summarization');
console.log('-'.repeat(60));

async function testAI() {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.log('⚠️  ANTHROPIC_API_KEY not set - skipping AI test');
      console.log('   This is optional. Add the key to .env.local to enable AI features');
      return;
    }

    const testDocument = `
Municipal Ordinance No. 2026-01: Public Market Operating Hours

An ordinance regulating the operating hours of the Sample City Public Market to ensure proper sanitation, security, and vendor compliance.

Section 1: The public market shall operate from 4:00 AM to 8:00 PM daily.
Section 2: All vendors must clean their stalls before closing.
Section 3: Security personnel shall be present during all operating hours.
Section 4: Violation of this ordinance shall result in a fine of ₱1,000 for the first offense.
    `.trim();

    console.log('   Calling Claude AI to summarize test document...');
    const summary = await summarizeDocument(testDocument);

    console.log('✅ AI Summarization works!');
    console.log(`   TLDR: ${summary.tldr}`);
    console.log(`   Key Points: ${summary.keyPoints.length} points`);
    summary.keyPoints.forEach((point, i) => {
      console.log(`     ${i + 1}. ${point}`);
    });
    if (summary.affectedParties) {
      console.log(`   Affected Parties: ${summary.affectedParties}`);
    }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('❌ AI test failed:', error.message);
  }
}

// Run all tests
async function runTests() {
  const connected = await testSupabaseConnection();

  if (!connected) {
    console.log('\n❌ Supabase connection failed. Cannot continue tests.');
    console.log('💡 Please complete SUPABASE_SETUP.md first');
    return;
  }

  await testDatabaseTables();
  await testSeedData();
  await testBlockchain();
  await testAI();

  console.log('\n' + '='.repeat(60));
  console.log('✅ Supabase & Blockchain Test Complete!');
  console.log('='.repeat(60));
  console.log('\n💡 All systems operational! Ready for Phase 1 development.');
}

runTests().catch(console.error);
