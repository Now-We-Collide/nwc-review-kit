"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { fetchComments, createComment, setStatus, type Anchor, type Comment, type DbConfig } from "./comments";
import { useReviewKit } from "./FeedbackProvider";

/*
  In-page commenting overlay. Reads config + on/off state from context.
  While on, a click anywhere on the page (not on review UI) drops an
  element-anchored comment. Resolved comments are kept (status='resolved').
*/

const ACCENT_INK = "#06222a";
const ACCENT_TEXT = "#0b7d92";
const PANEL_BG = "#0d0d0f";
const Z = 2147483000;

function cssPath(start: Element): string | null {
  let el: Element | null = start;
  const parts: string[] = [];
  while (el && el.nodeType === 1 && el !== document.body && parts.length < 7) {
    let part = el.tagName.toLowerCase();
    if (el.id) { part += `#${CSS.escape(el.id)}`; parts.unshift(part); return parts.join(">"); }
    const parent: Element | null = el.parentElement;
    if (parent) {
      const sibs = Array.from(parent.children).filter((c) => c.tagName === el!.tagName);
      if (sibs.length > 1) part += `:nth-of-type(${sibs.indexOf(el) + 1})`;
    }
    parts.unshift(part);
    el = el.parentElement;
  }
  return parts.length ? parts.join(">") : null;
}

function deviceLabel(w: number): string {
  return w < 768 ? "mobile" : w < 1024 ? "tablet" : "desktop";
}

function buildAnchor(target: Element, clientX: number, clientY: number): Anchor {
  const r = target.getBoundingClientRect();
  const doc = document.documentElement;
  return {
    sel: cssPath(target),
    ox: r.width ? (clientX - r.left) / r.width : 0.5,
    oy: r.height ? (clientY - r.top) / r.height : 0.5,
    px: (clientX + window.scrollX) / Math.max(doc.scrollWidth, 1),
    py: (clientY + window.scrollY) / Math.max(doc.scrollHeight, 1),
    device: deviceLabel(window.innerWidth),
  };
}

function resolvePos(a: Anchor): { x: number; y: number } {
  if (a.sel) {
    const el = document.querySelector(a.sel);
    if (el) { const r = el.getBoundingClientRect(); return { x: r.left + window.scrollX + a.ox * r.width, y: r.top + window.scrollY + a.oy * r.height }; }
  }
  const doc = document.documentElement;
  return { x: a.px * doc.scrollWidth, y: a.py * doc.scrollHeight };
}

