# NWC Review Kit

A drop-in review layer for Next.js (App Router) prototypes, by Now We Collide. It adds three things to any site:

1. A **slate** ("clapperboard") landing that makes the draft status unmissable.
2. A **client review nav bar** that collapses into a floating glass pill on scroll, with per-page design options.
3. An **in-page commenting layer** (pins + panel) backed by a shared Supabase database.

Comments are stored in one shared Supabase project for all your websites, namespaced by `projectId`. You do not create a new database per site.

## Install (copy-in)

1. Copy the `nwc-review-kit/` folder into your Next.js app, e.g. to `components/review-kit/`.
2. Add your brand logo to the app's `/public` (e.g. `public/nwc-logo-white.png`).
3. Edit `src/config.ts`:
   - `projectId` — a unique id for this website (namespaces its comments).
   - `supabaseUrl` / `supabaseAnonKey` — from your shared Supabase project (Settings > API; use the publishable/anon key, not the secret).
   - `brand` — name, logo path, accent hex.
   - `slate` — project title, client, version, status, dashboard label.
   - `pages` — each page's tab label, basePath, options (with descriptors), and slate design/copy status.
4. One-time per Supabase project: run `sql/comments.sql` in the Supabase SQL Editor (creates the `comments` table + access rules).

## Wire it in

In your root layout, wrap the app and mount the bar:

```tsx
import FeedbackProvider from "@/components/review-kit/src/FeedbackProvider";
import ReviewBar from "@/components/review-kit/src/ReviewBar";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <FeedbackProvider>
          <ReviewBar />
          {children}
        </FeedbackProvider>
      </body>
    </html>
  );
}
```

Render the slate from your `/` route:

```tsx
// app/page.tsx
export { default } from "@/components/review-kit/src/Slate";
```

Your actual page designs live at the routes named in `config.pages` (e.g. `/home/1`, `/policy/1`). The kit only provides the slate, the bar and the commenting overlay.

## Requirements

- Next.js App Router, React 18+.
- Tailwind in the host app (the bar/slate use standard Tailwind utility classes; brand colours are inline so no theme tokens are needed).

## Removing it for launch

Include the kit only in preview/staging builds. To ship a clean production site, omit `<FeedbackProvider>`/`<ReviewBar>` and the slate route (e.g. behind an env flag).

## Reviewing comments with Claude

See `CLAUDE_FEEDBACK_LOOP.md` for the prompt and setup to let Claude read the comments from Supabase (via MCP) and action them.
