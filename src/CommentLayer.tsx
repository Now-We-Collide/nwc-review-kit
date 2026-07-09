"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { fetchComments, createComment, updateComment, setStatus, type Anchor, type Comment, type DbConfig, type CommentTarget, type CommentContext } from "./comments";
import { useReviewKit } from "./FeedbackProvider";

/*
  In-page commenting overlay. Reads config + on/off state from context.
  While on, a click anywhere on the page (not on review UI) drops an
  element-anchored comment. Resolved comments are kept (status='resolved').

  Authorship is anonymous. Each browser gets a persistent random id
  (localStorage: nwc_client_id) that we never show as-is; instead the UI
  labels distinct authors on a page "Reviewer 1", "Reviewer 2", … and shows
  the current browser's own comments as "You". Comments can be edited and
  replied to (replies are rows with anchor.parentId set).
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

// ---- rich context capture (what the comment was placed on / near) ----
const HEADINGS = "h1,h2,h3,h4,h5,h6,[role=heading]";
const LANDMARKS = "header,nav,main,section,article,footer,aside,form";
const MEANINGFUL = "a,button,input,textarea,select,img,h1,h2,h3,h4,h5,h6,p,li,label,[role]";

function squash(s: string): string { return s.replace(/\s+/g, " ").trim(); }
function truncate(s: string, n: number): string { return s.length > n ? s.slice(0, n).trim() + "…" : s; }
function elText(el: Element): string { return squash((el as HTMLElement).innerText || el.textContent || ""); }
function attr(el: Element, name: string): string | undefined { const v = el.getAttribute(name); return v ? v : undefined; }
function labelOf(el: Element): string | undefined {
  return attr(el, "aria-label") || attr(el, "alt") || attr(el, "title") || attr(el, "placeholder");
}

function inferRole(el: Element): string | undefined {
  const explicit = el.getAttribute("role"); if (explicit) return explicit;
  const tag = el.tagName.toLowerCase();
  if (tag === "a") return "link";
  if (tag === "button") return "button";
  if (tag === "img") return "image";
  if (/^h[1-6]$/.test(tag)) return "heading";
  if (tag === "input" || tag === "textarea" || tag === "select") return "input";
  if (tag === "p" || tag === "li") return "text";
  return undefined;
}

function describeEl(el: Element): CommentTarget {
  const r = el.getBoundingClientRect();
  const d: CommentTarget = { tag: el.tagName.toLowerCase(), rect: { w: Math.round(r.width), h: Math.round(r.height) } };
  if (el.id) d.id = el.id;
  const cls = typeof el.className === "string" ? el.className.trim() : "";
  if (cls) d.classes = truncate(cls, 120);
  const role = inferRole(el); if (role) d.role = role;
  const t = elText(el); if (t) d.text = truncate(t, 140);
  const label = labelOf(el); if (label) d.label = truncate(squash(label), 120);
  const href = attr(el, "href"); if (href) d.href = truncate(href, 200);
  return d;
}

function sectionOf(el: Element): { landmark?: string; heading?: string } {
  const out: { landmark?: string; heading?: string } = {};
  const lm = el.closest(LANDMARKS);
  if (lm && !isReviewUI(lm)) out.landmark = lm.getAttribute("role") || lm.tagName.toLowerCase();
  // nearest heading that appears before the target in document order
  let best: Element | null = null;
  for (const h of Array.from(document.querySelectorAll(HEADINGS))) {
    if (isReviewUI(h) || !elText(h)) continue;
    const pos = el.compareDocumentPosition(h);
    if (pos & Node.DOCUMENT_POSITION_PRECEDING) best = h;
    else if (pos & Node.DOCUMENT_POSITION_FOLLOWING) break;
  }
  if (best) out.heading = truncate(elText(best), 120);
  return out;
}

function distToRect(x: number, y: number, r: DOMRect): number {
  const dx = Math.max(r.left - x, 0, x - r.right);
  const dy = Math.max(r.top - y, 0, y - r.bottom);
  return Math.hypot(dx, dy);
}

function nearestMeaningful(cx: number, cy: number, target: Element): CommentContext["nearest"] | undefined {
  let best: { el: Element; r: DOMRect; content: string } | null = null;
  let bestD = Infinity;
  for (const el of Array.from(document.querySelectorAll(MEANINGFUL))) {
    if (el === target || isReviewUI(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const content = elText(el) || squash(labelOf(el) || "");
    if (!content) continue;
    const d = distToRect(cx, cy, r);
    if (d < bestD) { bestD = d; best = { el, r, content }; }
  }
  if (!best || bestD > 400) return undefined;
  const r = best.r;
  const inside = cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom;
  let direction = "near";
  if (inside) direction = "within";
  else {
    const dx = r.left + r.width / 2 - cx, dy = r.top + r.height / 2 - cy;
    direction = Math.abs(dy) >= Math.abs(dx) ? (dy < 0 ? "above" : "below") : (dx < 0 ? "left" : "right");
  }
  return { tag: best.el.tagName.toLowerCase(), role: inferRole(best.el), text: truncate(best.content, 120), direction, distance: Math.round(bestD) };
}

function buildContext(target: Element, clientX: number, clientY: number): CommentContext {
  const ctx: CommentContext = { target: describeEl(target) };
  const section = sectionOf(target);
  if (section.landmark || section.heading) ctx.section = section;
  const near = nearestMeaningful(clientX, clientY, target);
  if (near) ctx.nearest = near;
  return ctx;
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
    context: buildContext(target, clientX, clientY),
  };
}

function isReviewUI(el: Element | null): boolean {
  return !!(el && el.closest && (el.closest("[data-nwc]") || el.closest("[data-nwc-ui]")));
}

// Resolve the stored selector to a PAGE element. The selector is a child-chain
// relative to <body>, so we root it at "body >" (an unrooted querySelector would
// match the first such element anywhere — often a div inside the review UI,
// which made pins jump to the rail). We also skip any match inside review UI.
function queryTarget(sel: string): Element | null {
  const rooted = sel.includes("#") ? sel : "body > " + sel;
  try {
    const el = document.querySelector(rooted);
    if (el && !isReviewUI(el)) return el;
  } catch { /* invalid selector */ }
  try {
    for (const cand of Array.from(document.querySelectorAll(sel))) {
      if (!isReviewUI(cand)) return cand;
    }
  } catch { /* invalid selector */ }
  return null;
}