function stamp(c: Comment): string {
  const d = new Date(c.created_at);
  const p = (n: number) => String(n).padStart(2, "0");
  const date = `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}, ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  return c.anchor?.device ? `${date}, ${c.anchor.device}` : date;
}

type Draft = { x: number; y: number; anchor: Anchor };

export default function CommentLayer() {
  const { config, enabled } = useReviewKit();
  const ACCENT = config.brand.accent;
  const db: DbConfig = { supabaseUrl: config.supabaseUrl, supabaseAnonKey: config.supabaseAnonKey, projectId: config.projectId };

  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [tick, setTick] = useState(0);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => { if (typeof window !== "undefined") setName(localStorage.getItem("nwc_feedback_name") || ""); }, []);

  const load = useCallback(() => {
    fetchComments(db, pathname)
      .then((c) => { setComments(c.filter((x) => x.status !== "resolved")); setErr(null); })
      .catch((e) => setErr(`Could not load: ${(e as Error).message}`));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, config.supabaseUrl, config.supabaseAnonKey, config.projectId]);

  useEffect(() => { if (enabled) load(); else { setDraft(null); setOpenId(null); } }, [enabled, load]);

  useLayoutEffect(() => {
    if (!enabled) return;
    const onResize = () => setTick((t) => t + 1);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [enabled]);

  useEffect(() => {
    if (!openId) return;
    const onDown = (e: MouseEvent) => { const t = e.target as Element | null; if (t && t.closest("[data-nwc-pop]")) return; setOpenId(null); };
    document.addEventListener("mousedown", onDown, true);
    return () => document.removeEventListener("mousedown", onDown, true);
  }, [openId]);

  useEffect(() => {
    if (!enabled) return;
    document.body.style.cursor = draft || openId ? "" : "crosshair";
    const onClick = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (!target) return;
      if (target.closest("[data-nwc]") || target.closest("[data-nwc-ui]")) return;
      if (draft || openId) return;
      e.preventDefault();
      e.stopPropagation();
      const anchor = buildAnchor(target, e.clientX, e.clientY);
      setDraft({ x: e.clientX + window.scrollX, y: e.clientY + window.scrollY, anchor });
      setBodyText("");
    };
    window.addEventListener("click", onClick, true);
    return () => { document.body.style.cursor = ""; window.removeEventListener("click", onClick, true); };
  }, [enabled, draft, openId]);

  const save = async () => {
    if (!draft || !bodyText.trim() || !name.trim()) return;
    localStorage.setItem("nwc_feedback_name", name.trim());
    try {
      const c = await createComment(db, { pagePath: pathname, anchor: draft.anchor, author: name.trim(), body: bodyText.trim() });
      setComments((prev) => [...prev, c]);
      setDraft(null);
      setBodyText("");
    } catch (e) { setErr(`Could not save: ${(e as Error).message}`); }
  };

  const toggleResolved = async (c: Comment) => {
    const next = c.status === "open" ? "resolved" : "open";
    setComments((prev) => prev.map((x) => (x.id === c.id ? { ...x, status: next } : x)));
    try { await setStatus(db, c.id, next); } catch { setErr("Could not update."); }
  };

  if (!mounted || !enabled) return null;
  const openCount = comments.filter((c) => c.status === "open").length;
  void tick;

  return createPortal(
    <div data-nwc>
      {comments.map((c, i) => {
        const p = resolvePos(c.anchor);
        const resolved = c.status === "resolved";
        return (
          <button key={c.id} onClick={() => setOpenId(openId === c.id ? null : c.id)} title={c.body}
            style={{ position: "absolute", left: p.x, top: p.y, transform: "translate(-50%,-100%)", width: 28, height: 28, borderRadius: "50% 50% 50% 2px", border: "2px solid #fff", background: resolved ? "#7c8694" : ACCENT, color: resolved ? "#fff" : ACCENT_INK, fontSize: 12, fontWeight: 700, cursor: "pointer", zIndex: Z + 1, boxShadow: "0 2px 8px rgba(0,0,0,.35)", opacity: resolved ? 0.6 : 1 }}>
            {i + 1}
          </button>
        );
      })}

      {openId && (() => {
        const c = comments.find((x) => x.id === openId);
        if (!c) return null;
        const p = resolvePos(c.anchor);
        return (
          <div data-nwc-pop style={{ position: "absolute", left: p.x, top: p.y + 10, transform: "translateX(-50%)", width: "min(260px, calc(100vw - 24px))", background: "#fff", borderRadius: 10, boxShadow: "0 12px 40px rgba(0,0,0,.25)", zIndex: Z + 2, overflow: "hidden", fontFamily: "system-ui, sans-serif" }}>
            <button onClick={() => setOpenId(null)} aria-label="Close" style={{ position: "absolute", top: 8, right: 8, width: 22, height: 22, borderRadius: "50%", border: 0, background: "#f0f1f4", color: "#5b5d6e", fontSize: 14, lineHeight: "22px", cursor: "pointer", padding: 0 }}>×</button>
            <div style={{ padding: "12px 34px 12px 14px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#1a1d24" }}>{c.author}</div>
              <div style={{ fontSize: 11, color: "#8a8f99", marginBottom: 8 }}>{stamp(c)}</div>
              <div style={{ fontSize: 13, color: "#2a2e36", lineHeight: 1.5 }}>{c.body}</div>
            </div>
            <button onClick={() => toggleResolved(c)} style={{ width: "100%", padding: "10px", border: 0, borderTop: "1px solid #eee", background: c.status === "open" ? "#f6f7f9" : "#fff", color: c.status === "open" ? "#1a1d24" : ACCENT_TEXT, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
              {c.status === "open" ? "Resolve" : "Reopen"}
            </button>
          </div>
        );
      })()}

      {draft && (
        <div style={{ position: "absolute", left: draft.x, top: draft.y + 10, transform: "translateX(-50%)", width: "min(280px, calc(100vw - 24px))", background: "#fff", borderRadius: 10, boxShadow: "0 12px 40px rgba(0,0,0,.3)", zIndex: Z + 3, padding: 14, fontFamily: "system-ui, sans-serif" }}>
          <input value={name} onChange={(e) => setName(e.target.value)} autoFocus={!name.trim()} placeholder="Your name" style={{ width: "100%", marginBottom: 8, padding: "8px 10px", border: name.trim() ? "1px solid #d8dbe4" : `1px solid ${ACCENT}`, borderRadius: 8, fontSize: 13, boxSizing: "border-box" }} />
          <textarea value={bodyText} onChange={(e) => setBodyText(e.target.value)} autoFocus={!!name.trim()} placeholder="Leave a comment…" rows={3} style={{ width: "100%", padding: "8px 10px", border: "1px solid #d8dbe4", borderRadius: 8, fontSize: 13, resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }} />
          {!name.trim() && <div style={{ fontSize: 11, color: ACCENT_TEXT, marginTop: 6 }}>Add your name to enable Comment.</div>}
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button onClick={save} disabled={!bodyText.trim() || !name.trim()} style={{ flex: 1, padding: "9px", border: 0, borderRadius: 8, background: ACCENT, color: ACCENT_INK, fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: !bodyText.trim() || !name.trim() ? 0.5 : 1 }}>Comment</button>
            <button onClick={() => setDraft(null)} style={{ padding: "9px 12px", border: "1px solid #d8dbe4", borderRadius: 8, background: "#fff", color: "#5b5d6e", fontSize: 13, cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ position: "fixed", right: 16, bottom: 16, width: "min(300px, calc(100vw - 32px))", maxHeight: "60vh", display: "flex", flexDirection: "column", background: PANEL_BG, color: "#e7e9ee", borderRadius: 14, boxShadow: "0 20px 60px rgba(0,0,0,.45)", zIndex: Z + 4, overflow: "hidden", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,.1)", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: ACCENT }} />
          <strong style={{ fontSize: 13 }}>{config.brand.name} Feedback</strong>
          <span style={{ marginLeft: "auto", fontSize: 11, color: "#9aa0ad" }}>{openCount} open</span>
        </div>
        <div style={{ overflowY: "auto", padding: 8 }}>
          {err && <div style={{ fontSize: 12, color: "#ffb4a3", padding: 8 }}>{err}</div>}
          {comments.length === 0 && !err && <div style={{ fontSize: 12, color: "#9aa0ad", padding: 8 }}>No comments on this page yet.</div>}
          {comments.map((c, i) => (
            <button key={c.id} onClick={() => { setOpenId(c.id); window.scrollTo({ top: resolvePos(c.anchor).y - 140, behavior: "smooth" }); }} style={{ display: "block", width: "100%", textAlign: "left", background: "transparent", border: 0, borderRadius: 8, padding: 8, cursor: "pointer", color: "inherit" }}>
              <span style={{ display: "flex", gap: 8 }}>
                <span style={{ flexShrink: 0, width: 18, height: 18, borderRadius: "50%", background: c.status === "resolved" ? "#7c8694" : ACCENT, color: c.status === "resolved" ? "#fff" : ACCENT_INK, fontSize: 11, fontWeight: 700, display: "grid", placeItems: "center" }}>{i + 1}</span>
                <span style={{ fontSize: 12.5, lineHeight: 1.4, color: c.status === "resolved" ? "#9aa0ad" : "#e7e9ee", textDecoration: c.status === "resolved" ? "line-through" : "none" }}>
                  {c.body.length > 70 ? c.body.slice(0, 70) + "…" : c.body}
                  <span style={{ display: "block", color: "#9aa0ad", textDecoration: "none", marginTop: 2 }}>{c.author}</span>
                </span>
              </span>
            </button>
          ))}
        </div>
        <div style={{ padding: "11px 12px", borderTop: "1px solid rgba(255,255,255,.1)", fontSize: 12, color: "#9aa0ad", textAlign: "center" }}>
          Click anywhere on the page to add a comment.
        </div>
      </div>
    </div>,
    document.body
  );
}
