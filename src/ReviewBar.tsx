"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useReviewKit } from "./FeedbackProvider";

/*
  Client review nav bar. Reads config + feedback state from context.
  Full-width dark bar at the top; on scroll it morphs into a floating
  glass pill (logo mark + tabs). Comment button (accent) is far-right
  when expanded and a separate bubble beside the pill when scrolled.
*/

const BAR_BG = "#0d0d0f";
const DROP_BG = "#1a1a1f";

function Caret({ open }: { open: boolean }) {
  return (
    <svg width="9" height="6" viewBox="0 0 10 6" className={`ml-0.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`} style={{ opacity: 0.55 }}>
      <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export default function ReviewBar() {
  const { config, enabled: commentsOn, toggle: toggleComments } = useReviewKit();
  const ACCENT = config.brand.accent;
  const pathname = usePathname();
  const barRef = useRef<HTMLDivElement>(null);
  const [openTab, setOpenTab] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openNow = (key: string) => { if (closeTimer.current) clearTimeout(closeTimer.current); setOpenTab(key); };
  const closeSoon = () => { if (closeTimer.current) clearTimeout(closeTimer.current); closeTimer.current = setTimeout(() => setOpenTab(null), 160); };

  const activePage = config.pages
    .filter((p) => pathname === p.basePath || pathname.startsWith(p.basePath + "/"))
    .sort((a, b) => b.basePath.length - a.basePath.length)[0] ?? null;

  useEffect(() => {
    const el = barRef.current;
    if (el) document.documentElement.style.setProperty("--rev-h", `${el.offsetHeight}px`);
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const tabClass = (active: boolean) =>
    `relative flex items-center rounded-lg px-3.5 py-2 text-[13.5px] font-medium transition-colors duration-150 ${active ? "bg-white/10 text-white" : "text-white/65 hover:bg-white/10 hover:text-white"}`;

  return (
    <div ref={barRef} data-nwc-ui className="pointer-events-none sticky top-0 z-50">
      <div className="relative">
        <div className="absolute inset-0 transition-opacity duration-300 motion-reduce:transition-none" style={{ background: BAR_BG, opacity: scrolled ? 0 : 1, pointerEvents: scrolled ? "none" : "auto", boxShadow: scrolled ? undefined : "0 1px 0 rgba(255,255,255,0.07), 0 10px 30px -18px rgba(0,0,0,0.7)" }} />

        <div className="relative mx-auto flex min-h-14 max-w-7xl items-center justify-center px-5">
          <Link href="/" className={`absolute left-5 flex items-center gap-3 transition-all duration-300 motion-reduce:transition-none ${scrolled ? "pointer-events-none -translate-x-2 opacity-0" : "pointer-events-auto opacity-100"}`}>
            <img src={config.brand.logo} alt={config.brand.name} className="h-5 w-auto" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60">Prototype</span>
          </Link>

          <nav
            style={{ width: "100%", maxWidth: scrolled ? 540 : 1280, background: scrolled ? "rgba(13,13,15,0.6)" : "transparent", borderColor: scrolled ? "rgba(255,255,255,0.1)" : "transparent", backdropFilter: scrolled ? "blur(10px)" : undefined, WebkitBackdropFilter: scrolled ? "blur(10px)" : undefined, boxShadow: scrolled ? "0 8px 30px -8px rgba(0,0,0,0.6)" : undefined, borderRadius: scrolled ? 999 : 0 }}
            className="pointer-events-auto flex items-center justify-center gap-0.5 border px-2 py-1.5 transition-[max-width,background-color,border-color,border-radius] duration-300 ease-out motion-reduce:transition-none"
          >
            <Link href="/" aria-label="Back to start" className={`inline-flex items-center overflow-hidden transition-all duration-300 motion-reduce:transition-none ${scrolled ? "mr-1.5 ml-1 max-w-[40px] opacity-100 hover:opacity-80" : "pointer-events-none max-w-0 opacity-0"}`}>
              <img src={config.brand.logo} alt="" className="h-4 w-auto" />
            </Link>

            {config.pages.map((page) => {
              const isActive = activePage?.key === page.key;
              const multi = page.options.length > 1;
              const directHref = page.href ?? `${page.basePath}/${page.options[0].slug}`;
              const open = openTab === page.key;

              if (!multi) {
                return <Link key={page.key} href={directHref} className={tabClass(isActive)}>{page.label}</Link>;
              }

              return (
                <div key={page.key} className="relative" onMouseEnter={() => openNow(page.key)} onMouseLeave={closeSoon}>
                  <Link href={directHref} className={tabClass(isActive)}>{page.label}<Caret open={open} /></Link>
                  <div className={`absolute left-1/2 top-full z-50 -translate-x-1/2 pt-2 transition duration-150 ${open ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-1 opacity-0"}`}>
                    <div className="w-max min-w-[16rem] rounded-xl border border-white/10 p-1.5 shadow-2xl" style={{ background: DROP_BG }}>
                      {page.options.map((opt) => {
                        const href = `${page.basePath}/${opt.slug}`;
                        const optActive = pathname === href;
                        return (
                          <Link key={opt.slug} href={href} onClick={() => setOpenTab(null)} className={`flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2.5 text-[13.5px] transition-colors ${optActive ? "bg-white/10" : "hover:bg-white/[0.06]"}`}>
                            <span className="w-3.5 shrink-0" style={{ color: ACCENT }}>{optActive ? "✓" : ""}</span>
                            <span className="font-semibold text-white">{opt.label}</span>
                            {opt.descriptor && <span className="text-white/55">·</span>}
                            {opt.descriptor && <span className="text-white/75">{opt.descriptor}</span>}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </nav>

          <button
            onClick={toggleComments}
            style={{ background: ACCENT, color: "#06222a" }}
            className={`pointer-events-auto z-10 flex items-center gap-2 rounded-full px-4 text-[13.5px] font-semibold transition-[margin] duration-300 motion-reduce:transition-none ${scrolled ? "static ml-4 h-12 border border-white/10 shadow-[0_8px_30px_-8px_rgba(0,0,0,0.6)]" : "absolute right-5 py-1.5"} ${commentsOn ? "ring-2 ring-white/50" : "hover:brightness-110"}`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.6-.8L3 21l1.9-5.4A8.5 8.5 0 1 1 21 11.5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>
            Comment
          </button>
        </div>
      </div>
    </div>
  );
}
