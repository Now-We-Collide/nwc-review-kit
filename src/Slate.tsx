"use client";

import Link from "next/link";
import { useReviewKit } from "./FeedbackProvider";
import type { Tone } from "./config";
import { NWC_LOGO } from "./logo";

/*
  The "clapperboard" slate. Self-styled via an injected <style> block
  (no dependency on the host app's Tailwind), so it renders correctly
  on any site. Render from the consumer's "/" route, inside
  <ReviewKitProvider>.
*/

const toneColor: Record<Tone, string> = { good: "#4ade80", warn: "#fbbf24", todo: "#9aa0ad" };

const CSS = `
.nwc-slate{position:relative;min-height:calc(100vh - 56px);overflow:hidden;background:#0d0d0f;color:#fff;font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
.nwc-slate *{box-sizing:border-box}
.nwc-slate a{text-decoration:none;color:inherit}
.nwc-slate .vignette{position:absolute;inset:0;pointer-events:none;background:radial-gradient(120% 90% at 50% -10%,rgba(255,255,255,.05),transparent 60%)}
.nwc-slate .wrap{position:relative;margin:0 auto;max-width:64rem;display:flex;min-height:calc(100vh - 56px);flex-direction:column;justify-content:center;padding:96px 24px}
.nwc-slate .logo{height:112px;width:auto;display:block}
.nwc-slate .logo-wrap{align-self:flex-start;margin-bottom:56px}
.nwc-slate .dash{margin-top:16px;font-size:24px;font-weight:700;text-transform:uppercase;letter-spacing:.14em;color:rgba(255,255,255,.6)}
.nwc-slate .grid{display:grid;gap:56px;align-items:center}
@media(min-width:1024px){.nwc-slate .grid{grid-template-columns:1.05fr .95fr}}
.nwc-slate .left{max-width:28rem}
.nwc-slate .project{font-family:ui-monospace,monospace;font-size:25px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:rgba(255,255,255,.62)}
.nwc-slate h1{margin:6px 0 0;font-size:clamp(34px,5vw,48px);font-weight:800;line-height:1.05;letter-spacing:-.02em}
.nwc-slate .breakout{margin-top:20px;display:inline-flex;flex-wrap:wrap;align-items:center;gap:4px 12px;border-radius:999px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);padding:8px 16px;font-size:12.5px;color:rgba(255,255,255,.6)}
.nwc-slate .breakout .sep{color:rgba(255,255,255,.2)}
.nwc-slate .breakout .status{font-weight:600}
.nwc-slate .cta-row{margin-top:36px}
.nwc-slate .cta{display:inline-flex;align-items:center;gap:8px;border-radius:999px;padding:14px 28px;font-size:15px;font-weight:700;color:#06222a;transition:transform .2s var(--ease,ease)}
.nwc-slate .cta:hover{transform:scale(1.03)}
.nwc-slate .panel{width:100%;border-radius:16px;border:1px solid rgba(255,255,255,.1);background:#16161a;padding:12px}
.nwc-slate .panel-h{padding:4px 8px 8px;font-family:ui-monospace,monospace;font-size:10px;text-transform:uppercase;letter-spacing:.18em;color:rgba(255,255,255,.4)}
.nwc-slate .row{display:block;border-radius:8px;padding:10px 12px;transition:background .15s}
.nwc-slate .row:hover{background:rgba(255,255,255,.1)}
.nwc-slate .row-top{display:flex;align-items:center;justify-content:space-between}
.nwc-slate .row-label{font-size:14px;font-weight:500;color:rgba(255,255,255,.9)}
.nwc-slate .row:hover .row-label{color:#fff}
.nwc-slate .chips{margin-top:6px;display:flex;flex-wrap:wrap;gap:4px 16px}
.nwc-slate .chip{display:inline-flex;align-items:center;gap:6px;font-size:11px;color:rgba(255,255,255,.55)}
.nwc-slate .dot{width:6px;height:6px;border-radius:50%}
.nwc-slate .callouts{display:none}
.nwc-slate .callout{position:absolute;width:210px;border-radius:8px;background:#fff;padding:8px 12px;font-size:12px;font-weight:500;line-height:1.35;color:#1a1d24;box-shadow:0 10px 30px -10px rgba(0,0,0,.5)}
.nwc-slate .callout .arrow{position:absolute;top:-6px;left:50%;width:12px;height:12px;transform:translateX(-50%) rotate(45deg);background:#fff}
@media(min-width:1024px){.nwc-slate .callouts{display:block;position:absolute;left:0;right:0;top:12px;z-index:10;margin:0 auto;max-width:80rem;padding:0 20px;pointer-events:none;height:0}
.nwc-slate .callout.c-center{left:50%;transform:translateX(-50%)}
.nwc-slate .callout.c-right{right:20px}}
.nwc-slate .disclaimer{position:absolute;left:0;right:0;bottom:20px;text-align:center;font-size:11px;text-transform:uppercase;letter-spacing:.18em;color:rgba(255,255,255,.25)}
`;

export default function Slate() {
  const { config } = useReviewKit();
  const { brand, slate, pages } = config;
  const ACCENT = brand.accent;
  const logo = brand.logo || NWC_LOGO;

  return (
    <main className="nwc-slate">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="vignette" />

      <div className="callouts">
        <div className="callout c-center"><span className="arrow" />Use these tabs to move between pages and compare design options.</div>
        <div className="callout c-right"><span className="arrow" />Leave feedback with the Comment button.</div>
      </div>

      <div className="wrap">
        <div className="logo-wrap">
          <img className="logo" src={logo} alt={brand.name} />
          <div className="dash">{slate.dashboardLabel}</div>
        </div>

        <div className="grid">
          <div className="left">
            <div className="project">Project</div>
            <h1>{slate.title}</h1>
            <div className="breakout">
              <span>for {slate.client}</span>
              <span className="sep">·</span>
              <span>{slate.version}</span>
              <span className="sep">·</span>
              <span className="status" style={{ color: ACCENT }}>{slate.status}</span>
            </div>
            <div className="cta-row">
              <Link className="cta" style={{ background: ACCENT }} href={pages[0]?.href ?? `${pages[0]?.basePath}/${pages[0]?.options[0]?.slug ?? ""}`}>
                View the prototype <span aria-hidden>→</span>
              </Link>
            </div>
          </div>

          <div className="panel">
            <div className="panel-h">Pages</div>
            {pages.map((page) => {
              const href = page.href ?? `${page.basePath}/${page.options[0].slug}`;
              return (
                <Link key={page.key} className="row" href={href}>
                  <div className="row-top">
                    <span className="row-label">{page.label}</span>
                    <span style={{ color: ACCENT }}>↗</span>
                  </div>
                  {(page.status?.design || page.status?.copy) && (
                    <div className="chips">
                      {page.status?.design && (
                        <span className="chip"><span className="dot" style={{ background: toneColor[page.status.design.tone] }} />{page.status.design.label}</span>
                      )}
                      {page.status?.copy && (
                        <span className="chip"><span className="dot" style={{ background: toneColor[page.status.copy.tone] }} />{page.status.copy.label}</span>
                      )}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="disclaimer">Confidential draft · not for distribution</div>
    </main>
  );
}
