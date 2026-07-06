# NWC Review Kit

A drop-in review layer for Next.js (App Router) prototypes, by Now We Collide. It adds three things to any site:

1. A **slate** ("clapperboard") landing that makes the draft status unmissable.
2. A **client review nav** that comes in two placements (see [Nav placement](#nav-placement)): a **top bar** that collapses into a floating glass pill and auto-hides on scroll, or a **side rail** pinned to the right edge that expands on hover/click. Both carry per-page design options.
3. An **in-page commenting layer** (pins + panel) backed by a shared Supabase database, with **replies, editing, auto-growing input, anonymous authorship, and a hover highlight** so you can see what you're commenting on.

Comments live in one shared Supabase project for all your sites, namespaced by `projectId`. You do not create a new database per site.

Config is **injected by the consumer** via `<ReviewKitProvider config={...}>`, so the kit isn't tied to any one project. Two brand logos (NWC and TheBird AI) are bundled, so there is usually no image file to supply.

## Install on a Next.js site

```bash
npm install github:Now-We-Collide/nwc-review-kit
```

1. The kit ships raw TS/TSX, so add it to `transpilePackages` in `next.config.ts`:

   ```ts
   const nextConfig = { transpilePackages: ["@nwc/review-kit"] };
   ```

2. Let Tailwind scan the kit for class names (only needed if your pages rely on it — the kit itself is self-styled). In your global stylesheet, after `@import "tailwindcss";`:

   ```css
   @source "../node_modules/@nwc/review-kit/src";
   ```

   (Tailwind v4. Adjust the relative path to your CSS file's location.)

3. Create a config file in your app, e.g. `lib/review.config.ts`:

   ```ts
   import type { ReviewConfig } from "@nwc/review-kit";
   export const reviewConfig: ReviewConfig = {
     projectId: "my-site",            // unique per site; namespaces its comments
     supabaseUrl: "https://xxxx.supabase.co",
     supabaseAnonKey: "sb_publishable_...",
     brand: { name: "Now We Collide", logo: "nwc", accent: "#4ae0f9" },
     bar: { position: "top", autoHide: true },   // or position: "side"
     slate: { dashboardLabel: "Website Review Dashboard", title: "...", client: "...", version: "v0.1", status: "For review" },
     pages: [ /* tabs + options + per-page design/copy status */ ],
   };
   ```

4. Wrap your app and mount the bar in the root layout:

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

5. Render the slate from `/`:

   ```ts
   // app/page.tsx
   export { Slate as default } from "@nwc/review-kit";
   ```

6. One-time per Supabase project: run `sql/comments.sql` in the Supabase SQL Editor. The kit needs **no extra columns** for replies or authorship, so the base schema is all you ever need.

Your real page designs live at the routes named in `pages` (e.g. `/home/1`). The kit only provides the slate, the nav and the commenting overlay.

## Nav placement

Set `bar.position`:

- **`"top"` (default)** — a full-width bar that collapses into a floating pill on scroll. With `bar.autoHide` (default `true`) it slides out of the way when you scroll down and returns on scroll-up or when the pointer nears the top. Best early on, before the client's own site has a nav.
- **`"side"`** — a slim rail on the right edge. It peeks open once on load, expands on hover, and collapses when you click away. Click a page to reveal its options (each page toggles independently), then click an option to go there. Use it once the site has its own nav so there aren't two competing top bars.

## Brand logo

`brand.logo` selects the bundled logo, or points at your own:

- `"nwc"` — bundled NWC logo (default; may also be omitted).
- `"thebird"` — bundled TheBird AI logo.
- any other string — treated as a URL/path to a logo you serve yourself.

## Commenting

Turn on commenting with the **Comment** button, then click anywhere on the page to drop a pin. Each comment:

- **Replies** thread underneath it; **edit** any comment in place; the box **grows as you type**.
- **Authorship is anonymous** — each browser gets a hidden id, and the UI labels people "Reviewer 1 / 2 / …" (and your own as "You"). No name is asked for.
- Captures **rich placement context** for the AI feedback loop: what element it's on (text/label/role), the section heading, and — if placed beside rather than on something — the nearest element and direction. Hovering while commenting highlights the element you're targeting.

## Requirements

- Next.js App Router, React 18+.

## Removing it for launch

Include the kit only in preview/staging builds. To ship a clean production site, omit `<ReviewKitProvider>`/`<ReviewBar>` and the slate route (e.g. behind an env flag).

## Troubleshooting

**Logo shows as a broken image.** Use `brand.logo: "nwc"` or `"thebird"` for a bundled logo, or omit `logo` entirely (defaults to NWC). Only set it to a custom URL/path if that path is actually served — a non-existent path renders the browser's broken-image glyph. If you changed it, clear the build cache and restart, since a stale build can keep serving the old reference: `rm -rf .next && npm run dev`.

## Reviewing comments with Claude

See `CLAUDE_FEEDBACK_LOOP.md` for the prompt to let Claude read and resolve the comments.