function resolvePos(a: Anchor): { x: number; y: number } {
  if (a.sel) {
    const el = queryTarget(a.sel);
    if (el) {
      const r = el.getBoundingClientRect();
      if (r.width || r.height) return { x: r.left + window.scrollX + a.ox * r.width, y: r.top + window.scrollY + a.oy * r.height };
    }
  }
  const doc = document.documentElement;
  return { x: a.px * doc.scrollWidth, y: a.py * doc.scrollHeight };
}

function stamp(c: Comment): string {
  const d = new Date(c.created_at);
  const p = (n: number) => String(n).padStart(2, "0");
  const date = `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}, ${p(d.getHours())}:${p(d.getMinutes())}`;
  const edited = c.anchor?.editedAt ? " · edited" : "";
  return (c.anchor?.device ? `${date}, ${c.anchor.device}` : date) + edited;
}

// A textarea that grows with its content (so the start of a long comment is
// never scrolled out of view while typing), up to a cap, then scrolls.
function AutoTextarea({ value, onChange, autoFocus, placeholder }: {
  value: string; onChange: (v: string) => void; autoFocus?: boolean; placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const resize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 220) + "px";
  };
  useLayoutEffect(resize, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      autoFocus={autoFocus}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      rows={1}
      style={{ width: "100%", padding: "8px 10px", border: "1px solid #d8dbe4", borderRadius: 8, fontSize: 13, resize: "none", overflowY: "auto", fontFamily: "inherit", boxSizing: "border-box", lineHeight: 1.45, display: "block" }}
    />
  );
}

type Draft = { x: number; y: number; anchor: Anchor };

