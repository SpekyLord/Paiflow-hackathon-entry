# Testing & Verification Guide - Phase 0

This guide explains how to test and verify everything we built in Phase 0.

## 🟢 Tests You Can Run RIGHT NOW (No Supabase Required)

### Test 1: Core Utilities Test

**What it tests:**
- SHA-256 hashing functions
- Date/number/currency formatters
- App constants
- TypeScript type compilation

**How to run:**
```bash
npx tsx test-phase0.ts
```

**Expected output:**
- ✅ All hash functions work correctly
- ✅ All formatters produce correct output
- ✅ All constants are accessible
- ✅ TypeScript enums compile correctly

**Example output:**
```
✅ hashString("Hello, CYFER!")
   Hash: 0a37f5db3db9241857c8384a38eade7114d18aff16a525588983b167a283c69d
   Length: 64 characters (expected: 64)
✅ Deterministic: PASS
✅ formatCurrency: ₱1,234,567.89
✅ formatFileSize(50 MB): 50 MB
```

---

### Test 2: TypeScript Compilation

**What it tests:**
- All TypeScript files compile without errors
- Type definitions are correct
- No type mismatches

**How to run:**
```bash
npm run build
```

**Expected output:**
```
✓ Compiled successfully
✓ Generating static pages (23/23)
Route (app)
├ ○ /
├ ○ /admin
├ ƒ /api/documents
└ ... (all routes)
```

✅ **Status: PASSED** (We already verified this)

---

### Test 3: Development Server

**What it tests:**
- Next.js dev server starts without errors
- All routes are accessible
- No runtime errors on page load

**How to run:**
```bash
npm run dev
```

**Expected output:**
```
▲ Next.js 16.1.6 (Turbopack)
- Local:        http://localhost:3000
✓ Ready in 629ms
```

**Then visit in browser:**
- http://localhost:3000 (Landing page)
- http://localhost:3000/documents (Document portal - will be empty)
- http://localhost:3000/verify (Verification tool - will show UI)
- http://localhost:3000/admin (Admin dashboard - placeholder)

✅ **Status: PASSED** (Dev server starts successfully)

---

### Test 4: File Structure Verification

**What it tests:**
- All required files exist
- Folder structure matches Phase Task spec

**How to run:**
```bash
# Check lib files
ls -1 src/lib/*.ts

# Check utils files
ls -1 src/utils/*.ts

# Check API routes
find src/app/api -name "route.ts" -type f

# Check Supabase setup files
ls -1 supabase/migrations/*.sql supabase/policies/*.sql supabase/seeds/*.sql SUPABASE_SETUP.md
```

**Expected output:**
```
src/lib/ai.ts
src/lib/blockchain.ts
src/lib/hash.ts
src/lib/supabase.ts
src/lib/types.ts
src/utils/constants.ts
src/utils/formatters.ts

8 API routes found
4 Supabase setup files found
```

✅ **Status: PASSED** (All files present)

---

## 🟡 Tests You Can Run AFTER Supabase Setup (Task 0.2)

### Test 5: Supabase Connection & Blockchain

**What it tests:**
- Supabase database connection
- All 6 tables exist and are accessible
- Seed data was inserted correctly
- Blockchain class methods work
- Chain validation works
- AI summarization works (if API key provided)

**Prerequisites:**
1. Complete `SUPABASE_SETUP.md` (all 10 steps)
2. Create `.env.local` with your Supabase keys
3. Optionally add `ANTHROPIC_API_KEY` for AI test

**How to run:**
```bash
npx tsx test-supabase.ts
```

