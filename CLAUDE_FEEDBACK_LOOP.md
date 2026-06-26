# Claude feedback loop

A manual, human-run loop any team member can run. Claude reads the client's open comments, proposes fixes, and on your approval makes them on a new branch. You verify the Netlify preview and merge.

It uses the review database's **publishable key**, which already lives in this project's review kit config (`config.ts`, the `reviewConfig` object). That key is not a secret (it ships in the site's browser code), and the database rules let it read, add and resolve comments. So there is nothing to paste, no personal token, and no MCP needed.

## How to run

Open this website's repo in Claude Code and paste the prompt below.

## Prompt

> Review and action the client's website feedback for this project.
>
> 1. Read the Supabase connection from the review kit config in this repo (find `reviewConfig`): use `supabaseUrl`, `supabaseAnonKey`, and `projectId`.
> 2. List the open comments: GET `{supabaseUrl}/rest/v1/comments?project_id=eq.{projectId}&status=eq.open&select=*&order=page_path.asc` with headers `apikey: {supabaseAnonKey}` and `Authorization: Bearer {supabaseAnonKey}`.
> 3. Group them by `page_path`. For each comment show the author, the body, the device (`anchor.device`) and the anchored element (`anchor.sel`).
> 4. Triage each into **small** (copy, spacing, colour, simple content I can do confidently) or **large** (layout, structure, or concept that needs my decision). Give a one-line recommendation for each. For large ones, give up to three options and recommend one.
> 5. Stop and wait for my approval. Do not edit code yet.
> 6. Once I approve, make the approved changes on a NEW branch (never main), commit with a clear message, and push it. Open a pull request into main (or print the GitHub compare URL). Print the branch name.
> 7. Then tell me, in plain steps, to: open the branch's deploy preview on Netlify (the deploy-preview URL Netlify posts on the PR), click through the changed pages, and confirm nothing is broken. Tell me that ONLY if it all looks right should I merge the pull request into main on GitHub, which deploys it live.
> 8. After I confirm to you that it has been merged, mark the comments that were addressed as resolved: PATCH `{supabaseUrl}/rest/v1/comments?id=eq.{COMMENT_ID}` with headers `apikey`, `Authorization: Bearer {supabaseAnonKey}`, `Content-Type: application/json`, `Prefer: return=minimal`, body `{"status":"resolved"}`. List the ids you resolved.
>
> Constraints: never push to main directly, never force-push, never rewrite history, and only ever change a comment's `status` (never delete a row). Do not merge the pull request yourself; I merge it after checking the preview.

## Notes

- Resolving sets `status = 'resolved'`; the row stays for the audit trail and so it isn't re-processed next time. The comment panel and this loop only show open comments.
- Resolve happens after the merge, so a comment is only marked done once the fix is actually live.
- Multi-site: this works in any website that includes the kit, because it reads that site's own connection values and `projectId` from its config.

## Optional: Supabase MCP (richer, needs a secret)

Only if you later want Claude to do more than the comments table (arbitrary SQL, schema, other tables). It needs a Supabase access token (a real secret), ideally created on a shared service account and stored in the company vault, added once per machine via `claude mcp add`. Not needed for this loop.
