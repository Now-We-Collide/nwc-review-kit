# NWC Review Kit — setup guide for AI assistants

Read THIS file to install the kit. You do not need to read the component source. This file is the contract.

## What the kit is

A drop-in review layer for **Next.js (App Router) + React** prototypes. It adds three things:

1. **Slate** — a dark intro/landing screen (render at `/`).
2. **Review nav bar** — lets the client switch between pages and per-page design options. Collapses into a floating pill on desktop scroll; on mobile it's a bar with a slide-down menu. Fully responsive and self-styled.
3. **Commenting layer** — click anywhere on the page to leave a pin + comment, stored in a shared Supabase database, namespaced per project.

The kit is **self-styled** (injected CSS). It does NOT require Tailwind, and does NOT read the host app's CSS. The logo is **bundled** inside the kit, so there is no image file to supply.

## Install (exact steps)

1. Add the dependency:
   ```bash
   npm install github:Now-We-Collide/nwc-review-kit
   ```

2. In `next.config.ts`, transpile the package (it ships TS/TSX):
   ```ts
   const nextConfig = { transpilePackages: ["@nwc/review-kit"] };
   export default nextConfig;
   ```

3. Create `lib/review.config.ts`. `logo` is OPTIONAL — omit it to use the bundled NWC logo. `projectId` must be unique per site (it namespaces comments).
   ```ts
   import type { ReviewConfig } from "@nwc/review-kit";
   export const reviewConfig: ReviewConfig = {
     projectId: "erstan-website",
     supabaseUrl: "https://fqwvgmkexczmulglowyb.supabase.co",
     supabaseAnonKey: "sb_publishable_ysrEfTmjafve6prmuYIi3A_IfmkOgsU",
     brand: { name: "Now We Collide", accent: "#4ae0f9" }, // no logo => bundled NWC logo
     slate: { dashboardLabel: "Website Review Dashboard", title: "Erstan Website", client: "Erstan", version: "v0.1", status: "For review" },
     pages: [
       { key: "home", label: "Home", basePath: "/home",
         options: [ { slug: "1", label: "Option 1", descriptor: "alt layout" }, { slug: "2", label: "Option 2" } ],
         status: { design: { label: "In review", tone: "good" }, copy: { label: "Placeholder", tone: "todo" } } },
       { key: "about", label: "About", basePath: "/about", href: "/about", options: [ { slug: "", label: "About" } ] },
     ],
   };
   ```
   The shared Supabase URL + publishable key above are safe to reuse across sites (the key is public by design and protected by row-level security). Keep them unless told otherwise.

4. Wrap the app and mount the bar in `app/layout.tsx`:
   ```tsx
   import { ReviewKitProvider, ReviewBar } from "@nwc/review-kit";
   import { reviewConfig } from "@/lib/review.config";

   export default function RootLayout({ children }: { children: React.ReactNode }) {
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

5. Render the slate at `/`:
   ```ts
   // app/page.tsx
   export { Slate as default } from "@nwc/review-kit";
   ```

6. Build the design pages at the routes named in `pages`. A page like `{ basePath: "/home", options:[{slug:"1"},{slug:"2"}] }` means you create real routes `app/home/1/page.tsx` and `app/home/2/page.tsx`.

7. One-time per Supabase project: run `sql/comments.sql` (in the repo) in the Supabase SQL editor. If reusing the shared project above, this is already done.

## Limitations and rules (read these — they are the common mistakes)

- **Do NOT embed your design pages in iframes**, and do not put page content inside an inner scroll container. Two features depend on the pages living in the same scrolling document:
  - The desktop bar collapses on **window scroll**. Inside an iframe the outer window never scrolls, so it never collapses.
  - Comment pins anchor to elements in the main document. They cannot reach into an iframe, so commenting silently breaks.
  Build each design as a normal Next.js route. If you must reuse a static HTML build, port it into a route, do not iframe it.
- The bar only collapses once there is enough content to scroll past ~60px. The one-screen slate will not collapse — that is intended.
- Requires the **App Router**. `ReviewBar`, `Slate` and the commenting layer must be inside `<ReviewKitProvider>`.
- Comments are shared across all sites in one database, separated by `projectId`. Use a distinct `projectId` per site or comments will mix.
- It is a **review-only** layer. For a production/launch build, omit `<ReviewKitProvider>`/`<ReviewBar>` and the slate route (e.g. behind an env flag).

## Config reference

`ReviewConfig`: `{ projectId, supabaseUrl, supabaseAnonKey, brand, slate, pages }`
- `brand`: `{ name: string; logo?: string; accent: string }` — `logo` optional (bundled fallback); `accent` is a hex used for the comment button, pins and slate.
- `slate`: `{ dashboardLabel, title, client, version, status }`.
- `pages[]`: `{ key, label, basePath, href?, options, status? }`.
  - `options[]`: `{ slug, label, descriptor? }`. One option = a single page (no dropdown). Multiple = a switchable design comparison.
  - `href?`: overrides the link target (use for single-page sections).
  - `status?`: `{ design?: {label, tone}, copy?: {label, tone} }`, `tone` is `"good" | "warn" | "todo"`, shown on the slate.

## Reviewing comments with Claude

See `CLAUDE_FEEDBACK_LOOP.md` for the prompt that lets Claude read and resolve comments.