**Expected output:**
```
✅ Supabase connected successfully
✅ Table "users" exists and is accessible
✅ Table "documents" exists and is accessible
✅ Table "blockchain" exists and is accessible
... (all 6 tables)

✅ Users: 3 admin accounts found
   - Mayor Juan Santos (super_admin) - Office of the Mayor
   - Treasurer Maria Cruz (admin) - Treasury Department
   - Municipal Secretary Pedro Reyes (admin) - Municipal Secretary Office

✅ Budget Data: 8 entries found
   Total Budget: ₱60,000,000

✅ Blockchain: 2 blocks found
   Genesis Block ID: 0
   Genesis Previous Hash: 0

✅ getLatestBlock() works
✅ validateChain() - Blockchain is VALID
✅ addBlock() works
✅ Chain still valid after adding block: YES

✅ AI Summarization works! (if API key set)
   TLDR: This ordinance sets public market hours from 4 AM to 8 PM...
```

---

### Test 6: API Endpoints (Manual Testing)

**What it tests:**
- API routes respond correctly
- Database queries work
- Error handling works

**How to test:**

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Test blockchain validation API:**
   ```bash
   curl http://localhost:3000/api/blockchain/validate
   ```

   Expected response:
   ```json
   {
     "success": true,
     "data": { "valid": true }
   }
   ```

3. **Test AI summarization API** (requires Anthropic key):
   ```bash
   curl -X POST http://localhost:3000/api/summarize \
     -H "Content-Type: application/json" \
     -d '{"document_id":"44444444-4444-4444-4444-444444444444"}'
   ```

   Expected response:
   ```json
   {
     "success": true,
     "data": {
       "summary": "...",
       "keyPoints": ["...", "..."],
       "tldr": "..."
     }
   }
   ```

4. **Test documents API:**
   ```bash
   curl http://localhost:3000/api/documents
   ```

   Expected: JSON array of published documents

---

## 📊 Test Summary Checklist

### ✅ Tests Passed (No Supabase Required)
- [x] ✅ Core utilities (hashing, formatters, constants)
- [x] ✅ TypeScript compilation
- [x] ✅ Next.js build
- [x] ✅ Dev server starts
- [x] ✅ File structure complete

### ⏳ Tests Pending (Requires Supabase Setup)
- [ ] Supabase connection
- [ ] Database tables
- [ ] Seed data verification
- [ ] Blockchain operations
- [ ] Chain validation
- [ ] AI summarization (optional)
- [ ] API endpoints

---

## 🐛 Troubleshooting

### Test fails with "Cannot find module"
**Solution:** Run `npm install` to ensure all dependencies are installed

### Test fails with TypeScript errors
**Solution:** Run `npm run build` first to verify compilation

### Supabase test fails with connection error
**Possible causes:**
1. `.env.local` file doesn't exist or has wrong values
2. Supabase project not created
3. Migration SQL not run
4. RLS policies blocking access

**Solution:** Follow `SUPABASE_SETUP.md` step by step

### AI test fails
**Possible causes:**
1. `ANTHROPIC_API_KEY` not set in `.env.local`
2. API key invalid or expired
3. Rate limit exceeded

**Solution:** Get a new API key from console.anthropic.com

### Dev server won't start
**Possible causes:**
1. Port 3000 already in use
2. Node modules corrupted

**Solution:**
```bash
# Kill process on port 3000 (if any)
npx kill-port 3000

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

---

## 🚀 Next Steps After All Tests Pass

Once all tests pass (especially Supabase tests), you're ready for:

**Phase 1: Backend API Implementation**
- Document upload API with file hashing
- Document verification API
- UCP consensus workflow APIs
- Audit trail APIs
- Budget data APIs
- Authentication APIs

**Estimated time:** 1 day (8-10 hours)

---

## 📝 Notes

- The core utilities tests can be run anytime, even without internet
- Supabase tests require a working internet connection
- AI tests consume API credits (minimal cost)
- All tests are non-destructive except `test-supabase.ts` which adds one test block to the blockchain
- Tests are meant for development only - don't run in production

---

**Need help?** Check the main `SUPABASE_SETUP.md` guide or review the Phase Task file for detailed instructions.
