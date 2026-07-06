/*
  Data access via Supabase REST (PostgREST). No SDK dependency.
  Connection is passed in by the consumer (from ReviewKitProvider config),
  so the kit isn't tied to any one project. Resolved comments are kept
  (status = 'resolved') for audit / tooling.

  Authorship is anonymous: each browser gets a persistent id (see CommentLayer)
  that is stored in the `author` column. The UI never shows it raw; it labels
  distinct authors "Reviewer 1", "Reviewer 2", … and the current browser "You".

  To avoid any schema change, reply + edit metadata ride inside the existing
  `anchor` JSON: `anchor.parentId` marks a reply; `anchor.editedAt` marks an edit.
*/

export type DbConfig = { supabaseUrl: string; supabaseAnonKey: string; projectId: string };

// Rich, human/AI-readable description of what a comment was placed on. Captured
// from the live DOM at click time and stored inside the anchor, so the feedback
// loop knows "the 'Get started' button in the pricing section", not just a
// structural selector.
export type CommentTarget = {
  tag: string;                 // e.g. "button", "a", "img", "h2"
  role?: string;               // aria role or inferred (button/link/image/heading/input/text)
  text?: string;               // visible text (truncated)
  label?: string;              // aria-label / alt / title / placeholder
  href?: string;               // for links
  id?: string;
  classes?: string;
  rect?: { w: number; h: number };  // element size in px (tells a control from a big container)
};

export type CommentContext = {
  target?: CommentTarget;                       // the element under the click
  section?: { landmark?: string; heading?: string };  // enclosing landmark + nearest heading above
  // When placed beside rather than on something: the closest meaningful element.
  nearest?: { tag?: string; role?: string; text?: string; direction?: string; distance?: number };
};

export type Anchor = {
  sel: string | null;
  ox: number;
  oy: number;
  px: number;
  py: number;
  device?: string;
  context?: CommentContext;  // what the comment was placed on / near
  parentId?: string;  // present on replies -> id of the comment being answered
  editedAt?: string;  // ISO timestamp, present once a comment has been edited
};

export type Comment = {
  id: string;
  project_id: string;
  page_path: string;
  anchor: Anchor;
  author: string;      // anonymous per-browser id (older rows may hold a legacy name)
  body: string;
  status: "open" | "resolved";
  created_at: string;
};

// Build the anchor to store. Replies keep only positional fields (+ parentId);
// top-level comments keep the rich context but never an inherited parentId/editedAt.
function forStore(a: Anchor, parentId?: string | null): Anchor {
  const base: Anchor = { sel: a.sel, ox: a.ox, oy: a.oy, px: a.px, py: a.py, device: a.device };
  if (parentId) { base.parentId = parentId; return base; }
  if (a.context) base.context = a.context;
  return base;
}

function rest(cfg: DbConfig) {
  return {
    url: `${cfg.supabaseUrl}/rest/v1/comments`,
    headers: {
      apikey: cfg.supabaseAnonKey,
      Authorization: `Bearer ${cfg.supabaseAnonKey}`,
      "Content-Type": "application/json",
    },
  };
}

export async function fetchComments(cfg: DbConfig, pagePath: string): Promise<Comment[]> {
  const { url, headers } = rest(cfg);
  const q = `${url}?project_id=eq.${encodeURIComponent(cfg.projectId)}&page_path=eq.${encodeURIComponent(pagePath)}&select=*&order=created_at.asc`;
  const r = await fetch(q, { headers });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json();
}

export async function createComment(
  cfg: DbConfig,
  input: { pagePath: string; anchor: Anchor; body: string; clientId: string; parentId?: string | null },
): Promise<Comment> {
  const { url, headers } = rest(cfg);
  const anchor: Anchor = forStore(input.anchor, input.parentId);
  const r = await fetch(url, {
    method: "POST",
    headers: { ...headers, Prefer: "return=representation" },
    body: JSON.stringify({
      project_id: cfg.projectId,
      page_path: input.pagePath,
      anchor,
      author: input.clientId,
      body: input.body,
    }),
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return (await r.json())[0];
}

export async function updateComment(cfg: DbConfig, id: string, body: string, anchor: Anchor): Promise<void> {
  const { url, headers } = rest(cfg);
  const nextAnchor: Anchor = { ...anchor, editedAt: new Date().toISOString() };
  const r = await fetch(`${url}?id=eq.${id}`, {
    method: "PATCH",
    headers: { ...headers, Prefer: "return=minimal" },
    body: JSON.stringify({ body, anchor: nextAnchor }),
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
}

export async function setStatus(cfg: DbConfig, id: string, status: "open" | "resolved"): Promise<void> {
  const { url, headers } = rest(cfg);
  const r = await fetch(`${url}?id=eq.${id}`, {
    method: "PATCH",
    headers: { ...headers, Prefer: "return=minimal" },
    body: JSON.stringify({ status }),
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
}
