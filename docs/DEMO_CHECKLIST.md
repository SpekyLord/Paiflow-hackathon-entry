# CYFER Demo Preparation Checklist

## Pre-Recording Setup

### Environment
- [ ] Run `npm run dev` — confirm server starts at http://localhost:3000 with no errors
- [ ] Clear browser cache and cookies for localhost
- [ ] Set browser zoom to 100%
- [ ] Set screen resolution to 1920x1080 (or 1440x900 for crisp recording)
- [ ] Close all unnecessary browser tabs and desktop notifications
- [ ] Turn off system notification sounds
- [ ] Dark mode OFF (the app uses light theme)

### Browser Windows
- [ ] **Window 1 — Public View:** Open http://localhost:3000 (landing page)
- [ ] **Window 2 — Admin View:** Open http://localhost:3000/login (admin login)
- [ ] Optional: **Window 3 — Second Admin:** For live UCP approval demo (log in as treasurer)

### Demo Data Verification
- [ ] Visit /documents — confirm documents are loaded with category badges
- [ ] Visit /budget — confirm budget chart and table render with data
- [ ] Visit /audit — confirm audit trail shows entries with timeline
- [ ] Visit /verify — confirm upload area renders correctly
- [ ] Log in as mayor@samplecity.gov.ph — confirm admin dashboard loads
- [ ] Check /admin/approvals — confirm at least 1 pending document exists for UCP demo

### Files Ready for Demo
- [ ] **Original document file** — a real PDF/DOCX that exists in Supabase Storage (download one from the public portal to use for verification)
- [ ] **Tampered document file** — the same file with a tiny modification (add a space, change a word) to demonstrate failed verification
- [ ] **New upload file** — a fresh document for the upload demo (any PDF/DOCX will work)

### Recording Tools
- [ ] Screen recorder installed and tested (OBS Studio, Loom, or similar)
- [ ] Microphone tested (if doing voiceover)
- [ ] Recording output format: MP4, 1080p, 30fps minimum
- [ ] Timer visible during recording (to stay within 3–5 min limit)

---

## Demo Flow Rehearsal

### Run-Through Checklist (Practice 2-3 times)

1. **Landing Page (5s)** — show hero, scroll briefly to features
2. **Documents Portal (15s)** — browse grid, click into a document
3. **Document Detail (10s)** — show hash, approval chain, click AI Summary
4. **AI Summary (10s)** — wait for loading, show the result
5. **Admin Login (5s)** — type credentials, log in
6. **Upload Document (15s)** — fill form, upload file, show hash generated
7. **Approvals (15s)** — show pending list, approve from second admin
8. **Verification - Original (10s)** — upload file, show green verified
9. **Verification - Tampered (10s)** — upload modified file, show red warning
10. **Audit Trail (5s)** — show timeline entries
11. **Budget Dashboard (5s)** — show chart and table
12. **Closing (5s)** — back to landing page or title card

**Target: Complete in under 4 minutes**

---

## Post-Recording Checklist

- [ ] Review recording — check for any visual glitches or loading errors
- [ ] Verify total length is between 3:00 and 5:00
- [ ] Add text overlays for:
  - [ ] Feature names (e.g., "SHA-256 Blockchain Verification")
  - [ ] Tech stack list
  - [ ] SDG 16 badge/mention
  - [ ] Team name and members
- [ ] Add background music (royalty-free)
- [ ] Export final video in required format
- [ ] Upload to submission platform before March 22, 11:59 PM

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Page shows "No documents found" | Check Supabase connection — verify .env.local has correct keys |
| Admin login fails | Try credentials: mayor@samplecity.gov.ph / DemoPassword123! |
| AI Summary fails | Check ANTHROPIC_API_KEY in .env.local is valid |
| Budget shows empty | Run the budget seed SQL or add entries via /admin/budget |
| Build errors | Run `npm run build` to check, then `npm run dev` again |
| Port 3000 in use | Kill the process: `npx kill-port 3000` then restart |

---

## Hackathon Compliance Checklist

- [ ] Video is 3–5 minutes (strictly enforced)
- [ ] Working prototype demonstrated (not slides-only)
- [ ] Problem statement explained (governance transparency)
- [ ] Solution explained (CYFER platform)
- [ ] Real-world application shown (LGU use case)
- [ ] SDG 16 mentioned
- [ ] All technologies listed:
  - [ ] TypeScript, SQL
  - [ ] Next.js (App Router)
  - [ ] Tailwind CSS
  - [ ] Supabase (PostgreSQL, Storage, Auth)
  - [ ] Custom SHA-256 blockchain (Web Crypto API)
  - [ ] **Anthropic Claude AI** (must disclose)
  - [ ] lucide-react, Recharts
  - [ ] Vercel (deployment)
- [ ] GitHub repository is PUBLIC
- [ ] README file included
