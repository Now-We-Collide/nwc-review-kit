# NWC Review Kit — vanilla build

A dependency-free, no-build drop-in of the review kit for **plain HTML/CSS/JS sites**, including HubSpot-ready static builds where the React/Next package cannot run. Same slate, review nav (top or side), and in-page commenting (with replies, editing, anonymous authorship, and rich AI context) as the React kit, and it talks to the **same Supabase database**, so the `CLAUDE_FEEDBACK_LOOP.md` prompt works unchanged.

## Install (two script tags)

Include on **every** page you want reviewed, before `</body>`:

```html
<script src="/review.config.js"></script>   <!-- your config (see review.config.example.js) -->
<script src="/nwc-review-kit.js" defer></script>
```

On the **review landing page**, add a mount point for the slate:

```html
<div data-nwc-slate></div>
```

That's it. No build step, no framework. `nwc-review-kit.js` is a single self-contained file (logos are embedded).

## Config

`window.NWC_REVIEW_CONFIG` has the same shape as the React kit's `ReviewConfig` (see `review.config.example.js`): `projectId`, `supabaseUrl`, `supabaseAnonKey`, `brand {name, logo, accent}`, `bar {position, autoHide}`, `slate {...}`, and `pages[]`. Run `sql/comments.sql` once per Supabase project (already done for the shared project).

## Routing

Nav links are plain `<a href>` to your real page URLs (full page loads); the kit re-initialises on each page and derives the active page from the URL. Trailing slashes and `.html` are normalised, so `/home/1`, `/home/1/`, and `/home/1/index.html` all match a page whose `basePath` is `/home` and option `slug` is `1`. Comment mode stays on across navigation (sessionStorage).

## Removing it for launch / the HubSpot port

It's review-only. Delete the two `<script>` lines (and the `data-nwc-slate` div) before porting to HubSpot. It never becomes a HubSpot module and does not need to satisfy the porting contract; it's fully isolated (all its DOM is under `data-nwc` / `data-nwc-ui`, all its CSS is scoped).

## Local demo

`vanilla/example/` (git-ignored) is a small static demo. Serve it with:

```bash
node vanilla/serve.mjs   # http://localhost:4320
```

## Maintaining

The kit is authored by hand in `nwc-review-kit.js`; only the logo data URIs are generated. After a logo changes in `assets/`, re-embed them with:

```bash
node scripts/embed-vanilla-logos.mjs
```

This is a straight port of the React kit in `../src`. Keep behaviour in step when either changes.
