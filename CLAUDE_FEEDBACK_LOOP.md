# Claude feedback loop

A manual, human-run loop any team member can run. Claude reads the client's open comments, proposes fixes, and on your approval commits them to a new branch (main only if you explicitly allow it), auto-resolving each comment as soon as its fix is committed. You then check the Netlify preview and merge.

It uses the review database's **publishable key**, which already lives in this project's review kit config (`config.ts`, the `reviewConfig` object). That key is not a secret (it ships in the site's browser code), and the database rules let it read, add and resolve comments. So there is nothing to paste, no personal token, and no MCP needed.

## How to run

Open this website's repo in Claude Code and paste the prompt below.

## Prompt

> Review and action the client's website feedback for this project.
>
> 1. Read the Supabase connection from the review kit config in this repo (find `reviewConfig`): use `supabaseUrl`, `supabaseAnonKey`, and `projectId`.
> 2. List the open comments: GET `{supabaseUrl}/rest/v1/comments?project_id=eq.{projectId}&status=eq.open&select=*&order=page_path.asc` with headers `apikey: {supabaseAnonKey}` and `Authorization: Bearer {supabaseAnonKey}`.
> 3. Group them by `page_path`. For each comment show the author, the body, the device (`anchor.device`), and the placement context from `anchor.context`: what it was placed on (`context.target` — its `text`/`label`/`role`/`tag`/`href`), which part of the page (`context.section.heading` and `context.section.landmark`), and, when it was placed *beside* rather than on something, the closest element (`context.nearest` — its `text`, `direction`, and `distance` in px). Use this to pinpoint the exact element to change. Fall back to `anchor.sel` / `anchor.px`,`anchor.py` for older comments that have no `context`.
> 4. Triage each into **small** (copy, spacing, colour, simple content I can do confidently) or **large** (layout, structure, or concept that needs my decision). Give a one-line recommendation for each. For large ones, give up to three options and recommend one.
> 5. Stop and wait for my approval. Do not edit code yet.
> 6. Once I approve: work on a NEW git branch by default — create one and never commit straight to main — UNLESS in this run I have explicitly told you it's okay to use main; only then may you commit to main. Make the approved changes and commit them with a clear message.
> 7. As soon as you have committed, AUTOMATICALLY mark the comments that commit addressed as resolved (do not ask me first): PATCH `{supabaseUrl}/rest/v1/comments?id=eq.{COMMENT_ID}` with headers `apikey`, `Authorization: Bearer {supabaseAnonKey}`, `Content-Type: application/json`, `Prefer: return=minimal`, body `{"status":"resolved"}`. List the ids you resolved.
> 8. Push: if you're on a new branch, push it and open a pull request into main (or print the GitHub compare URL), and print the branch name; if I explicitly authorised main, push to main.
> 9. Then tell me, in plain steps, to open the deploy preview on Netlify (the deploy-preview URL Netlify posts on the PR), click through the changed pages, confirm nothing is broken, and merge the pull request into main when it looks right (I merge it, not you).
>
> Constraints: default to a NEW branch and only ever use main with my explicit say-so in this run; never force-push, never rewrite history; only ever change a comment's `status` (never delete a row). Do not merge the pull request yourself.

## Notes

- Resolving sets `status = 'resolved'`; the row stays for the audit trail and so it isn't re-processed next time. The comment panel and this loop only show open comments.
- Resolve happens automatically the moment a fix is committed (no confirmation step). A resolved comment therefore means the fix is committed, not necessarily merged/live yet — you still review the preview and merge the PR.
- Multi-site: this works in any website that includes the kit, because it reads that site's own connection values and `projectId` from its config.

## Optional: Supabase MCP (richer, needs a secret)

Only if you later want Claude to do more than the comments table (arbitrary SQL, schema, other tables). It needs a Supabase access token (a real secret), ideally created on a shared service account and stored in the company vault, added once per machine via `claude mcp add`. Not needed for this loop.
