/*
  Data access via Supabase REST (PostgREST). No SDK dependency.
  Resolved comments are kept (status = 'resolved') for audit / tooling.
*/
import { reviewConfig } from "./config";

const REST = `${reviewConfig.supabaseUrl}/rest/v1/comments`;
const headers = {
  apikey: reviewConfig.supabaseAnonKey,
  Authorization: `Bearer ${reviewConfig.supabaseAnonKey}`,
  "Content-Type": "application/json",
};

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

export async function fetchComments(pagePath: string): Promise<Comment[]> {
  const url = `${REST}?project_id=eq.${encodeURIComponent(reviewConfig.projectId)}&page_path=eq.${encodeURIComponent(pagePath)}&select=*&order=created_at.asc`;
  const r = await fetch(url, { headers });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json();
}

export async function createComment(input: { pagePath: string; anchor: Anchor; author: string; body: string }): Promise<Comment> {
  const r = await fetch(REST, {
    method: "POST",
    headers: { ...headers, Prefer: "return=representation" },
    body: JSON.stringify({
      project_id: reviewConfig.projectId,
      page_path: input.pagePath,
      anchor: input.anchor,
      author: input.author,
      body: input.body,
    }),
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return (await r.json())[0];
}

export async function setStatus(id: string, status: "open" | "resolved"): Promise<void> {
  const r = await fetch(`${REST}?id=eq.${id}`, {
    method: "PATCH",
    headers: { ...headers, Prefer: "return=minimal" },
    body: JSON.stringify({ status }),
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
}
