# Claude feedback loop

A manual, human-run loop: Claude reads the client's open comments straight from Supabase (via the Supabase MCP), proposes fixes, and on your approval makes them on a new branch. You run this when a round of feedback is in.

## Prerequisites

- The Supabase MCP server is connected to Claude Code (see "MCP setup" in the kit's setup notes / the project README).
- You're in the website's repo in a Claude Code session.
- Know the website's `projectId` (from `config.ts`).

## The comments table

Each row gives Claude everything it needs:

- `project_id` — which website.
- `page_path` — which page the comment is on (e.g. `/policy/1`).
- `anchor` — where on the page: `{ sel, ox, oy, px, py, device }` (`sel` is the element CSS selector; `ox/oy` the offset within it; `device` is mobile/tablet/desktop).
- `author`, `body`, `created_at`, `status` (`open` | `resolved`).

Only act on `status = 'open'`. Resolved comments are kept for history; ignore them.

## Prompt to paste into Claude Code

> Read the open review comments for project **`<PROJECT_ID>`** from Supabase and help me action them.
>
> 1. Query the `comments` table via the Supabase MCP for rows where `project_id = '<PROJECT_ID>'` and `status = 'open'`, ordered by `page_path` then `created_at`.
> 2. Group them by `page_path`. For each comment, show the author, the body, the device it was left on, and the element it's anchored to (`anchor.sel`).
> 3. Triage each into **small** (copy tweak, spacing, colour, simple content change you can do confidently) or **large** (layout, structure, or concept change that needs a human decision).
> 4. For every comment, give a one-line recommendation of the change. For **large** ones, give up to three options and recommend one.
> 5. Wait for my approval. Do not edit code yet.
> 6. Once I approve, make the approved changes, then show me a summary and a diff. Create a new branch (do not touch main), commit with a clear message, and push it so Netlify builds a preview. Print the branch name and the PR/preview info.
> 7. Do not mark anything resolved automatically. List the comment ids you changed so I can mark them resolved (status = 'resolved') once the preview is approved.
>
> Constraints: never push to main, no force-push, no history rewriting, and never delete comment rows.

Replace `<PROJECT_ID>` with the site's id (e.g. `fsc-website`).

## Notes

- This is intentionally manual: you trigger it, you approve, and resolving is a deliberate step. Marking resolved (rather than deleting) keeps the audit trail and stops Claude re-processing the same comment next time.
- Future: an orchestrator (e.g. Atlas) can run this loop end to end, ping you in Teams with the options, and trigger the branch/preview. Keep the same data contract (open comments in, status flipped to resolved on completion).
