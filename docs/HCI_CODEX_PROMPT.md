# Codex Prompt — HCI Final UI Overhaul for CYFER

You are working inside the `SpekyLord/Cyfer` repository.

Your task is to refactor and elevate the **entire UI/UX** of CYFER so it feels like a polished, presentation-ready **Human-Computer Interaction final project**, not just a hackathon prototype.

Do not rewrite the app from scratch. Keep the existing stack, routes, backend/API behavior, business logic, and core concept intact unless a small structural change is clearly necessary for usability, accessibility, consistency, or maintainability.

## Project context

CYFER is a public transparency platform for government documents. The strongest user-facing value proposition is:

- citizens can verify document authenticity quickly
- published records feel trustworthy and understandable
- admins can upload/review/publish with clarity and minimal confusion

Current stack and structure already in repo:

- Next.js App Router
- TypeScript
- Tailwind CSS v4
- Supabase
- custom UI components in `src/components/ui`
- public routes under `src/app/(public)`
- admin routes under `src/app/(admin)`

Examples already present:

- `src/app/(public)/page.tsx`
- `src/app/(public)/verify/page.tsx`
- `src/app/(public)/documents/page.tsx`
- `src/app/(public)/budget/page.tsx`
- `src/app/(admin)/admin/page.tsx`
- `src/components/ui/Navbar.tsx`
- `src/components/ui/Button.tsx`
- `src/components/ui/Card.tsx`
- `src/app/globals.css`

## Main objective

Make CYFER score as highly as possible for an HCI-style class final by optimizing for:

1. **Usability and Experience**
2. **Interface Design and Aesthetics**
3. **Functionality clarity and reliability**
4. **Innovation presentation**
5. **Pitch/demo readiness**

The UI should communicate trust, clarity, transparency, calm authority, and accessibility.

## Design direction

### Core product positioning
The app should visually and structurally center this message:

**"CYFER helps ordinary citizens verify public documents and understand what is authentic, approved, and publicly accountable."**

### Tone
- professional
- civic / institutional
- modern but not flashy
- trustworthy
- clear for non-technical users

### Visual style
- reduce hackathon-demo feel
- keep a clean government-tech / civic-tech aesthetic
- use strong hierarchy, generous spacing, and a more deliberate design system
- support the current blue/slate direction, but refine it for better contrast and polish
- avoid excessive visual noise, random animation, and overly decorative effects

## HCI priorities to implement

Apply these principles directly in the interface:

- reduce the **gulf of execution**: make next actions obvious
- reduce the **gulf of evaluation**: make results/status easy to understand
- prioritize **recognition over recall**
- use **consistent navigation, spacing, cards, buttons, badges, and feedback states**
- improve **accessibility**: focus states, contrast, keyboard navigation, semantic structure, labels, and status not relying on color alone
- improve **error prevention and recovery**
- make the public verification flow extremely easy for first-time users

## Highest-priority user flows

Prioritize these flows in this exact order:

### 1. Public verification flow (highest priority)
This is the best showcase flow and should become the strongest part of the product.

Relevant files include:
- `src/app/(public)/verify/page.tsx`

Goals:
- make upload state clearer
- improve drag/drop affordance
- make the verify CTA obvious
- make success/failure result cards feel premium and instantly understandable
- clearly explain what verified, tampered, pending, or unmatched means in plain language
- improve hierarchy of hash details so technical data supports the experience instead of dominating it
- add a better "what to do next" after result
- preserve existing API behavior

### 2. Public landing page
Relevant files include:
- `src/app/(public)/page.tsx`
- `src/components/ui/Navbar.tsx`

Goals:
- make the homepage less feature-dense and more user-centered
- emphasize the top task: **Verify a Document**
- keep secondary public tasks visible: browse documents, budget, audit, blockchain
- make hero section more polished and less generic
- improve content hierarchy, spacing, and CTA grouping
- refine the navbar so it feels less crowded, especially on smaller screens

### 3. Public browsing pages
Relevant files include:
- `src/app/(public)/documents/page.tsx`
- `src/app/(public)/budget/page.tsx`
- any detail pages/components those routes use

Goals:
- establish consistent page shell, header structure, card rhythm, filters, empty states, and pagination styling
- improve search/filter usability
- improve chart/table framing if needed
- make pages feel part of one coherent design system

