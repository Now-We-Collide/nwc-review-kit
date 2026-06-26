import Link from "next/link";
import { reviewConfig, type Tone } from "./config";

/*
  The "clapperboard" slate: a dark, branded gateway that makes the
  draft status unmissable. Render this from your app's "/" route.
*/

const ACCENT = reviewConfig.brand.accent;
const toneColor: Record<Tone, string> = { good: "#4ade80", warn: "#fbbf24", todo: "#9aa0ad" };

function StatusChip({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-white/55">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: toneColor[tone] }} />
      {children}
    </span>
  );
}

function Callout({ text, className }: { text: string; className: string }) {
  return (
    <div className={`absolute w-[210px] rounded-lg bg-white px-3 py-2 text-[12px] font-medium leading-snug text-[#1a1d24] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] ${className}`}>
      <span className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-white" />
      {text}
    </div>
  );
}

export default function Slate() {
  const { brand, slate, pages } = reviewConfig;
  return (
    <main className="relative min-h-[calc(100vh-56px)] overflow-hidden bg-[#0d0d0f] text-white">
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(120% 90% at 50% -10%, rgba(255,255,255,0.05), transparent 60%)" }} />

      <div className="pointer-events-none absolute inset-x-0 top-3 z-10 mx-auto hidden max-w-7xl px-5 lg:block">
        <Callout text="Use these tabs to move between pages and compare design options." className="left-1/2 -translate-x-1/2" />
        <Callout text="Leave feedback with the Comment button." className="right-4" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-56px)] max-w-5xl flex-col justify-center px-6 py-24">
        <div className="mb-14 self-start">
          <img src={brand.logo} alt={brand.name} className="h-28 w-auto" />
          <div className="mt-3 text-[12px] font-semibold uppercase tracking-[0.22em] text-white/45">{slate.dashboardLabel}</div>
        </div>

        <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="max-w-md">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">Project</div>
            <h1 className="mt-1.5 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">{slate.title}</h1>

            <div className="mt-5 inline-flex flex-wrap items-center gap-x-3 gap-y-1 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[12.5px] text-white/60">
              <span>for {slate.client}</span>
              <span className="text-white/20">·</span>
              <span>{slate.version}</span>
              <span className="text-white/20">·</span>
              <span className="font-semibold" style={{ color: ACCENT }}>{slate.status}</span>
            </div>

            <div className="mt-9">
              <Link href={pages[0]?.href ?? `${pages[0]?.basePath}/${pages[0]?.options[0]?.slug ?? ""}`} className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-[15px] font-bold text-[#06222a] transition-transform hover:scale-[1.03]" style={{ background: ACCENT }}>
                View the prototype <span aria-hidden>→</span>
              </Link>
            </div>
          </div>

          <div className="w-full rounded-2xl border border-white/10 bg-[#16161a] p-3">
            <div className="px-2 pb-2 pt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">Pages</div>
            <div className="space-y-0.5">
              {pages.map((page) => {
                const href = page.href ?? `${page.basePath}/${page.options[0].slug}`;
                return (
                  <Link key={page.key} href={href} className="group block rounded-lg px-3 py-2.5 transition-colors hover:bg-white/10">
                    <div className="flex items-center justify-between">
                      <span className="text-[14px] font-medium text-white/90 group-hover:text-white">{page.label}</span>
                      <span className="transition-transform group-hover:translate-x-0.5" style={{ color: ACCENT }}>↗</span>
                    </div>
                    {(page.status?.design || page.status?.copy) && (
                      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                        {page.status?.design && <StatusChip tone={page.status.design.tone}>{page.status.design.label}</StatusChip>}
                        {page.status?.copy && <StatusChip tone={page.status.copy.tone}>{page.status.copy.label}</StatusChip>}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <p className="absolute inset-x-0 bottom-5 text-center text-[11px] uppercase tracking-[0.18em] text-white/25">Confidential draft · not for distribution</p>
    </main>
  );
}
