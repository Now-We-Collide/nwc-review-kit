# NWC Review Kit

A drop-in review layer for Next.js (App Router) prototypes, by Now We Collide. It adds three things to any site:

1. A **slate** ("clapperboard") landing that makes the draft status unmissable.
2. A **client review nav bar** that collapses into a floating glass pill on scroll, with per-page design options.
3. An **in-page commenting layer** (pins + panel) backed by a shared Supabase database.

Comments live in one shared Supabase project for all your sites, namespaced by `projectId`. You do not create a new database per site.

Config is **injected by the consumer** via `<ReviewKitProvider config={...}>`, so the kit isn't tied to any one project.

## Install on a Next.js site

```bash
npm install github:Now-We-Collide/nwc-review-kit
```

1. The kit ships raw TS/TSX, so add it to `transpilePackages` in `next.config.ts`:

   ```ts
   const nextConfig = { transpilePackages: ["@nwc/review-kit"] };
   ```

2. Let Tailwind scan the kit for class names. In your global stylesheet, after `@import "tailwindcss";`:

   ```css
   @source "../node_modules/@nwc/review-kit/src";
   ```

   (Tailwind v4. Adjust the relative path to your CSS file's location.)

3. Add your brand logo to `/public` (e.g. `public/nwc-logo-white.png`).

4. Create a config file in your app, e.g. `lib/review.config.ts`:

   ```ts
   import type { ReviewConfig } from "@nwc/review-kit";
   export const reviewConfig: ReviewConfig = {
     projectId: "my-site",            // unique per site; namespaces its comments
     supabaseUrl: "https://xxxx.supabase.co",
     supabaseAnonKey: "sb_publishable_...",
     brand: { name: "Now We Collide", logo: "/nwc-logo-white.png", accent: "#4ae0f9" },
     slate: { dashboardLabel: "Website Review Dashboard", title: "...", client: "...", version: "v0.1", status: "For review" },
     pages: [ /* tabs + options + per-page design/copy status */ ],
   };
   ```

5. Wrap your app and mount the bar in the root layout:

   ```tsx
   import { ReviewKitProvider, ReviewBar } from "@nwc/review-kit";
   import { reviewConfig } from "@/lib/review.config";

   export default function RootLayout({ children }) {
     return (
       <html lang="en"><body>
         <ReviewKitProvider config={reviewConfig}>
           <ReviewBar />
           {children}
         </ReviewKitProvider>
       </body></html>
     );
   }
   ```

6. Render the slate from `/`:

   ```ts
   // app/page.tsx
   export { Slate as default } from "@nwc/review-kit";
   ```

7. One-time per Supabase project: run `sql/comments.sql` in the Supabase SQL Editor.

Your real page designs live at the routes named in `pages` (e.g. `/home/1`). The kit only provides the slate, the bar and the commenting overlay.

## Requirements

- Next.js App Router, React 18+, Tailwind in the host app.

## Removing it for launch

Include the kit only in preview/staging builds. To ship a clean production site, omit `<ReviewKitProvider>`/`<ReviewBar>` and the slate route (e.g. behind an env flag).

## Reviewing comments with Claude

See `CLAUDE_FEEDBACK_LOOP.md` for the prompt to let Claude read and resolve the comments.
