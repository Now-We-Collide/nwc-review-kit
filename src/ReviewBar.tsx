"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useReviewKit } from "./FeedbackProvider";
import { resolveLogo } from "./logo";
import type { ReviewConfig, ReviewPage, ReviewChild, Status } from "./config";

/*
  Client review nav. Self-styled (injected CSS, no host Tailwind needed) and
  fully responsive. Two placements, chosen via config.bar.position:

  "top" (default) — a full-width dark bar that morphs into a floating glass
  pill on scroll. Best early on, before the client's site has its own nav.
  With config.bar.autoHide (default true) it slides away on scroll-down and
  returns on scroll-up or when the pointer nears the top of the screen.

  "side" — a slim rail pinned to the right edge that expands on hover/click.
  Use it once the site has its own nav so there aren't two competing top bars.
  It rests as a slim strip and only opens when you point at it (it stays open
  on the slate, where it is the navigation). Expanded it has room for per-page
  copy status and the dev round. With config.bar.rounds it reads the top-level
  pages as rounds of design, newest first: the first is the current round and
  stays open, the rest are past rounds, dimmed and collapsed until clicked.

  Mobile (<=820px): "top" is a solid dark bar + slide-down menu; "side" docks
  the same controls to the bottom-right so the top of the page stays clear.
*/

const BAR_BG = "#0d0d0f";
const DROP_BG = "#1a1a1f";