export default function CommentLayer() {
  const { config, enabled } = useReviewKit();
  const ACCENT = config.brand.accent;
  // The side rail lives on the right edge, so dock the feedback panel to the
  // left when it's in use to avoid overlapping it.
  const railed = config.bar?.position === "side";
  const db: DbConfig = { supabaseUrl: config.supabaseUrl, supabaseAnonKey: config.supabaseAnonKey, projectId: config.projectId };

  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [clientId, setClientId] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftText, setDraftText] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [replyText, setReplyText] = useState("");
  const [tick, setTick] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [hl, setHl] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const hlEl = useRef<Element | null>(null);

  useEffect(() => setMounted(true), []);

  // Persistent anonymous author id. Never shown as-is; only used to group
  // comments by author and to recognise "You".
  useEffect(() => {
    if (typeof window === "undefined") return;
    let id = localStorage.getItem("nwc_client_id");
    if (!id) {
      id = (crypto?.randomUUID?.() ?? `c_${Date.now()}_${Math.random().toString(36).slice(2)}`);
      localStorage.setItem("nwc_client_id", id);
    }
    setClientId(id);
  }, []);

  const load = useCallback(() => {
    fetchComments(db, pathname)
      .then((c) => { setComments(c.filter((x) => x.status !== "resolved")); setErr(null); })
      .catch((e) => setErr(`Could not load: ${(e as Error).message}`));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, config.supabaseUrl, config.supabaseAnonKey, config.projectId]);

  useEffect(() => { if (enabled) load(); else { setDraft(null); setOpenId(null); setEditingId(null); } }, [enabled, load]);

  // Pins are placed from element geometry, which isn't final until layout
  // settles (fonts swap, images load, late content). Recompute a few times
  // after mount and on resize so pins don't land in the wrong spot on refresh.
  useLayoutEffect(() => {
    if (!enabled) return;
    const bump = () => setTick((t) => t + 1);
    const raf = requestAnimationFrame(bump);
    const t1 = setTimeout(bump, 250);
    const t2 = setTimeout(bump, 900);
    window.addEventListener("resize", bump);
    window.addEventListener("load", bump);
    const fonts = (document as unknown as { fonts?: { ready?: Promise<unknown> } }).fonts;
    fonts?.ready?.then(bump).catch(() => {});
    return () => {
      cancelAnimationFrame(raf); clearTimeout(t1); clearTimeout(t2);
      window.removeEventListener("resize", bump); window.removeEventListener("load", bump);
    };
  }, [enabled, comments.length]);

  useEffect(() => {
    if (!openId) return;
    const onDown = (e: MouseEvent) => { const t = e.target as Element | null; if (t && t.closest("[data-nwc-pop]")) return; setOpenId(null); setEditingId(null); };
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
      setDraftText("");
    };
    window.addEventListener("click", onClick, true);
    return () => { document.body.style.cursor = ""; window.removeEventListener("click", onClick, true); };
  }, [enabled, draft, openId]);

  // Hover highlight: while placing a comment, outline the element under the
  // cursor so the reviewer sees exactly what they're about to target.
  useEffect(() => {
    if (!enabled || draft || openId) { hlEl.current = null; setHl(null); return; }
    const show = (t: Element | null) => {
      if (!t || isReviewUI(t)) { if (hlEl.current) { hlEl.current = null; setHl(null); } return; }
      if (t === hlEl.current) return;
      hlEl.current = t;
      const r = t.getBoundingClientRect();
      setHl({ x: r.left, y: r.top, w: r.width, h: r.height });
    };
    const onMove = (e: MouseEvent) => show(e.target as Element | null);
    const clear = () => { hlEl.current = null; setHl(null); };
    window.addEventListener("mousemove", onMove, true);
    window.addEventListener("scroll", clear, true);
    return () => { window.removeEventListener("mousemove", onMove, true); window.removeEventListener("scroll", clear, true); hlEl.current = null; setHl(null); };
  }, [enabled, draft, openId]);

  // When a comment is open, highlight the element it was left on (tracks scroll/resize).
  useEffect(() => {
    if (!openId) return;
    const c = comments.find((x) => x.id === openId);
    if (!c) return;
    const place = () => {
      const el = c.anchor.sel ? queryTarget(c.anchor.sel) : null;
      if (el) { const r = el.getBoundingClientRect(); setHl({ x: r.left, y: r.top, w: r.width, h: r.height }); }
      else { const p = resolvePos(c.anchor); setHl({ x: p.x - window.scrollX - 14, y: p.y - window.scrollY - 14, w: 28, h: 28 }); }
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => { window.removeEventListener("scroll", place, true); window.removeEventListener("resize", place); setHl(null); };
  }, [openId, comments]);

  // While writing a new comment, keep the clicked element highlighted for context.
  useEffect(() => {
    if (!draft) return;
    const place = () => {
      const el = draft.anchor.sel ? queryTarget(draft.anchor.sel) : null;
      if (el) { const r = el.getBoundingClientRect(); setHl({ x: r.left, y: r.top, w: r.width, h: r.height }); }
      else { const p = resolvePos(draft.anchor); setHl({ x: p.x - window.scrollX - 14, y: p.y - window.scrollY - 14, w: 28, h: 28 }); }
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => { window.removeEventListener("scroll", place, true); window.removeEventListener("resize", place); setHl(null); };
  }, [draft]);

  const saveDraft = async () => {
    if (!draft || !draftText.trim() || !clientId) return;
    try {
      const c = await createComment(db, { pagePath: pathname, anchor: draft.anchor, body: draftText.trim(), clientId });
      setComments((prev) => [...prev, c]);
      setDraft(null);
      setDraftText("");
    } catch (e) { setErr(`Could not save: ${(e as Error).message}`); }
  };

  const saveReply = async (parent: Comment) => {
    if (!replyText.trim() || !clientId) return;
    try {
      const c = await createComment(db, { pagePath: pathname, anchor: parent.anchor, body: replyText.trim(), clientId, parentId: parent.id });
      setComments((prev) => [...prev, c]);
      setReplyText("");
    } catch (e) { setErr(`Could not reply: ${(e as Error).message}`); }
  };

  const saveEdit = async (c: Comment) => {
    const body = editText.trim();
    if (!body) return;
    const anchor = { ...c.anchor, editedAt: new Date().toISOString() };
    setComments((prev) => prev.map((x) => (x.id === c.id ? { ...x, body, anchor } : x)));
    setEditingId(null);
    try { await updateComment(db, c.id, body, c.anchor); } catch (e) { setErr(`Could not save edit: ${(e as Error).message}`); }
  };

  const beginEdit = (c: Comment) => { setEditingId(c.id); setEditText(c.body); };

  const toggleResolved = async (c: Comment) => {
    const next = c.status === "open" ? "resolved" : "open";
    setComments((prev) => prev.map((x) => (x.id === c.id ? { ...x, status: next } : x)));
    if (openId === c.id) setOpenId(null);
    try { await setStatus(db, c.id, next); } catch { setErr("Could not update."); }
  };

  if (!mounted || !enabled) return null;
  void tick;

  // Top-level comments get pins; replies (anchor.parentId set) show inside a card.
  const topLevel = comments.filter((c) => !c.anchor?.parentId).sort((a, b) => a.created_at.localeCompare(b.created_at));
  const repliesOf = (id: string) => comments.filter((c) => c.anchor?.parentId === id).sort((a, b) => a.created_at.localeCompare(b.created_at));

  // Anonymous reviewers get an auto id (uuid, or a "c_..." fallback); those are
  // labelled "Reviewer N" / "You". A named author (e.g. a "NWC Riu" reply posted
  // by the feedback loop) is shown verbatim so team replies read as the team.
  const isAnonId = (a: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(a) || a.startsWith("c_");
  const idToNum = new Map<string, number>();
  let n = 0;
  for (const c of [...comments].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    if (c.author && isAnonId(c.author) && !idToNum.has(c.author)) idToNum.set(c.author, ++n);
  }
  const labelFor = (c: Comment): string => {
    if (!c.author) return "Reviewer";
    if (c.author === clientId) return "You";
    if (isAnonId(c.author)) return `Reviewer ${idToNum.get(c.author) ?? "?"}`;
    return c.author; // named author (team reply) shows as-is
  };

  const openCount = topLevel.length;

  // Place a popover near a pin (given in page coords) but always fully inside
  // the viewport. Returns fixed-position box; the caller caps its height so it
  // never runs off the bottom (it scrolls internally instead).
  const popPos = (pageX: number, pageY: number, width: number) => {
    const vw = window.innerWidth, vh = window.innerHeight, m = 12;
    const vx = pageX - window.scrollX, vy = pageY - window.scrollY;
    const left = Math.max(m, Math.min(vx - width / 2, vw - width - m));
    const top = Math.max(m, Math.min(vy + 14, vh - m - 180));
    const maxHeight = vh - m - top;
    return { left, top, maxHeight };
  };

  const metaStyle: React.CSSProperties = { fontSize: 11, color: "#8a8f99", marginTop: 1 };
  const authorStyle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: "#1a1d24" };
  const linkBtn = (color: string): React.CSSProperties => ({ border: 0, background: "transparent", color, fontSize: 12, fontWeight: 600, cursor: "pointer", padding: "4px 0" });

  const editor = (c: Comment) => (
    <div>
      <AutoTextarea value={editText} onChange={setEditText} autoFocus placeholder="Edit comment…" />
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button onClick={() => saveEdit(c)} disabled={!editText.trim()} style={{ flex: 1, padding: "8px", border: 0, borderRadius: 8, background: ACCENT, color: ACCENT_INK, fontSize: 12.5, fontWeight: 700, cursor: "pointer", opacity: editText.trim() ? 1 : 0.5 }}>Save</button>
        <button onClick={() => setEditingId(null)} style={{ padding: "8px 12px", border: "1px solid #d8dbe4", borderRadius: 8, background: "#fff", color: "#5b5d6e", fontSize: 12.5, cursor: "pointer" }}>Cancel</button>
      </div>
    </div>
  );

  return createPortal(
    <div data-nwc>
      {hl && (
        <div style={{ position: "fixed", left: hl.x, top: hl.y, width: hl.w, height: hl.h, border: `2px solid ${ACCENT}`, background: `${ACCENT}1f`, borderRadius: 4, pointerEvents: "none", zIndex: Z, boxSizing: "border-box" }} />
      )}

      {topLevel.map((c, i) => {
        const p = resolvePos(c.anchor);
        return (
          <button key={c.id} onClick={() => { setOpenId(openId === c.id ? null : c.id); setEditingId(null); setReplyText(""); }} title={c.body}
            style={{ position: "absolute", left: p.x, top: p.y, transform: "translate(-50%,-100%)", width: 28, height: 28, borderRadius: "50% 50% 50% 2px", border: "2px solid #fff", background: ACCENT, color: ACCENT_INK, fontSize: 12, fontWeight: 700, cursor: "pointer", zIndex: Z + 1, boxShadow: "0 2px 8px rgba(0,0,0,.35)" }}>
            {i + 1}
          </button>
        );
      })}

      {openId && (() => {
        const c = topLevel.find((x) => x.id === openId);
        if (!c) return null;
        const p = resolvePos(c.anchor);
        const replies = repliesOf(c.id);
        const width = Math.min(320, window.innerWidth - 24);
        const box = popPos(p.x, p.y, width);
        return (
          <div data-nwc-pop style={{ position: "fixed", left: box.left, top: box.top, width, maxHeight: box.maxHeight, display: "flex", flexDirection: "column", background: "#fff", borderRadius: 10, boxShadow: "0 12px 40px rgba(0,0,0,.28)", zIndex: Z + 6, overflow: "hidden", fontFamily: "system-ui, sans-serif" }}>
            <button onClick={() => { setOpenId(null); setEditingId(null); }} aria-label="Close" style={{ position: "absolute", top: 8, right: 8, width: 22, height: 22, borderRadius: "50%", border: 0, background: "#f0f1f4", color: "#5b5d6e", fontSize: 14, lineHeight: "22px", cursor: "pointer", padding: 0, zIndex: 1 }}>×</button>

            <div style={{ padding: "12px 34px 10px 14px", flex: 1, minHeight: 0, overflowY: "auto" }}>
              {/* root comment */}
              <div style={authorStyle}>{labelFor(c)}</div>
              <div style={metaStyle}>{stamp(c)}</div>
              {editingId === c.id ? (
                <div style={{ marginTop: 8 }}>{editor(c)}</div>
              ) : (
                <div style={{ fontSize: 13, color: "#2a2e36", lineHeight: 1.5, marginTop: 8, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{c.body}</div>
              )}
              {editingId !== c.id && (
                <div style={{ display: "flex", gap: 14, marginTop: 6 }}>
                  <button onClick={() => beginEdit(c)} style={linkBtn("#5b5d6e")}>Edit</button>
                </div>
              )}

              {/* replies */}
              {replies.length > 0 && (
                <div style={{ marginTop: 12, borderLeft: "2px solid #eceef2", paddingLeft: 10, display: "flex", flexDirection: "column", gap: 12 }}>
                  {replies.map((r) => (
                    <div key={r.id}>
                      <div style={authorStyle}>{labelFor(r)}</div>
                      <div style={metaStyle}>{stamp(r)}</div>
                      {editingId === r.id ? (
                        <div style={{ marginTop: 6 }}>{editor(r)}</div>
                      ) : (
                        <>
                          <div style={{ fontSize: 13, color: "#2a2e36", lineHeight: 1.5, marginTop: 6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{r.body}</div>
                          <button onClick={() => beginEdit(r)} style={linkBtn("#5b5d6e")}>Edit</button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* reply composer */}
              <div style={{ marginTop: 12 }}>
                <AutoTextarea value={replyText} onChange={setReplyText} placeholder="Reply…" />
                {replyText.trim() && (
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button onClick={() => saveReply(c)} style={{ flex: 1, padding: "8px", border: 0, borderRadius: 8, background: ACCENT, color: ACCENT_INK, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Reply</button>
                    <button onClick={() => setReplyText("")} style={{ padding: "8px 12px", border: "1px solid #d8dbe4", borderRadius: 8, background: "#fff", color: "#5b5d6e", fontSize: 12.5, cursor: "pointer" }}>Cancel</button>
                  </div>
                )}
              </div>
            </div>

            <button onClick={() => toggleResolved(c)} style={{ width: "100%", padding: "10px", border: 0, borderTop: "1px solid #eee", background: "#f6f7f9", color: "#1a1d24", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
              Resolve
            </button>
          </div>
        );
      })()}

      {draft && (() => {
        const width = Math.min(300, window.innerWidth - 24);
        const box = popPos(draft.x, draft.y, width);
        return (
        <div data-nwc-pop style={{ position: "fixed", left: box.left, top: box.top, width, maxHeight: box.maxHeight, overflowY: "auto", background: "#fff", borderRadius: 10, boxShadow: "0 12px 40px rgba(0,0,0,.3)", zIndex: Z + 6, padding: 14, fontFamily: "system-ui, sans-serif" }}>
          <AutoTextarea value={draftText} onChange={setDraftText} autoFocus placeholder="Leave a comment…" />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button onClick={saveDraft} disabled={!draftText.trim()} style={{ flex: 1, padding: "9px", border: 0, borderRadius: 8, background: ACCENT, color: ACCENT_INK, fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: draftText.trim() ? 1 : 0.5 }}>Comment</button>
            <button onClick={() => setDraft(null)} style={{ padding: "9px 12px", border: "1px solid #d8dbe4", borderRadius: 8, background: "#fff", color: "#5b5d6e", fontSize: 13, cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
        );
      })()}

      <div style={{ position: "fixed", ...(railed ? { left: 16 } : { right: 16 }), bottom: 16, width: "min(300px, calc(100vw - 32px))", maxHeight: "60vh", display: "flex", flexDirection: "column", background: PANEL_BG, color: "#e7e9ee", borderRadius: 14, boxShadow: "0 20px 60px rgba(0,0,0,.45)", zIndex: Z + 4, overflow: "hidden", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,.1)", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: ACCENT }} />
          <strong style={{ fontSize: 13 }}>{config.brand.name} Feedback</strong>
          <span style={{ marginLeft: "auto", fontSize: 11, color: "#9aa0ad" }}>{openCount} open</span>
        </div>
        <div style={{ overflowY: "auto", padding: 8 }}>
          {err && <div style={{ fontSize: 12, color: "#ffb4a3", padding: 8 }}>{err}</div>}
          {topLevel.length === 0 && !err && <div style={{ fontSize: 12, color: "#9aa0ad", padding: 8 }}>No comments on this page yet.</div>}
          {topLevel.map((c, i) => {
            const rc = repliesOf(c.id).length;
            return (
              <button key={c.id} onClick={() => { setOpenId(c.id); setEditingId(null); setReplyText(""); window.scrollTo({ top: resolvePos(c.anchor).y - 140, behavior: "smooth" }); }} style={{ display: "block", width: "100%", textAlign: "left", background: "transparent", border: 0, borderRadius: 8, padding: 8, cursor: "pointer", color: "inherit" }}>
                <span style={{ display: "flex", gap: 8 }}>
                  <span style={{ flexShrink: 0, width: 18, height: 18, borderRadius: "50%", background: ACCENT, color: ACCENT_INK, fontSize: 11, fontWeight: 700, display: "grid", placeItems: "center" }}>{i + 1}</span>
                  <span style={{ fontSize: 12.5, lineHeight: 1.4, color: "#e7e9ee" }}>
                    {c.body.length > 70 ? c.body.slice(0, 70) + "…" : c.body}
                    <span style={{ display: "block", color: "#9aa0ad", marginTop: 2 }}>{labelFor(c)}{rc > 0 ? ` · ${rc} ${rc === 1 ? "reply" : "replies"}` : ""}</span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <div style={{ padding: "11px 12px", borderTop: "1px solid rgba(255,255,255,.1)", fontSize: 12, color: "#9aa0ad", textAlign: "center" }}>
          Click anywhere on the page to add a comment.
        </div>
      </div>
    </div>,
    document.body
  );
}
