"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useReviewKit } from "./FeedbackProvider";
import { NWC_LOGO } from "./logo";

/*
  Client review nav bar. Self-styled (injected CSS, no host Tailwind needed)
  and fully responsive.

  Desktop (>820px): full-width dark bar that morphs into a floating glass
  pill on scroll. Logo sits in the corner and slides into the pill; the
  Comment button mirrors it on the right.

  Mobile (<=820px): a solid dark bar with the logo, a Comment button and a
  menu button. The menu opens a slide-down panel listing every page and its
  design options. (Horizontal tabs don't fit narrow screens.)
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

/* ---------- desktop ---------- */
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

/* ---------- mobile ---------- */
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

@media(max-width:820px){
  .nwc-bar .d-wrap{display:none}
  .nwc-bar .m-wrap{display:block}
}
@media(prefers-reduced-motion:reduce){.nwc-bar .bg,.nwc-bar .pill,.nwc-bar .logo,.nwc-bar .proto,.nwc-bar .comment,.nwc-bar .menu,.nwc-bar .m-panel{transition:none}}
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

export default function ReviewBar() {
  const { config, enabled: commentsOn, toggle: toggleComments } = useReviewKit();
  const ACCENT = config.brand.accent;
  const logo = config.brand.logo || NWC_LOGO;
  const pathname = usePathname();
  const barRef = useRef<HTMLDivElement>(null);
  const [openTab, setOpenTab] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openNow = (key: string) => { if (closeTimer.current) clearTimeout(closeTimer.current); setOpenTab(key); };
  const closeSoon = () => { if (closeTimer.current) clearTimeout(closeTimer.current); closeTimer.current = setTimeout(() => setOpenTab(null), 160); };

  const activePage = config.pages
    .filter((p) => pathname === p.basePath || pathname.startsWith(p.basePath + "/"))
    .sort((a, b) => b.basePath.length - a.basePath.length)[0] ?? null;

  // close the mobile menu whenever the route changes
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    const el = barRef.current;
    if (el) document.documentElement.style.setProperty("--rev-h", `${el.offsetHeight}px`);
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
    <div ref={barRef} data-nwc-ui className="nwc-bar">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="inner">

        {/* ===================== DESKTOP ===================== */}
        <div className="d-wrap">
          <div
            className="bg"
            style={{ background: BAR_BG, opacity: scrolled ? 0 : 1, pointerEvents: scrolled ? "none" : "auto", boxShadow: scrolled ? undefined : "0 1px 0 rgba(255,255,255,0.07), 0 10px 30px -18px rgba(0,0,0,0.7)" }}
          />
          <div className="row">
            <nav
              className="pill"
              style={{ width: "100%", maxWidth: scrolled ? 540 : 1280, background: scrolled ? "rgba(13,13,15,0.6)" : "transparent", borderColor: scrolled ? "rgba(255,255,255,0.1)" : "transparent", backdropFilter: scrolled ? "blur(10px)" : undefined, WebkitBackdropFilter: scrolled ? "blur(10px)" : undefined, boxShadow: scrolled ? "0 8px 30px -8px rgba(0,0,0,0.6)" : undefined, borderRadius: scrolled ? 999 : 0 }}
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

        {/* ===================== MOBILE ===================== */}
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
        </div>

      </div>
    </div>
  );
}
