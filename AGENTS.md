# NWC Review Kit — setup guide for AI assistants

Read THIS file to install the kit. You do not need to read the component source. This file is the contract.

## What the kit is

A drop-in review layer for **Next.js (App Router) + React** prototypes. It adds three things:

1. **Slate** — a dark intro/landing screen (render at `/`).
2. **Review nav** — lets the client switch between pages and per-page design options. Two placements via `bar.position`: `"top"` (default) is a full-width bar that collapses into a floating pill and auto-hides on scroll; `"side"` is a slim right-edge rail that expands on hover/click. On mobile both fall back to a compact bar with a slide-down menu. Fully responsive and self-styled.
3. **Commenting layer** — click anywhere on the page to leave a pin + comment, stored in a shared Supabase database, namespaced per project. Supports threaded replies, in-place editing, an auto-growing input, and anonymous authorship (no name asked; the UI labels reviewers "Reviewer 1/2/…"). Each comment also captures rich context (the element and section it was placed on) for the feedback loop.

The kit is **self-styled** (injected CSS). It does NOT require Tailwind, and does NOT read the host app's CSS. Two brand logos (NWC and TheBird AI) are **bundled**, selected via `brand.logo`, so there is usually no image file to supply.

> **Not a React/Next site?** For plain HTML/CSS/JS or HubSpot-ready static builds, use the **vanilla build** in `vanilla/` instead (one `<script>` + a `window.NWC_REVIEW_CONFIG` object, no framework, no build) — see `vanilla/README.md`. Everything below this line assumes the React/Next install.

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
     brand: { name: "Now We Collide", accent: "#4ae0f9" }, // logo?: "nwc" (default) | "thebird" | a URL
     bar: { position: "top", autoHide: true }, // OPTIONAL. "top" (default) | "side"
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
  - The `"top"` bar collapses/auto-hides on **window scroll**. Inside an iframe the outer window never scrolls, so it never reacts.
  - Comment pins anchor to elements in the main document. They cannot reach into an iframe, so commenting silently breaks.
  Build each design as a normal Next.js route. If you must reuse a static HTML build, port it into a route, do not iframe it.
- The `"top"` bar only collapses once there is enough content to scroll past ~60px. The one-screen slate will not collapse — that is intended. The `"side"` rail is unaffected by scroll.
- Requires the **App Router**. `ReviewBar`, `Slate` and the commenting layer must be inside `<ReviewKitProvider>`.
- Comments are shared across all sites in one database, separated by `projectId`. Use a distinct `projectId` per site or comments will mix.
- It is a **review-only** layer. For a production/launch build, omit `<ReviewKitProvider>`/`<ReviewBar>` and the slate route (e.g. behind an env flag).

## Config reference

`ReviewConfig`: `{ projectId, supabaseUrl, supabaseAnonKey, brand, bar?, slate, pages }`
- `brand`: `{ name: string; logo?: "nwc" | "thebird" | string; accent: string }` — `logo` optional: a bundled key (`"nwc"` default, `"thebird"`) or a URL/path; `accent` is a hex used for the comment button, pins and slate.
- `bar?`: `{ position?: "top" | "side"; autoHide?: boolean; rounds?: boolean }` — `position` defaults to `"top"`; `autoHide` (top bar only, default `true`) hides it on scroll-down and reveals on scroll-up/pointer-to-top; `rounds` (side rail only, default `false`) says the top-level pages are **rounds of design, newest first** — see below.
- `slate`: `{ dashboardLabel, title, client, version, status }`.
- `pages[]`: `{ key, label, basePath?, href?, commentPath?, stub?, options?, children?, status? }`.
  - `options[]`: `{ slug, label, descriptor? }` — design **variants** of one page (same `basePath`, different `slug`). Multiple = a switchable comparison.
  - `children[]`: **subpages** (a section tree), distinct from options. Each child: `{ label, href, commentPath?, stub?, status?, children? }` — a real page with its own URL and status; nests to any depth. In the side rail a section with children (or with more than one option) is a group **header**, not a link: clicking it opens and closes the group. Its own `href` is listed as the first sub-row so it stays reachable — automatically, and only when no child already points at that URL.
  - `landingLabel?`: names that auto-added first sub-row. Defaults to `"Home page"`.
  - `href?`: the page's landing/link target (overrides `basePath`/`slug`).
  - `commentPath?`: a stable key for this page's comments, so identity survives a URL change (defaults to the URL). Works on pages and children.
  - `stub?`: mark a placeholder page; rendered with a distinct badge/marker.
  - `status?`: `{ design?: {label, tone}, copy?: {label, tone} }`, `tone` is `"good" | "warn" | "todo"`, shown as coloured dots on the slate + nav (pages and children).

## Rounds (side rail)

Set `bar.rounds: true` when the top-level pages are **rounds of feedback rather than pages of one site**, listed newest first. The rail then reads them that way:

- The **first** page is the current round. It is always open and at full strength, and its header does not collapse.
- **Every page below it** is a past round: dimmed, and collapsed until the reviewer clicks it open. Past rounds stay on the site because clients refer back to them when discussing the current one, but they are not what this round is asking about.
- A past round you are currently inside opens by default, and can still be collapsed.

Leave it off (the default) when the pages are the pages of one site — everything then stays open and undimmed, as before.

## Reviewing comments with Claude

See `CLAUDE_FEEDBACK_LOOP.md` for the prompt that lets Claude read and resolve comments.

## UI rules (from the vault)

<!-- ui-rules v1 -->

How anything built here should be laid out and sized. Read before designing or building any
interface — a page, a section, a component, a layout change.

1. **Nothing below 16px — for text that has to be READ.** Two tiers: anything read in sequence
   has a hard 16px floor; FURNITURE and DATA SURFACES (charts, tables, diagram keys, code
   blocks, labels inside a reproduced product UI) are exempt, but each exemption must be
   labelled where it lives, with its reason.
2. **No text as a graphic element.** No kickers, eyebrows, small uppercase mono captions, or
   metadata rows repeating what is said elsewhere.
3. **Deleting beats shrinking.** When a screen feels too full, remove items rather than
   reduce their size.
4. **A label goes next to the thing it labels.**
5. **Do not invent structure that was not asked for.**
6. **Test:** for every element on screen, what does the reader learn from it? No answer means
   remove it.
7. **Primary text takes the primary token; secondary text is genuinely secondary.** "Is this
   what the reader came here for" decides which, and the answer is usually primary.
8. **An inherited container is not neutral.** Long-form text gets its own measure token,
   34rem / ~68 characters, applied per block.
9. **Derive it when the content can decide. Name it when the content cannot. Never a
   measurement.** Derived: column count follows the number of items. Named choice: light or
   dark, image left or right. Never: widths, pixel values, "columns: 3".
10. **Sub-page depth reads as height.** Home hero full-screen, sub-page hero about two thirds,
    an article header smaller again and sized by its own content.
11. **Verify the ON state of anything whose off-state is the default.** A switch that was
    never wired looks exactly like a switch that is off.

**Underneath all of it: function over form, roughly 80/20.** When a layout looks better and
reads worse, it is wrong.
