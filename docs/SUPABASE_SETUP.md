# Supabase Setup Guide for CYFER

> ✅ **Status: COMPLETE (March 17, 2026)** — Supabase project is live and all tests passing.

This guide will walk you through setting up Supabase for the CYFER project.

## Prerequisites

- A Supabase account (free tier is sufficient for development)
- Access to your Supabase dashboard

---

## Step 1: Create a New Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **"New Project"**
3. Fill in the project details:
   - **Project Name:** `cyfer` (or your preferred name)
   - **Database Password:** Choose a strong password and **save it securely**
   - **Region:** Select the region closest to you or your target users
   - **Plan:** Free (sufficient for development and demo)
4. Click **"Create new project"**
5. Wait for the project to finish setting up (2-3 minutes)

---

## Step 2: Run Database Migration

1. In your Supabase dashboard, navigate to **SQL Editor** (left sidebar)
2. Click **"New Query"**
3. Copy the entire contents of `supabase/migrations/001_initial_schema.sql` from this repo
4. Paste it into the SQL editor
5. Click **"Run"** (or press Ctrl/Cmd + Enter)
6. Verify all 6 tables were created successfully:
   - `users`
   - `documents`
   - `blockchain`
   - `approvals`
   - `transactions`
   - `budget_data`

**Troubleshooting:**
- If you get an error, check that the UUID extension is enabled
- Clear the editor and try running the migration again
- Check for syntax errors (ensure you copied the entire file)

---

## Step 3: Apply Row-Level Security (RLS) Policies

1. Still in the **SQL Editor**, create a new query
2. Copy the entire contents of `supabase/policies/001_rls_policies.sql`
3. Paste it into the SQL editor
4. Click **"Run"**
5. Verify that RLS is enabled on all tables:
   - Go to **Table Editor** → Select any table → Click the **shield icon** → Should show "RLS is enabled"

**Important:** RLS policies are critical for security. They ensure:
- Citizens can view published documents without authentication
- Only admins can upload/manage documents
- Blockchain and audit trail are publicly readable (transparency)
- Budget data is publicly accessible

---

## Step 4: Configure Authentication

