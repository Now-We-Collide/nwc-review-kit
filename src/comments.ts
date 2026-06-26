/*
  Data access via Supabase REST (PostgREST). No SDK dependency.
  Connection is passed in by the consumer (from ReviewKitProvider config),
  so the kit isn't tied to any one project. Resolved comments are kept
  (status = 'resolved') for audit / tooling.
*/

export type DbConfig = { supabaseUrl: string; supabaseAnonKey: string; projectId: string };

export type Anchor = {
  sel: string | null;
  ox: number;
  oy: number;
  px: number;
  py: number;
  device?: string;
};

export type Comment = {
  id: string;
  project_id: string;
  page_path: string;
  anchor: Anchor;
  author: string;
  body: string;
  status: "open" | "resolved";
  created_at: string;
};

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

export async function createComment(cfg: DbConfig, input: { pagePath: string; anchor: Anchor; author: string; body: string }): Promise<Comment> {
  const { url, headers } = rest(cfg);
  const r = await fetch(url, {
    method: "POST",
    headers: { ...headers, Prefer: "return=representation" },
    body: JSON.stringify({ project_id: cfg.projectId, page_path: input.pagePath, anchor: input.anchor, author: input.author, body: input.body }),
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return (await r.json())[0];
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