const CSS = `
.nwc-bar{position:sticky;top:0;z-index:50;pointer-events:none;font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
.nwc-bar *{box-sizing:border-box}
.nwc-bar a{text-decoration:none;color:inherit}
.nwc-bar .inner{position:relative}
.nwc-bar .d-wrap{display:block}
.nwc-bar .m-wrap{display:none;pointer-events:auto}

/* ---------- top: desktop ---------- */
.nwc-bar .shell{transition:transform .3s ease}
.nwc-bar .shell.hidden{transform:translateY(-110%)}
.nwc-bar .bg{position:absolute;inset:0;transition:opacity .3s}
.nwc-bar .row{position:relative;margin:0 auto;display:flex;min-height:56px;max-width:80rem;align-items:center;justify-content:center;padding:0 20px}
.nwc-bar .pill{pointer-events:auto;display:flex;align-items:center;justify-content:center;gap:2px;border:1px solid transparent;padding:6px 8px;transition:max-width .3s ease-out,background-color .3s,border-color .3s,border-radius .3s}
.nwc-bar .logo{pointer-events:auto;z-index:10;display:flex;align-items:center;transition:margin .3s}
.nwc-bar .logo img{height:20px;width:auto;display:block}
.nwc-bar .proto{overflow:hidden;white-space:nowrap;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.22em;color:rgba(255,255,255,.6);transition:max-width .3s,opacity .3s}
.nwc-bar .tab{position:relative;display:flex;align-items:center;white-space:nowrap;border-radius:8px;padding:8px 14px;font-size:13.5px;font-weight:500;color:rgba(255,255,255,.65);transition:background-color .15s,color .15s;cursor:pointer}
.nwc-bar .tab:hover{background:rgba(255,255,255,.1);color:#fff}
.nwc-bar .tab.active{background:rgba(255,255,255,.1);color:#fff}
.nwc-bar .caret{margin-left:2px;opacity:.55;transition:transform .2s}
.nwc-bar .caret.open{transform:rotate(180deg)}
.nwc-bar .menu{position:absolute;left:50%;top:100%;z-index:50;transform:translateX(-50%);padding-top:8px;transition:opacity .15s,transform .15s}
.nwc-bar .menu.closed{opacity:0;transform:translateX(-50%) translateY(-4px);pointer-events:none}
.nwc-bar .menu-inner{width:max-content;min-width:16rem;border-radius:12px;border:1px solid rgba(255,255,255,.1);padding:6px;box-shadow:0 25px 50px -12px rgba(0,0,0,.6)}
.nwc-bar .opt{display:flex;align-items:center;gap:10px;white-space:nowrap;border-radius:8px;padding:10px 12px;font-size:13.5px;transition:background-color .15s}
.nwc-bar .opt:hover{background:rgba(255,255,255,.06)}
.nwc-bar .opt.active{background:rgba(255,255,255,.1)}
.nwc-bar .opt .tick{width:14px;flex:0 0 auto}
.nwc-bar .opt .lbl{font-weight:600;color:#fff}
.nwc-bar .opt .sep{color:rgba(255,255,255,.55)}
.nwc-bar .opt .desc{color:rgba(255,255,255,.75)}
.nwc-bar .opt.opt-child{align-items:flex-start}
.nwc-bar .opt .o-body{display:flex;flex-direction:column;min-width:0}
.nwc-bar .opt .o-lbl{display:flex;align-items:center;gap:6px}
.nwc-bar .opt .o-status{display:flex;gap:12px;margin-top:3px;font-size:10.5px;color:rgba(255,255,255,.6)}
.nwc-bar .opt .o-stat{display:inline-flex;align-items:center;gap:5px;white-space:nowrap}
.nwc-bar .opt .o-dot{width:6px;height:6px;border-radius:50%;flex:0 0 auto}
.nwc-bar .o-stub,.nwc-bar .m-stub{margin-left:6px;font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:rgba(255,255,255,.5);border:1px solid rgba(255,255,255,.25);border-radius:4px;padding:0 4px}
.nwc-bar .m-row .m-substatus{display:flex;gap:12px;margin-top:2px;font-size:11px;color:rgba(255,255,255,.5);font-weight:400}
.nwc-bar .m-row .m-substatus .o-dot{width:6px;height:6px;border-radius:50%;display:inline-block}
.nwc-bar .comment{pointer-events:auto;z-index:10;display:flex;align-items:center;gap:8px;border:0;font-size:13.5px;font-weight:600;cursor:pointer;color:#06222a;transition:margin .3s,filter .15s}
.nwc-bar .comment:hover{filter:brightness(1.1)}

/* ---------- mobile (shared by top + side) ---------- */
.nwc-bar .m-bar{position:relative;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:10px;background:${BAR_BG};padding:10px 14px;box-shadow:0 1px 0 rgba(255,255,255,.07),0 8px 24px -16px rgba(0,0,0,.7)}
.nwc-bar .m-logo{display:flex;align-items:center}
.nwc-bar .m-logo img{height:20px;width:auto;display:block}
.nwc-bar .m-actions{display:flex;align-items:center;gap:8px}
.nwc-bar .m-comment{display:inline-flex;align-items:center;gap:6px;border:0;border-radius:999px;padding:9px 14px;font-size:13px;font-weight:700;color:#06222a;cursor:pointer;white-space:nowrap}
.nwc-bar .m-menu{display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;flex:0 0 auto;border-radius:10px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.07);color:#fff;cursor:pointer;padding:0}
.nwc-bar .m-panel{position:relative;z-index:1;overflow-y:auto;background:${BAR_BG};border-top:1px solid rgba(255,255,255,.08);max-height:75vh;transition:max-height .3s ease,border-color .3s;padding:8px}
.nwc-bar .m-panel.closed{max-height:0;border-top-color:transparent;padding-top:0;padding-bottom:0}
.nwc-bar .m-grouplabel{padding:12px 12px 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.14em;color:rgba(255,255,255,.42)}
.nwc-bar .m-row{display:flex;align-items:center;gap:10px;padding:14px 12px;border-radius:10px;color:#fff;font-size:15px;font-weight:500}
.nwc-bar .m-row.active{background:rgba(255,255,255,.08)}
.nwc-bar .m-row .m-tick{width:16px;flex:0 0 auto;font-weight:700}
.nwc-bar .m-row .m-desc{color:rgba(255,255,255,.5);font-size:13px;font-weight:400}
.nwc-bar .m-row .m-arrow{margin-left:auto;color:rgba(255,255,255,.4)}

/* mobile "side" placement: dock the same controls to the bottom-right */
.nwc-bar.pos-side .m-wrap{position:fixed;right:12px;bottom:12px;left:auto;width:min(92vw,340px);z-index:60}
.nwc-bar.pos-side .m-shell{display:flex;flex-direction:column-reverse;border-radius:16px;overflow:hidden;box-shadow:0 20px 45px -12px rgba(0,0,0,.7)}
.nwc-bar.pos-side .m-bar{border-radius:0 0 16px 16px;box-shadow:none}
.nwc-bar.pos-side .m-logo{display:none}
.nwc-bar.pos-side .m-panel{border-top:0;border-bottom:1px solid rgba(255,255,255,.08);border-radius:16px 16px 0 0}
.nwc-bar.pos-side .m-panel.closed{border-bottom-color:transparent}

@media(max-width:820px){
  .nwc-bar .d-wrap{display:none}
  .nwc-bar .m-wrap{display:block}
}

/* ============ SIDE RAIL (desktop >820px) ============ */
.nwc-rail{position:fixed;top:0;right:0;bottom:0;z-index:60;display:none;align-items:center;justify-content:flex-end;pointer-events:none;font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
.nwc-rail *{box-sizing:border-box}
.nwc-rail a{text-decoration:none;color:inherit}
@media(min-width:821px){.nwc-rail{display:flex}}
.nwc-rail .panel{pointer-events:auto;position:relative;margin-right:12px;display:flex;flex-direction:column;max-height:70vh;width:56px;overflow:hidden;background:rgba(13,13,15,.82);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.1);border-radius:16px;box-shadow:0 20px 50px -18px rgba(0,0,0,.75);transition:width .28s ease}
.nwc-rail.open .panel{width:450px}
/* content is a fixed width so it lays out at the final size from the start; the
   panel just clips it while the width animates (no text reflow mid-animation) */
.nwc-rail .r-inner{width:450px;flex:1 1 auto;min-height:0;display:flex;flex-direction:column}
.nwc-rail .r-head{display:flex;align-items:center;gap:10px;padding:14px 12px;min-height:56px;border-radius:12px;cursor:pointer}
.nwc-rail .r-head:hover .r-name{color:#fff}
.nwc-rail .r-logo{flex:0 0 auto;display:flex;align-items:center;justify-content:center;width:32px}
.nwc-rail .r-logo img{height:18px;width:auto;display:block}
.nwc-rail .r-meta{display:flex;flex-direction:column;min-width:0;overflow:hidden;white-space:nowrap;opacity:0;transition:opacity .2s}
.nwc-rail.open .r-meta{opacity:1}
.nwc-rail .r-meta .r-name{font-size:12.5px;font-weight:700;color:rgba(255,255,255,.92);transition:color .15s;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nwc-rail .r-meta .r-status{font-size:11px;color:rgba(255,255,255,.5);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nwc-rail .r-scroll{flex:1 1 auto;min-height:0;overflow-y:auto;overflow-x:hidden;padding:4px 8px 0}
/* fills the scroll area so pages spread across any spare height (space-between);
   when content overflows, min-height:100% lets it grow and scroll from the top */
.nwc-rail .r-groups{min-height:100%;display:flex;flex-direction:column;justify-content:space-between}
.nwc-rail .r-item{display:flex;align-items:center;gap:12px;padding:9px 8px;border-radius:10px;transition:background-color .15s}
.nwc-rail a.r-item:hover{background:rgba(255,255,255,.07)}
.nwc-rail .r-group.active .r-item{background:rgba(255,255,255,.08)}
.nwc-rail .r-ic{flex:0 0 auto;display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:7px;background:rgba(255,255,255,.08);color:#fff;font-size:12px;font-weight:700}
.nwc-rail .r-group.active .r-ic{background:rgba(255,255,255,.18)}
.nwc-rail .r-body{display:flex;flex-direction:column;flex:1;min-width:0;overflow:hidden;white-space:nowrap;opacity:0;transition:opacity .2s}
.nwc-rail.open .r-body{opacity:1}
.nwc-rail .r-lbl{font-size:13.5px;font-weight:600;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
/* per-page status as coloured dots (matches the slate), one line, truncates */
.nwc-rail .r-status-row{display:flex;gap:14px;min-width:0;overflow:hidden;white-space:nowrap;margin-top:4px}
.nwc-rail .r-stat{display:inline-flex;align-items:center;gap:6px;min-width:0;font-size:11px;color:rgba(255,255,255,.6);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nwc-rail .r-dot{flex:0 0 auto;width:6px;height:6px;border-radius:50%}
/* Sub-rows are display:none while the rail is a slim strip. Two things follow.
   The collapsed panel is exactly as tall as its top-level rows — the short
   height you see on load, and the one it keeps. And opening the rail puts every
   row in its final position at once instead of sliding them past the pointer
   for a quarter of a second, which is what made a click land on the wrong row. */
.nwc-rail .r-sub{display:none}
.nwc-rail.open .r-sub{display:block;overflow:hidden;max-height:0;transition:max-height .28s ease}
.nwc-rail.open .r-group.expanded .r-sub{max-height:3000px}
.nwc-rail button.r-item{width:100%;background:none;border:0;font:inherit;color:inherit;text-align:left;cursor:pointer}
.nwc-rail button.r-item:hover{background:rgba(255,255,255,.07)}
.nwc-rail .r-caret{flex:0 0 auto;margin-left:auto;display:flex;align-items:center;color:rgba(255,255,255,.55);opacity:0;transition:opacity .2s,transform .2s}
.nwc-rail.open .r-caret{opacity:1}
.nwc-rail .r-caret.open{transform:rotate(180deg)}
/* Past rounds stay on the site because clients refer back to them when talking
   about the current one. They are not what this round is asking about, so they
   sit back until you point at one. */
.nwc-rail .r-group.past .r-item{opacity:.5;transition:opacity .15s}
.nwc-rail .r-group.past:hover .r-item,.nwc-rail .r-group.past.expanded .r-item{opacity:1}
.nwc-rail .r-opt{display:flex;align-items:center;gap:8px;padding:8px 8px 8px 44px;border-radius:9px;font-size:12.5px;color:rgba(255,255,255,.75);cursor:pointer;transition:background-color .15s}
.nwc-rail .r-opt:hover{background:rgba(255,255,255,.06)}
.nwc-rail .r-opt.active{background:rgba(255,255,255,.08);color:#fff}
.nwc-rail .r-opt .r-tick{width:12px;flex:0 0 auto;color:rgba(255,255,255,.9)}
.nwc-rail .r-opt .r-opt-t{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nwc-rail .r-opt .r-desc{color:rgba(255,255,255,.45)}
.nwc-rail .r-opt.r-child{align-items:flex-start}
.nwc-rail .r-child .r-tick{margin-top:1px}
.nwc-rail .r-cbody{display:flex;flex-direction:column;min-width:0;flex:1}
.nwc-rail .r-clabel{display:flex;align-items:center;gap:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nwc-rail .r-opt.stub .r-clabel{color:rgba(255,255,255,.55)}
.nwc-rail .r-stub-badge{flex:0 0 auto;font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:rgba(255,255,255,.5);border:1px solid rgba(255,255,255,.25);border-radius:4px;padding:0 4px;line-height:1.5}
.nwc-rail .r-foot{flex:0 0 auto;padding:8px}
/* collapsed: a compact 40px icon button; expanded: full-width with a label */
.nwc-rail .r-comment{width:40px;margin:0 auto;display:flex;align-items:center;gap:10px;justify-content:center;overflow:hidden;border:0;border-radius:12px;padding:0;height:40px;font-size:13.5px;font-weight:700;color:#06222a;cursor:pointer;transition:width .25s ease,margin .25s ease,filter .15s}
.nwc-rail.open .r-comment{width:100%;margin:0;justify-content:flex-start}
.nwc-rail .r-comment:hover{filter:brightness(1.08)}
.nwc-rail .r-comment .r-cic{flex:0 0 auto;display:flex;align-items:center;justify-content:center;width:40px;height:40px}
.nwc-rail .r-comment .r-clbl{overflow:hidden;white-space:nowrap;opacity:0;transition:opacity .2s}
.nwc-rail.open .r-comment .r-clbl{opacity:1}

@media(prefers-reduced-motion:reduce){
  .nwc-bar .bg,.nwc-bar .pill,.nwc-bar .logo,.nwc-bar .proto,.nwc-bar .comment,.nwc-bar .menu,.nwc-bar .m-panel,.nwc-bar .shell,
  .nwc-rail .panel,.nwc-rail .r-meta,.nwc-rail .r-body,.nwc-rail .r-sub,.nwc-rail .r-comment .r-clbl{transition:none}
}
`;

