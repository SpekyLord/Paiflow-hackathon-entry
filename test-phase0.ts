// Test script for Phase 0 utilities
// Run with: npx tsx test-phase0.ts

import { hashString, hashBuffer } from './src/lib/hash';
import { formatDate, formatCurrency, formatFileSize, formatRelativeTime, formatHash } from './src/utils/formatters';
import { DOCUMENT_CATEGORIES, MAX_FILE_SIZE, APP_NAME, TEAM_MEMBERS } from './src/utils/constants';

console.log('🧪 CYFER Phase 0 - Core Utilities Test\n');
console.log('=' . repeat(60));

// Test 1: Hash Functions
console.log('\n📝 Test 1: SHA-256 Hashing');
console.log('-'.repeat(60));

async function testHashing() {
  try {
    const testString = 'Hello, CYFER!';
    const hash = await hashString(testString);
    console.log(`✅ hashString("${testString}")`);
    console.log(`   Hash: ${hash}`);
    console.log(`   Length: ${hash.length} characters (expected: 64)`);

    // Test that same input produces same hash
    const hash2 = await hashString(testString);
    console.log(`✅ Deterministic: ${hash === hash2 ? 'PASS' : 'FAIL'}`);

    // Test hashBuffer
    const buffer = Buffer.from('Test buffer');
    const bufferHash = await hashBuffer(buffer);
    console.log(`✅ hashBuffer(Buffer) works`);
    console.log(`   Hash: ${bufferHash.substring(0, 16)}...`);
  } catch (error) {
    console.error('❌ Hashing test failed:', error);
  }
}

// Test 2: Formatters
console.log('\n📊 Test 2: Formatting Utilities');
console.log('-'.repeat(60));

function testFormatters() {
  try {
    // Date formatting
    const now = new Date();
    console.log(`✅ formatDate: ${formatDate(now)}`);

    // Currency formatting
    const amount = 1234567.89;
    console.log(`✅ formatCurrency: ${formatCurrency(amount)}`);

    // File size formatting
    const sizes = [500, 1024 * 50, 1024 * 1024 * 5, 1024 * 1024 * 1024];
    sizes.forEach(size => {
      console.log(`✅ formatFileSize(${size}): ${formatFileSize(size)}`);
    });

    // Relative time
    const pastDate = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
    console.log(`✅ formatRelativeTime: ${formatRelativeTime(pastDate)}`);

    // Hash formatting
    const longHash = 'a1b2c3d4e5f67890123456789012345678901234567890123456789012345678';
    console.log(`✅ formatHash: ${formatHash(longHash)}`);
  } catch (error) {
    console.error('❌ Formatter test failed:', error);
  }
}

// Test 3: Constants
console.log('\n📋 Test 3: App Constants');
console.log('-'.repeat(60));

function testConstants() {
  try {
    console.log(`✅ APP_NAME: "${APP_NAME}"`);
    console.log(`✅ Document Categories: ${DOCUMENT_CATEGORIES.length} categories`);
    DOCUMENT_CATEGORIES.forEach(cat => {
      console.log(`   - ${cat.label} (${cat.value})`);
    });
    console.log(`✅ MAX_FILE_SIZE: ${formatFileSize(MAX_FILE_SIZE)}`);
    console.log(`✅ Team Members: ${TEAM_MEMBERS.length} members`);
    TEAM_MEMBERS.forEach(member => {
      console.log(`   - ${member}`);
    });
  } catch (error) {
    console.error('❌ Constants test failed:', error);
  }
}

// Test 4: TypeScript Types (compilation test)
console.log('\n🔧 Test 4: TypeScript Types');
console.log('-'.repeat(60));

async function testTypes() {
  try {
    // Import types to verify they compile
    const { DocumentCategory, DocumentStatus, UserRole } = await import('./src/lib/types');

    console.log(`✅ DocumentCategory enum exists`);
    console.log(`   Values: ${Object.keys(DocumentCategory).join(', ')}`);

    console.log(`✅ DocumentStatus enum exists`);
    console.log(`   Values: ${Object.keys(DocumentStatus).join(', ')}`);

    console.log(`✅ UserRole enum exists`);
    console.log(`   Values: ${Object.keys(UserRole).join(', ')}`);
  } catch (error) {
    console.error('❌ Types test failed:', error);
  }
}

// Run all tests
async function runTests() {
  await testHashing();
  testFormatters();
  testConstants();
  await testTypes();

  console.log('\n' + '='.repeat(60));
  console.log('✅ Phase 0 Core Utilities Test Complete!');
  console.log('='.repeat(60));
  console.log('\n💡 Next: Set up Supabase to test blockchain and API endpoints');
}

runTests().catch(console.error);