### 4. Admin experience
Relevant files include:
- `src/app/(admin)/admin/page.tsx`
- admin login / upload / approvals / budget / users pages if present

Goals:
- make the admin experience more structured, more readable, and more dashboard-like
- improve information hierarchy in metrics cards
- make action buttons clearer
- unify loading/empty/error states
- preserve existing logic and auth behavior

## Required implementation work

### A. Refine the design system
Audit and improve the shared UI primitives and tokens.

At minimum review and improve:
- `src/app/globals.css`
- `src/components/ui/Button.tsx`
- `src/components/ui/Card.tsx`
- `src/components/ui/Input.tsx` if present
- `src/components/ui/Badge.tsx` if present
- `src/components/ui/Navbar.tsx`
- `src/components/ui/Footer.tsx` if present

Implement:
- cleaner spacing scale
- better focus rings
- more deliberate elevation, border, radius, hover, active, and disabled states
- clearer text contrast
- stronger status colors that still pass accessibility expectations
- reusable page section/header patterns where helpful

### B. Standardize page structure
Create a consistent visual shell across public and admin pages.

Each major page should feel consistent in:
- max width
- page title treatment
- subheading style
- top spacing
- card spacing
- empty/loading/error/success states
- section grouping

### C. Improve accessibility
Ensure:
- visible keyboard focus on all interactive controls
- buttons/links do not rely only on hover
- status messages do not rely only on color
- semantic headings are in a sensible order
- forms have associated labels or accessible names
- drag/drop area remains usable with keyboard and click upload
- contrast is acceptable across major surfaces

### D. Reduce unnecessary motion / polish motion intentionally
- remove or tone down any animation that feels gimmicky or distracting
- keep only motion that improves comprehension or feedback
- preserve a calm, professional feel

### E. Preserve behavior
Do not break:
- routing
- public verification flow
- document fetching and filtering
- budget data fetching
- admin dashboard data loading
- existing component imports unless safely refactored

## Suggested improvements and heuristics

### Navigation
- consider reducing the visual weight of lower-priority nav items
- the navbar currently feels crowded for the public side; improve grouping and responsive behavior
- keep “Verify” highly visible

### Verification page
- likely make the upload panel more instructional and reassuring
- likely show clearer states: idle, file selected, verifying, verified, not found/tampered, network failure
- likely improve result card copy so non-technical users understand the outcome immediately
- likely push raw hash info lower in the hierarchy

### Documents page
- improve search/filter layout and perceived affordance
- improve skeleton states and pagination styling
- ensure document cards feel premium and consistent

### Budget page
- improve summary card hierarchy and chart/table framing
- make public budget data feel transparent and legible, not just technical

### Admin dashboard
- improve scannability of metrics, recent activity, and quick actions
- make it easier to understand what needs attention first

## Constraints

- keep the current stack
- do not add large new dependencies unless absolutely necessary
- do not add a component library like shadcn, MUI, Chakra, etc.
- stay within the existing design language and custom component approach
- prefer small reusable abstractions over duplication
- keep code readable and maintainable
- avoid overengineering

## Deliverables

1. Updated shared design system and styles
2. Refined public UI, especially landing and verification pages
3. Refined admin UI for clarity and presentation quality
4. Better empty/loading/error/success states across major screens
5. Improved accessibility and interaction feedback
6. A short markdown summary file at the end named `UI_HCI_CHANGES.md` describing:
   - what changed
   - why it improved HCI quality
   - which screens were prioritized
   - any remaining limitations

## Acceptance criteria

The work is successful if:

- the app looks like one coherent, polished product
- the **Verify a Document** flow is clearly the strongest experience in the app
- public users can understand what CYFER does within seconds
- admin users can quickly identify pending work and core actions
- the UI feels presentation-ready for an HCI final demo
- the design communicates trust, clarity, accessibility, and professionalism
- the implementation remains stable and maintainable

## Execution style

Please:
- inspect the existing files first
- then make targeted, high-value UI/UX improvements
- explain tradeoffs briefly in comments only when helpful
- avoid rewriting unrelated logic
- prefer a thoughtful, systematic pass over surface-level tweaks

When in doubt, optimize for:
**clarity > complexity, trust > flashiness, usability > feature density, polish > novelty for novelty’s sake**.