function Caret({ open }: { open: boolean }) {
  return (
    <svg className={`caret ${open ? "open" : ""}`} width="9" height="6" viewBox="0 0 10 6">
      <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.6-.8L3 21l1.9-5.4A8.5 8.5 0 1 1 21 11.5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>
  );
}

// tone -> status dot colour, matching the slate's good/warn/todo palette.
const TONE_DOT: Record<string, string> = { good: "#4ade80", warn: "#fbbf24", todo: "#9aa0ad" };

function normPath(p: string): string {
  if (!p) return "/";
  p = p.replace(/\/index\.html?$/i, "/").replace(/\.html?$/i, "");
  if (p.length > 1) p = p.replace(/\/+$/, "");
  return p || "/";
}
function pageHref(page: ReviewPage): string {
  return page.href ?? (page.options && page.options[0] ? `${page.basePath}/${page.options[0].slug}` : "#");
}
function hrefActive(href: string | undefined, pathname: string): boolean {
  return !!href && normPath(href) === normPath(pathname);
}
function anyDescendantActive(node: { href?: string; children?: ReviewChild[] }, pathname: string): boolean {
  if (hrefActive(node.href, pathname)) return true;
  return (node.children ?? []).some((c) => anyDescendantActive(c, pathname));
}
function isPageActive(page: ReviewPage, pathname: string): boolean {
  if (page.basePath && (pathname === page.basePath || pathname.startsWith(page.basePath + "/"))) return true;
  return anyDescendantActive(page, pathname);
}
function useActivePage(config: ReviewConfig, pathname: string): ReviewPage | null {
  return config.pages.find((p) => isPageActive(p, pathname)) ?? null;
}

