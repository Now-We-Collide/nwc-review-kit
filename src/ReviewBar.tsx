"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useReviewKit } from "./FeedbackProvider";
import { resolveLogo } from "./logo";
import type { ReviewConfig, ReviewPage } from "./config";

/*
  Client review nav. Self-styled (injected CSS, no host Tailwind needed) and
  fully responsive. Two placements, chosen via config.bar.position:

  "top" (default) — a full-width dark bar that morphs into a floating glass
  pill on scroll. Best early on, before the client's site has its own nav.
  With config.bar.autoHide (default true) it slides away on scroll-down and
  returns on scroll-up or when the pointer nears the top of the screen.

  "side" — a slim rail pinned to the right edge that expands on hover/click.
  Use it once the site has its own nav so there aren't two competing top bars.
  It peeks open once on load (so it's discoverable), then rests as a slim
  strip; expanded it has room for per-page copy status and the dev round.

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
.nwc-rail .panel{pointer-events:auto;position:relative;margin-right:12px;display:flex;flex-direction:column;max-height:calc(100vh - 24px);width:56px;overflow:hidden;background:rgba(13,13,15,.82);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.1);border-radius:16px;box-shadow:0 20px 50px -18px rgba(0,0,0,.75);transition:width .28s ease}
.nwc-rail.open .panel{width:300px}
/* content is a fixed width so it lays out at the final size from the start; the
   panel just clips it while the width animates (no text reflow mid-animation) */