1. Navigate to **Authentication** → **Providers** in the left sidebar
2. Enable **Email** provider:
   - Toggle it ON
   - **Confirm email:** OFF (for demo purposes, we'll skip email verification)
   - Click **Save**

**Note:** You do NOT need to manually create users. The seed data (next step) creates 3 demo admin accounts automatically in both `auth.users` and `public.users` with matching UUIDs.

---

## Step 5: Run Seed Data

1. In the **SQL Editor**, create a new query
2. Copy the entire contents of `supabase/seeds/001_demo_data.sql`
3. Paste it into the SQL editor
4. Click **"Run"**
5. Verify seed data was inserted:
   - Navigate to **Table Editor**
   - Check `users` table → should have 3 admin accounts
   - Check `budget_data` table → should have 8 budget entries
   - Check `blockchain` table → should have genesis block (id = 0)
   - Check `documents` table → should have 1 sample ordinance
6. Verify auth users were created:
   - Navigate to **Authentication** → **Users**
   - Should see 3 users:
     - `mayor@samplecity.gov.ph`
     - `treasurer@samplecity.gov.ph`
     - `clerk@samplecity.gov.ph`

**Seed Data Includes:**
- 3 demo admin accounts with **matching auth + public records** (login-ready!)
- Genesis block for the blockchain
- Sample budget data for "Municipality of Sample City" (FY 2026)
- 1 published ordinance with full approval chain
- Sample transactions in the audit trail

**Demo Login Credentials:**

| Role | Email | Password |
|------|-------|----------|
| Super Admin (Mayor) | `mayor@samplecity.gov.ph` | `DemoPassword123!` |
| Admin (Treasurer) | `treasurer@samplecity.gov.ph` | `DemoPassword123!` |
| Admin (Secretary) | `clerk@samplecity.gov.ph` | `DemoPassword123!` |

---

## Step 6: Set Up Supabase Storage

1. Navigate to **Storage** in the left sidebar
2. Click **"Create a new bucket"**
3. Bucket details:
   - **Name:** `documents`
   - **Public:** ✅ Check "Public bucket" (published documents need to be publicly accessible)
   - **File size limit:** 50 MB
   - **Allowed MIME types:** Leave empty (we'll validate on the backend)
4. Click **"Create bucket"**

5. Set up storage policies:
   - Click on the `documents` bucket
   - Go to **"Policies"** tab
   - Click **"New Policy"**
   - **Policy for SELECT (read):**
     ```
     Policy name: Public can read published documents
     Target roles: public
     Policy definition: true
     ```
   - Click **"New Policy"** again
   - **Policy for INSERT (upload):**
     ```
     Policy name: Authenticated users can upload
     Target roles: authenticated
     Policy definition: true
     ```

---

## Step 7: Get API Keys

1. Navigate to **Settings** → **API** in the left sidebar
2. Copy the following values:
   - **Project URL** (e.g., `https://xxxxxxxxxxxxx.supabase.co`)
   - **anon / public key** (starts with `eyJhbGciOi...`)
   - **service_role key** (starts with `eyJhbGciOi...`) ⚠️ **KEEP THIS SECRET!**

3. Create a `.env.local` file in the root of your CYFER project:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   ```

4. **Never commit `.env.local` to Git!** (it's already in `.gitignore`)

---

## Step 8: Get Anthropic API Key (Optional - for AI Summarizer)

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign up or log in
3. Navigate to **API Keys**
4. Click **"Create Key"**
5. Copy the API key and add it to `.env.local`:
   ```env
   ANTHROPIC_API_KEY=sk-ant-...
   ```

**Note:** The AI summarizer feature will gracefully fail if this key is not set.

---

## Step 9: Verify the Setup

1. Start your Next.js development server:
   ```bash
   npm run dev
   ```

2. Open your browser to `http://localhost:3000`

3. Test the following:
   - [ ] Landing page loads
   - [ ] Navigate to `/documents` → should show the sample ordinance
   - [ ] Navigate to `/budget` → should show budget dashboard with 8 categories
   - [ ] Navigate to `/audit` → should show sample transactions
   - [ ] Navigate to `/login` → login with `mayor@samplecity.gov.ph` / `DemoPassword123!`
   - [ ] After login → admin dashboard loads with stats

4. Check for any console errors related to Supabase connection

---

## Step 10: Initialize the Blockchain (One-Time)

The genesis block should already be created from the seed data. To verify:

1. In Supabase **SQL Editor**, run:
   ```sql
   SELECT * FROM blockchain ORDER BY id ASC LIMIT 1;
   ```
2. You should see the genesis block with `id = 0` and `previous_hash = '0'`

If the genesis block is missing, you can create it via the application later when you implement the blockchain initialization logic.

---

## Quick Reference: Setup Order

Run these SQL files **in order** in the Supabase SQL Editor:

1. `supabase/migrations/001_initial_schema.sql` — Creates tables
2. `supabase/policies/001_rls_policies.sql` — Sets up security
3. `supabase/seeds/001_demo_data.sql` — Creates auth users + demo data

Then manually:
4. Create Storage bucket named `documents` (public, 50MB limit)
5. Add storage policies (public read, authenticated upload)
6. Copy API keys to `.env.local`
7. *(For decentralization)* Set up Node 2 and Node 3 — see **Step 11** below

---

---

## Step 11: Set Up Decentralized Blockchain Nodes (Node 2 & Node 3)

CYFER uses **3 independent Supabase projects** as blockchain nodes. Node 1 is your existing primary project. You need to create 2 more free Supabase projects as replica nodes.

### 11.1 — Create Node 2

1. Go to [supabase.com](https://supabase.com) → Click **"New Project"**
2. Fill in:
   - **Project Name:** `cyfer-node-2`
   - **Database Password:** any strong password (you won't need it again)
   - **Region:** same as Node 1 (Singapore recommended)
   - **Plan:** Free
3. Click **"Create new project"** and wait for it to finish (~2 min)

4. Go to **SQL Editor** → **New Query** → paste and run:
```sql
create table if not exists blockchain (
  id integer primary key,
  timestamp timestamptz not null default now(),
  data jsonb not null,
  previous_hash text not null,
  hash text not null,
  nonce integer not null default 0
);

alter table blockchain disable row level security;
```
5. Click **Run** — you should see "Success. No rows returned."

6. Go to **Settings** → **API** → copy:
   - **Project URL** (e.g. `https://abcdefgh.supabase.co`)
   - **anon / public key** (the long `eyJ...` string)

### 11.2 — Create Node 3

Repeat the exact same steps as 11.1 but name it `cyfer-node-3`. Copy its URL and anon key too.

### 11.3 — Add Node Credentials to `.env.local`

Open your `.env.local` file and add these 4 lines (replace with your actual values):

```env
NODE2_SUPABASE_URL=https://your-node-2-project.supabase.co
NODE2_SUPABASE_ANON_KEY=eyJ...your-node-2-anon-key...
NODE3_SUPABASE_URL=https://your-node-3-project.supabase.co
NODE3_SUPABASE_ANON_KEY=eyJ...your-node-3-anon-key...
```

### 11.4 — Add to Vercel (for production deployment)

1. Go to your Vercel project → **Settings** → **Environment Variables**
2. Add all 4 variables above with the same values
3. Redeploy the project after adding them

### 11.5 — Verify Node Setup

After adding the env vars and restarting the dev server (`npm run dev`):

1. Open your browser and go to `http://localhost:3000/api/blockchain/nodes`
2. You should see all 3 nodes listed with their status:
   - Node 1 (Primary) — should show your current block count
   - Node 2 — should show `synced` (0 blocks initially, will sync on next block write)
   - Node 3 — should show `synced` (same)
3. Upload a document through the admin panel → go back to `/api/blockchain/nodes` → all 3 nodes should now have the same block count

**To demo tamper detection across nodes:**
1. Go to Node 2's Supabase dashboard → **Table Editor** → `blockchain`
2. Delete any block from the table
3. Go to `http://localhost:3000/api/blockchain/validate?consensus=true`
4. Node 2 will show `out_of_sync` — proving the distributed integrity check works

---

## Troubleshooting

### "relation does not exist" error
- Ensure you ran the migration SQL (`001_initial_schema.sql`) **first**
- Check the SQL editor for any error messages
- Verify you're connected to the correct Supabase project

### "RLS policy violated" error
- Ensure you ran the RLS policies SQL (`001_rls_policies.sql`)
- Check that RLS is enabled on the table
- Verify you're using the correct API key (service_role for admin operations)

### Seed data fails with "duplicate key" error
- The seed data may have already been inserted
- Clear the tables first: run `TRUNCATE users, documents, blockchain, approvals, transactions, budget_data CASCADE;`
- Then re-run the seed SQL

### Auth users not appearing in Authentication tab
- The seed SQL inserts directly into `auth.users` and `auth.identities`
- If it fails, check that email provider is enabled first (Step 4)
- Try running the seed SQL again after enabling email auth

### Login fails with "Invalid email or password"
- Verify the auth users were created: check **Authentication** → **Users** in dashboard
- Verify the `users` table has matching records with the same UUIDs
- Make sure you're using the exact credentials: `DemoPassword123!`

### Storage upload fails
- Verify the `documents` bucket was created
- Check that storage policies allow uploads from authenticated users
- Ensure the bucket is set to "public"

### Authentication fails
- Verify email provider is enabled in Supabase Auth settings
- Ensure `.env.local` has the correct Supabase URL and keys
- Check that both `auth.users` and `public.users` have matching UUIDs

---

## Security Reminders

⚠️ **Important:**
- **NEVER** commit `.env.local` to version control
- **NEVER** expose the `SUPABASE_SERVICE_ROLE_KEY` to the client
- **NEVER** expose the `ANTHROPIC_API_KEY` to the client
- Always use RLS policies to protect sensitive data
- Use the service role key ONLY in server-side API routes

---

## Support

If you encounter issues:
1. Check the [Supabase Documentation](https://supabase.com/docs)
2. Review the SQL migration files for syntax errors
3. Check Supabase dashboard logs (**Logs** tab in sidebar)
4. Ensure your Supabase project is running (not paused)