// A section with children is a group HEADER in the rail, not a link — clicking
// it opens and closes the group. Its own landing page still has to be reachable,
// so it becomes the first sub-row. Derived, not configured: the row appears only
// when no child already points at that URL, so a config whose first child IS the
// landing page (round 1 -> option 1) gets no duplicate.
function collectHrefs(nodes: ReviewChild[], out: Set<string>): void {
  for (const n of nodes) { out.add(normPath(n.href)); if (n.children) collectHrefs(n.children, out); }
}
function railChildren(page: ReviewPage): ReviewChild[] {
  const kids = page.children ?? [];
  if (!page.href || !kids.length) return kids;
  const seen = new Set<string>();
  collectHrefs(kids, seen);
  if (seen.has(normPath(page.href))) return kids;
  // No status on this row: the group header above it already carries the
  // section's status, and saying it twice reads as two different things.
  return [{ label: page.landingLabel ?? "Home page", href: page.href, commentPath: page.commentPath }, ...kids];
}

// coloured-dot status row, reused by page + child rows in the rail
function StatusRow({ status }: { status?: { design?: Status; copy?: Status } }) {
  if (!status || (!status.design && !status.copy)) return null;
  return (
    <span className="r-status-row">
      {status.design && <span className="r-stat"><span className="r-dot" style={{ background: TONE_DOT[status.design.tone] }} />{status.design.label}</span>}
      {status.copy && <span className="r-stat"><span className="r-dot" style={{ background: TONE_DOT[status.copy.tone] }} />{status.copy.label}</span>}
    </span>
  );
}

// Side-rail child sub-row (recursive): own href, own status, indent per depth, stub marker.
function RailChild({ child, depth, pathname }: { child: ReviewChild; depth: number; pathname: string }) {
  const active = hrefActive(child.href, pathname);
  return (
    <>
      <Link href={child.href} className={`r-opt r-child ${active ? "active " : ""}${child.stub ? "stub" : ""}`} style={{ paddingLeft: 44 + (depth - 1) * 16 }}>
        <span className="r-tick">{active ? "✓" : ""}</span>
        <span className="r-cbody">
          <span className="r-clabel"><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{child.label}</span>{child.stub && <span className="r-stub-badge">stub</span>}</span>
          <StatusRow status={child.status} />
        </span>
      </Link>
      {(child.children ?? []).map((gc, i) => <RailChild key={i} child={gc} depth={depth + 1} pathname={pathname} />)}
    </>
  );
}