.nwc-rail .r-inner{width:300px;flex:1 1 auto;min-height:0;display:flex;flex-direction:column}
.nwc-rail .r-head{display:flex;align-items:center;gap:10px;padding:14px 12px;min-height:56px;border-radius:12px;cursor:pointer}
.nwc-rail .r-head:hover .r-name{color:#fff}
.nwc-rail .r-logo{flex:0 0 auto;display:flex;align-items:center;justify-content:center;width:32px}
.nwc-rail .r-logo img{height:18px;width:auto;display:block}
.nwc-rail .r-meta{display:flex;flex-direction:column;min-width:0;overflow:hidden;white-space:nowrap;opacity:0;transition:opacity .2s}
.nwc-rail.open .r-meta{opacity:1}
.nwc-rail .r-meta .r-name{font-size:12.5px;font-weight:700;color:rgba(255,255,255,.92);transition:color .15s}
.nwc-rail .r-meta .r-status{font-size:11px;color:rgba(255,255,255,.5)}
.nwc-rail .r-scroll{flex:1 1 auto;min-height:0;overflow-y:auto;overflow-x:hidden;padding:4px 8px 0}
/* fills the scroll area so pages spread across any spare height (space-between);
   when content overflows, min-height:100% lets it grow and scroll from the top */
.nwc-rail .r-groups{min-height:100%;display:flex;flex-direction:column;justify-content:space-between}
.nwc-rail .r-item{display:flex;align-items:center;gap:12px;padding:9px 8px;border-radius:10px;cursor:pointer;transition:background-color .15s}
.nwc-rail .r-group:hover .r-item{background:rgba(255,255,255,.07)}
.nwc-rail .r-group.active .r-item{background:rgba(255,255,255,.08)}
.nwc-rail .r-ic{flex:0 0 auto;display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:7px;background:rgba(255,255,255,.08);color:#fff;font-size:12px;font-weight:700}
.nwc-rail .r-group.active .r-ic{background:rgba(255,255,255,.18)}
.nwc-rail .r-body{display:flex;flex-direction:column;flex:1;min-width:0;overflow:hidden;white-space:nowrap;opacity:0;transition:opacity .2s}
.nwc-rail.open .r-body{opacity:1}
.nwc-rail .r-lbl{font-size:13.5px;font-weight:600;color:#fff}
.nwc-rail .r-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}
.nwc-rail .r-chip{font-size:10px;font-weight:600;padding:1px 7px;border-radius:999px;line-height:1.6}
.nwc-rail .r-caret{margin-left:auto;flex:0 0 auto;opacity:.5;transition:transform .2s}
.nwc-rail .r-caret.open{transform:rotate(180deg)}
.nwc-rail .r-sub{overflow:hidden;max-height:0;transition:max-height .25s ease}
.nwc-rail.open .r-sub.open{max-height:300px}
.nwc-rail .r-opt{display:flex;align-items:center;gap:8px;padding:8px 8px 8px 44px;border-radius:9px;font-size:12.5px;color:rgba(255,255,255,.75);cursor:pointer;transition:background-color .15s}
.nwc-rail .r-opt:hover{background:rgba(255,255,255,.06)}
.nwc-rail .r-opt.active{background:rgba(255,255,255,.08);color:#fff}
.nwc-rail .r-opt .r-tick{width:12px;flex:0 0 auto;color:rgba(255,255,255,.9)}
.nwc-rail .r-opt .r-desc{color:rgba(255,255,255,.45)}
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

// tone -> chip colours, matching the slate's good/warn/todo palette.
// We keep these to plain status colours (green/amber/grey) and reserve the
// brand accent almost entirely for the Comment button.
const TONE_CHIP: Record<string, { bg: string; fg: string }> = {
  good: { bg: "rgba(74,222,128,.15)", fg: "#86efac" },
  warn: { bg: "rgba(251,191,36,.15)", fg: "#fcd34d" },
  todo: { bg: "rgba(255,255,255,.1)", fg: "rgba(255,255,255,.7)" },
};

function useActivePage(config: ReviewConfig, pathname: string): ReviewPage | null {
  return (
    config.pages
      .filter((p) => pathname === p.basePath || pathname.startsWith(p.basePath + "/"))
      .sort((a, b) => b.basePath.length - a.basePath.length)[0] ?? null
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
                  const isActive = activePage?.key === page.key;
                  const multi = page.options.length > 1;
                  const directHref = page.href ?? `${page.basePath}/${page.options[0].slug}`;
                  const open = openTab === page.key;

                  if (!multi) {
                    return <Link key={page.key} href={directHref} className={`tab ${isActive ? "active" : ""}`}>{page.label}</Link>;
                  }

                  return (
                    <div key={page.key} style={{ position: "relative" }} onMouseEnter={() => openNow(page.key)} onMouseLeave={closeSoon}>
                      <Link href={directHref} className={`tab ${isActive ? "active" : ""}`}>{page.label}<Caret open={open} /></Link>
                      <div className={`menu ${open ? "" : "closed"}`}>
                        <div className="menu-inner" style={{ background: DROP_BG }}>
                          {page.options.map((opt) => {
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
  const logo = resolveLogo(config.brand.logo);
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  // Which pages have their options expanded. Independent per page (several can
  // be open at once) so switching pages doesn't animate one shut while another
  // opens, which read as jitter.
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [lockH, setLockH] = useState<number | null>(null);
  const hovered = useRef(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const activePage = useActivePage(config, pathname);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Collapsing the rail resets which options are open — it's not a saved state,
  // so re-opening the rail shows just the page names again.
  useEffect(() => { if (!open) setExpanded(new Set()); }, [open]);

  // Lock the panel to its collapsed height so it doesn't jitter when it expands;
  // expanded content then flexes/scrolls within that same height. Measure while
  // collapsed and visible (the rail is display:none under 821px), and re-measure
  // on resize so a 0-height measurement while hidden never sticks.
  useLayoutEffect(() => {
    const measure = () => {
      const el = panelRef.current;
      if (el && !open) { const h = el.offsetHeight; if (h > 0) setLockH(h); }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [open]);

  // Clicking a page name toggles its options open/closed and never navigates.
  // Navigation happens only when an option is clicked. Single-option pages have
  // no submenu, so they navigate directly.
  const onRow = (page: ReviewPage) => {
    if (page.options.length <= 1) { router.push(page.href ?? `${page.basePath}/${page.options[0].slug}`); return; }
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(page.key)) next.delete(page.key); else next.add(page.key);
      return next;
    });
  };

  // Peek open once on mount so a first-time reviewer sees where the rail lives,
  // then ease it closed (unless they're already hovering it). Skip under
  // reduced-motion.
  useEffect(() => {
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const t1 = setTimeout(() => setOpen(true), 350);
    const t2 = setTimeout(() => { if (!hovered.current) setOpen(false); }, 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Clicking anywhere outside the rail collapses it back to the slim strip.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Element | null;
      if (t && t.closest && t.closest(".nwc-rail")) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown, true);
    return () => document.removeEventListener("mousedown", onDown, true);
  }, [open]);

  const enter = () => { hovered.current = true; if (closeTimer.current) clearTimeout(closeTimer.current); setOpen(true); };
  const leave = () => { hovered.current = false; if (closeTimer.current) clearTimeout(closeTimer.current); closeTimer.current = setTimeout(() => { if (!hovered.current) setOpen(false); }, 180); };

  const version = config.slate?.version;

  return (
    <div data-nwc-ui>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* ---------- desktop rail ---------- */}
      <div className={`nwc-rail ${open ? "open" : ""}`}>
        <div ref={panelRef} className="panel" onMouseEnter={enter} onMouseLeave={leave} style={lockH ? { minHeight: lockH } : undefined}>
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
            {config.pages.map((page) => {
              const isActive = activePage?.key === page.key;
              const multi = page.options.length > 1;
              const subOpen = expanded.has(page.key);
              const design = page.status?.design;
              const copy = page.status?.copy;
              const icon = page.label.slice(0, 1).toUpperCase();

              return (
                // Clicking the row opens this page's options; clicking it again
                // (once open) navigates to Option 1. Options navigate directly.
                <div key={page.key} className={`r-group ${isActive ? "active" : ""}`}>
                  <div className="r-item" role="button" tabIndex={0} onClick={() => onRow(page)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onRow(page); } }}>
                    <span className="r-ic">{icon}</span>
                    <span className="r-body">
                      <span className="r-lbl">{page.label}</span>
                      {(design || copy) && (
                        <span className="r-chips">
                          {design && <span className="r-chip" style={{ background: TONE_CHIP[design.tone].bg, color: TONE_CHIP[design.tone].fg }}>{design.label}</span>}
                          {copy && <span className="r-chip" style={{ background: TONE_CHIP[copy.tone].bg, color: TONE_CHIP[copy.tone].fg }}>{copy.label}</span>}
                        </span>
                      )}
                    </span>
                    {multi && <span className={`r-caret ${subOpen ? "open" : ""}`}><Caret open={subOpen} /></span>}
                  </div>

                  {multi && (
                    <div className={`r-sub ${subOpen ? "open" : ""}`}>
                      {page.options.map((opt) => {
                        const href = `${page.basePath}/${opt.slug}`;
                        const optActive = pathname === href;
                        return (
                          <Link key={opt.slug} href={href} className={`r-opt ${optActive ? "active" : ""}`}>
                            <span className="r-tick">{optActive ? "✓" : ""}</span>
                            <span>{opt.label}</span>
                            {opt.descriptor && <span className="r-desc">· {opt.descriptor}</span>}
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
        const multi = page.options.length > 1;
        if (!multi) {
          const href = page.href ?? `${page.basePath}/${page.options[0].slug}`;
          const isActive = activePage?.key === page.key;
          return (
            <Link key={page.key} href={href} className={`m-row ${isActive ? "active" : ""}`}>
              {page.label}
              <span className="m-arrow">↗</span>
            </Link>
          );
        }
        return (
          <div key={page.key}>
            <div className="m-grouplabel">{page.label}</div>
            {page.options.map((opt) => {
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