// Top-bar dropdown child row (recursive).
function TopChild({ child, depth, pathname, accent }: { child: ReviewChild; depth: number; pathname: string; accent: string }) {
  const active = hrefActive(child.href, pathname);
  const st = child.status;
  return (
    <>
      <Link href={child.href} className={`opt opt-child ${active ? "active" : ""}`} style={depth ? { paddingLeft: 12 + depth * 14 } : undefined}>
        <span className="tick" style={{ color: accent }}>{active ? "✓" : ""}</span>
        <span className="o-body">
          <span className="o-lbl"><span className="lbl">{child.label}</span>{child.stub && <span className="o-stub">stub</span>}</span>
          {st && (st.design || st.copy) && (
            <span className="o-status">
              {st.design && <span className="o-stat"><span className="o-dot" style={{ background: TONE_DOT[st.design.tone] }} />{st.design.label}</span>}
              {st.copy && <span className="o-stat"><span className="o-dot" style={{ background: TONE_DOT[st.copy.tone] }} />{st.copy.label}</span>}
            </span>
          )}
        </span>
      </Link>
      {(child.children ?? []).map((gc, i) => <TopChild key={i} child={gc} depth={depth + 1} pathname={pathname} accent={accent} />)}
    </>
  );
}

// Mobile menu child row (recursive).
function MobileChild({ child, depth, pathname, accent }: { child: ReviewChild; depth: number; pathname: string; accent: string }) {
  const active = hrefActive(child.href, pathname);
  const st = child.status;
  return (
    <>
      <Link href={child.href} className={`m-row ${active ? "active" : ""}`} style={{ paddingLeft: 12 + depth * 14 }}>
        <span className="m-tick" style={{ color: accent }}>{active ? "✓" : ""}</span>
        <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <span>{child.label}{child.stub && <span className="m-stub">stub</span>}</span>
          {st && (st.design || st.copy) && (
            <span className="m-substatus">
              {st.design && <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span className="o-dot" style={{ background: TONE_DOT[st.design.tone] }} />{st.design.label}</span>}
              {st.copy && <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span className="o-dot" style={{ background: TONE_DOT[st.copy.tone] }} />{st.copy.label}</span>}
            </span>
          )}
        </span>
      </Link>
      {(child.children ?? []).map((gc, i) => <MobileChild key={i} child={gc} depth={depth + 1} pathname={pathname} accent={accent} />)}
    </>
  );
}

export default function ReviewBar() {
  const { config } = useReviewKit();
  const position = config.bar?.position ?? "top";
  return position === "side" ? <SideRail /> : <TopBar />;
}

/* ============================ TOP BAR ============================ */
function TopBar() {
  const { config, enabled: commentsOn, toggle: toggleComments } = useReviewKit();
  const ACCENT = config.brand.accent;
  const logo = resolveLogo(config.brand.logo);
  const autoHide = config.bar?.autoHide ?? true;
  const pathname = usePathname();
  const barRef = useRef<HTMLDivElement>(null);
  const [openTab, setOpenTab] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastY = useRef(0);

  const openNow = (key: string) => { if (closeTimer.current) clearTimeout(closeTimer.current); setOpenTab(key); };
  const closeSoon = () => { if (closeTimer.current) clearTimeout(closeTimer.current); closeTimer.current = setTimeout(() => setOpenTab(null), 160); };

  const activePage = useActivePage(config, pathname);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    const el = barRef.current;
    if (el) document.documentElement.style.setProperty("--rev-h", `${el.offsetHeight}px`);
    // Only collapse/hide when the main window can actually scroll. On pages that
    // aren't taller than the viewport (e.g. a mockup embedded in an iframe),
    // stay expanded so the logo and tabs never flicker or vanish.
    const onScroll = () => {
      const doc = document.documentElement;
      const y = window.scrollY;
      const canCollapse = doc.scrollHeight > window.innerHeight + 80;
      setScrolled(canCollapse && y > 60);
      if (autoHide && canCollapse) {
        // hide when scrolling down past a threshold; reveal on any scroll-up or near the top
        const goingDown = y > lastY.current;
        setHidden(goingDown && y > 120 && openTab === null);
      } else {
        setHidden(false);
      }
      lastY.current = y;
    };
    onScroll();
    // pointer near the top of the screen re-reveals the bar (idea: "move mouse to top")
    const onMove = (e: MouseEvent) => { if (e.clientY <= 80) setHidden(false); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("mousemove", onMove);
    };
  }, [autoHide, openTab]);

  const logoStyle: React.CSSProperties = scrolled
    ? { position: "static", gap: 0, marginLeft: 4, marginRight: 6 }
    : { position: "absolute", left: 20, top: "50%", transform: "translateY(-50%)", gap: 12 };

  const commentStyle: React.CSSProperties = {
    background: ACCENT,
    boxShadow: commentsOn
      ? "0 0 0 2px rgba(255,255,255,0.5)"
      : scrolled
        ? "0 8px 30px -8px rgba(0,0,0,0.6)"
        : undefined,
    ...(scrolled
      ? { position: "static", marginLeft: 16, height: 48, borderRadius: 999, border: "1px solid rgba(255,255,255,0.1)", padding: "0 16px" }
      : { position: "absolute", right: 20, padding: "6px 16px", borderRadius: 999 }),
  };

  return (
    <div ref={barRef} data-nwc-ui className="nwc-bar pos-top">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="inner">

        {/* ===================== DESKTOP ===================== */}
        <div className="d-wrap">
          <div className={`shell ${hidden ? "hidden" : ""}`}>
            <div
              className="bg"
              style={{ background: BAR_BG, opacity: scrolled ? 0 : 1, pointerEvents: scrolled ? "none" : "auto", boxShadow: scrolled ? undefined : "0 1px 0 rgba(255,255,255,0.07), 0 10px 30px -18px rgba(0,0,0,0.7)" }}
            />
            <div className="row">
              <nav
                className="pill"
                style={{ width: scrolled ? "max-content" : "100%", maxWidth: scrolled ? "calc(100vw - 40px)" : 1280, background: scrolled ? "rgba(13,13,15,0.6)" : "transparent", borderColor: scrolled ? "rgba(255,255,255,0.1)" : "transparent", backdropFilter: scrolled ? "blur(10px)" : undefined, WebkitBackdropFilter: scrolled ? "blur(10px)" : undefined, boxShadow: scrolled ? "0 8px 30px -8px rgba(0,0,0,0.6)" : undefined, borderRadius: scrolled ? 999 : 0 }}
              >
                <Link href="/" aria-label="Back to start" className="logo" style={logoStyle}>
                  <img src={logo} alt={config.brand.name} />
                  <span className="proto" style={{ maxWidth: scrolled ? 0 : 140, opacity: scrolled ? 0 : 1 }}>Prototype</span>
                </Link>

                {config.pages.map((page) => {
                  const isActive = isPageActive(page, pathname);
                  const kids = page.children ?? [];
                  const multiOpt = (page.options?.length ?? 0) > 1;
                  const directHref = pageHref(page);
                  const open = openTab === page.key;

                  if (!kids.length && !multiOpt) {
                    return <Link key={page.key} href={directHref} className={`tab ${isActive ? "active" : ""}`}>{page.label}</Link>;
                  }

                  return (
                    <div key={page.key} style={{ position: "relative" }} onMouseEnter={() => openNow(page.key)} onMouseLeave={closeSoon}>
                      <Link href={directHref} className={`tab ${isActive ? "active" : ""}`}>{page.label}<Caret open={open} /></Link>
                      <div className={`menu ${open ? "" : "closed"}`}>
                        <div className="menu-inner" style={{ background: DROP_BG }}>
                          {kids.length > 0
                            ? kids.map((c, i) => <TopChild key={i} child={c} depth={0} pathname={pathname} accent={ACCENT} />)
                            : page.options!.map((opt) => {
                                const href = `${page.basePath}/${opt.slug}`;
                                const optActive = pathname === href;
                                return (
                                  <Link key={opt.slug} href={href} onClick={() => setOpenTab(null)} className={`opt ${optActive ? "active" : ""}`}>
                                    <span className="tick" style={{ color: ACCENT }}>{optActive ? "✓" : ""}</span>
                                    <span className="lbl">{opt.label}</span>
                                    {opt.descriptor && <span className="sep">·</span>}
                                    {opt.descriptor && <span className="desc">{opt.descriptor}</span>}
                                  </Link>
                                );
                              })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </nav>

              <button onClick={toggleComments} className="comment" style={commentStyle}>
                <CommentIcon />
                Comment
              </button>
            </div>
          </div>
        </div>

        {/* ===================== MOBILE ===================== */}
        <MobilePanel {...{ config, activePage, pathname, commentsOn, toggleComments, mobileOpen, setMobileOpen, logo, ACCENT }} />

      </div>
    </div>
  );
}

/* ============================ SIDE RAIL ============================ */
function SideRail() {
  const { config, enabled: commentsOn, toggle: toggleComments } = useReviewKit();
  const ACCENT = config.brand.accent;
  const logo = resolveLogo(config.brand.logo, "icon"); // icon-only: the wordmark squishes in the narrow rail
  const rounds = config.bar?.rounds ?? false;
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  // Where the collapsed panel sits, and how far down it may grow. See the
  // measuring effect below for why the rail is anchored rather than centred.
  const [geom, setGeom] = useState<{ top: number; max: number } | null>(null);
  // Past rounds the reviewer has opened by hand, keyed by page.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const hovered = useRef(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const activePage = useActivePage(config, pathname);

  // On the slate ("/") the rail is pinned permanently open — it is the only
  // navigation on that page. Everywhere else it rests as a slim strip, expands
  // on hover, and collapses when you click away. It does NOT open itself on
  // load or refresh: a panel that opens over the design on every page load is
  // in the way of the thing being reviewed.
  const forceOpen = pathname === "/";
  const isOpen = open || forceOpen;

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // THE RAIL IS ANCHORED, NOT CENTRED — and this is the fix for clicks that did
  // nothing. Flex-centring means a panel that grows grows in BOTH directions, so
  // the moment you pointed at the rail and it opened, every row jumped upward
  // (~130px on a five-round config) and then kept moving while the sub-rows
  // animated. You aimed at a row and clicked a different one, or the gap between
  // two. So: measure the collapsed height, pin the panel at the position that
  // height would have been centred at, and let it grow downward only. Nothing
  // the reviewer is already pointing at ever moves.
  //
  // Measured while collapsed and visible (the rail is display:none under 821px),
  // and re-measured on resize. The old version locked a MIN-height and measured
  // on the way down from open, catching the still-expanded layout — which is why
  // a rail that loaded short came back tall after one open and close.
  useLayoutEffect(() => {
    const measure = () => {
      const el = panelRef.current;
      if (!el || isOpen) return;
      const h = el.offsetHeight;
      if (h <= 0) return;
      const vh = window.innerHeight;
      const top = Math.max(12, Math.min((vh - h) / 2, vh - 12 - h));
      setGeom({ top, max: Math.max(160, vh - top - 12) });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [isOpen]);

  // Clicking outside collapses the rail (not on the slate, where it stays open).
  useEffect(() => {
    if (!open || forceOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Element | null;
      if (t && t.closest && t.closest(".nwc-rail")) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown, true);
    return () => document.removeEventListener("mousedown", onDown, true);
  }, [open, forceOpen]);

  const enter = () => { hovered.current = true; if (closeTimer.current) clearTimeout(closeTimer.current); setOpen(true); };
  const leave = () => { if (forceOpen) return; hovered.current = false; if (closeTimer.current) clearTimeout(closeTimer.current); closeTimer.current = setTimeout(() => { if (!hovered.current) setOpen(false); }, 180); };

  const version = config.slate?.version;

  return (
    <div data-nwc-ui>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* ---------- desktop rail ---------- */}
      <div className={`nwc-rail ${isOpen ? "open" : ""}`}>
        <div
          ref={panelRef}
          className="panel"
          onMouseEnter={enter}
          onMouseLeave={leave}
          /* Before the first measurement the flex centring puts the panel in
             exactly the place these values resolve to, so there is no jump. */
          style={geom ? { alignSelf: "flex-start", marginTop: geom.top, maxHeight: geom.max } : undefined}
        >
         <div className="r-inner">
          {/* whole header is the "back to start" target */}
          <Link href="/" aria-label="Back to start" className="r-head">
            <span className="r-logo">
              <img src={logo} alt={config.brand.name} />
            </span>
            <span className="r-meta">
              <span className="r-name">{config.brand.name}</span>
              <span className="r-status">{[config.slate?.status, version].filter(Boolean).join(" · ")}</span>
            </span>
          </Link>

          <div className="r-scroll">
            <div className="r-groups">
            {config.pages.map((page, i) => {
              const isActive = isPageActive(page, pathname);
              const kids = railChildren(page);
              const multiOpt = (page.options?.length ?? 0) > 1;
              const hasSub = kids.length > 0 || multiOpt;
              // With bar.rounds on, everything below the first page is a past
              // round: dimmed, and collapsed until the reviewer opens it. The
              // current round is not collapsible — it is what they came for.
              const past = rounds && i > 0;
              const collapsible = past && hasSub;
              // A past round you are currently INSIDE opens by default, but the
              // caret still works — otherwise it is a control that does nothing.
              const expanded = hasSub && (!collapsible || (openGroups[page.key] ?? isActive));
              const icon = page.label.slice(0, 1).toUpperCase();

              const rowInner = (
                <>
                  <span className="r-ic">{icon}</span>
                  <span className="r-body">
                    <span className="r-lbl">{page.label}</span>
                    <StatusRow status={page.status} />
                  </span>
                  {collapsible && (
                    <span className={`r-caret ${expanded ? "open" : ""}`} aria-hidden>
                      <svg width="9" height="6" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" /></svg>
                    </span>
                  )}
                </>
              );

              const groupClass = `r-group ${isActive ? "active " : ""}${past && !isActive ? "past " : ""}${expanded ? "expanded" : ""}`;

              return (
                // A section with sub-rows is a HEADER, not a link: a dropdown
                // should behave like a dropdown, and its own landing page is the
                // first sub-row (see railChildren). A page with nothing under it
                // is still a plain link.
                <div key={page.key} className={groupClass}>
                  {!hasSub ? (
                    <Link href={pageHref(page)} className="r-item">{rowInner}</Link>
                  ) : collapsible ? (
                    <button
                      type="button"
                      className="r-item"
                      aria-expanded={expanded}
                      onClick={() => setOpenGroups((g) => ({ ...g, [page.key]: !expanded }))}
                    >
                      {rowInner}
                    </button>
                  ) : (
                    <div className="r-item">{rowInner}</div>
                  )}

                  {kids.length > 0 && (
                    <div className="r-sub">
                      {kids.map((c, ci) => <RailChild key={ci} child={c} depth={1} pathname={pathname} />)}
                    </div>
                  )}
                  {!kids.length && multiOpt && (
                    <div className="r-sub">
                      {page.options!.map((opt) => {
                        const href = `${page.basePath}/${opt.slug}`;
                        const optActive = pathname === href;
                        return (
                          <Link key={opt.slug} href={href} className={`r-opt ${optActive ? "active" : ""}`}>
                            <span className="r-tick">{optActive ? "✓" : ""}</span>
                            <span className="r-opt-t">{opt.label}{opt.descriptor && <span className="r-desc"> · {opt.descriptor}</span>}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            </div>
          </div>
         </div>

          <div className="r-foot">
            <button
              className="r-comment"
              onClick={toggleComments}
              style={{ background: ACCENT, boxShadow: commentsOn ? "0 0 0 2px rgba(255,255,255,0.55)" : undefined }}
            >
              <span className="r-cic"><CommentIcon /></span>
              <span className="r-clbl">{commentsOn ? "Commenting on" : "Comment"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ---------- mobile (docked bottom-right) ---------- */}
      <div className="nwc-bar pos-side">
        <div className="m-wrap">
          <div className="m-shell">
            <div className="m-bar">
              <Link href="/" aria-label="Back to start" className="m-logo">
                <img src={logo} alt={config.brand.name} />
              </Link>
              <div className="m-actions">
                <button onClick={() => { toggleComments(); setMobileOpen(false); }} className="m-comment" style={{ background: ACCENT, boxShadow: commentsOn ? "0 0 0 2px rgba(255,255,255,0.6)" : undefined }}>
                  <CommentIcon />
                  Comment
                </button>
                <button onClick={() => setMobileOpen((v) => !v)} className="m-menu" aria-label={mobileOpen ? "Close menu" : "Open menu"} aria-expanded={mobileOpen}>
                  {mobileOpen ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                  )}
                </button>
              </div>
            </div>
            <MobileMenu config={config} activePage={activePage} pathname={pathname} ACCENT={ACCENT} mobileOpen={mobileOpen} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- shared mobile menu bits ---- */
function MobileMenu({ config, activePage, pathname, ACCENT, mobileOpen }: {
  config: ReviewConfig; activePage: ReviewPage | null; pathname: string; ACCENT: string; mobileOpen: boolean;
}) {
  return (
    <div className={`m-panel ${mobileOpen ? "" : "closed"}`}>
      {config.pages.map((page) => {
        const kids = page.children ?? [];
        const multiOpt = (page.options?.length ?? 0) > 1;
        if (kids.length) {
          return (
            <div key={page.key}>
              <Link href={pageHref(page)} className={`m-row ${isPageActive(page, pathname) ? "active" : ""}`}>{page.label}<span className="m-arrow">↗</span></Link>
              {kids.map((c, i) => <MobileChild key={i} child={c} depth={1} pathname={pathname} accent={ACCENT} />)}
            </div>
          );
        }
        if (!multiOpt) {
          const isActive = activePage?.key === page.key;
          return (
            <Link key={page.key} href={pageHref(page)} className={`m-row ${isActive ? "active" : ""}`}>
              {page.label}
              <span className="m-arrow">↗</span>
            </Link>
          );
        }
        return (
          <div key={page.key}>
            <div className="m-grouplabel">{page.label}</div>
            {page.options!.map((opt) => {
              const href = `${page.basePath}/${opt.slug}`;
              const optActive = pathname === href;
              return (
                <Link key={opt.slug} href={href} className={`m-row ${optActive ? "active" : ""}`}>
                  <span className="m-tick" style={{ color: ACCENT }}>{optActive ? "✓" : ""}</span>
                  <span>{opt.label}</span>
                  {opt.descriptor && <span className="m-desc">{opt.descriptor}</span>}
                </Link>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function MobilePanel({ config, activePage, pathname, commentsOn, toggleComments, mobileOpen, setMobileOpen, logo, ACCENT }: {
  config: ReviewConfig; activePage: ReviewPage | null; pathname: string; commentsOn: boolean;
  toggleComments: () => void; mobileOpen: boolean; setMobileOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  logo: string; ACCENT: string;
}) {
  return (
    <div className="m-wrap">
      <div className="m-bar">
        <Link href="/" aria-label="Back to start" className="m-logo">
          <img src={logo} alt={config.brand.name} />
        </Link>
        <div className="m-actions">
          <button onClick={() => { toggleComments(); setMobileOpen(false); }} className="m-comment" style={{ background: ACCENT, boxShadow: commentsOn ? "0 0 0 2px rgba(255,255,255,0.6)" : undefined }}>
            <CommentIcon />
            Comment
          </button>
          <button onClick={() => setMobileOpen((v) => !v)} className="m-menu" aria-label={mobileOpen ? "Close menu" : "Open menu"} aria-expanded={mobileOpen}>
            {mobileOpen ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            )}
          </button>
        </div>
      </div>
      <MobileMenu config={config} activePage={activePage} pathname={pathname} ACCENT={ACCENT} mobileOpen={mobileOpen} />
    </div>
  );
}
