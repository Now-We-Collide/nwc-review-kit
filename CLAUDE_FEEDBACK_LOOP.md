# Claude feedback loop

A manual, human-run loop any team member can run. Claude reads the client's open comments, sorts each into a **change**, a **question**, or something it's **unsure of**, lays them out in per-page tables, and pauses for your input before touching anything. On your approval it makes the changes on a branch (auto-resolving each once committed), posts approved answers as replies on the review site, and leaves questions and anything unresolved open for a human.

It uses the review database's **publishable key**, which already lives in this project's review kit config (`config.ts`, the `reviewConfig` object). That key is not a secret (it ships in the site's browser code), and the database rules let it read, add and resolve comments. So there is nothing to paste, no personal token, and no MCP needed.

## How to run

Open this website's repo in Claude Code and paste the prompt below.

## Prompt

> Review and action the client's website feedback for this project. Work in the order below, and do NOT touch code or post any reply until I have been through the table and approved (step 6).
>
> 1. Read the Supabase connection from the review kit config in this repo: find the config object — the React kit exports `reviewConfig` (in `config.ts` / `lib/review.config.ts`); the vanilla/static kit sets `window.NWC_REVIEW_CONFIG` (in a `review.config.js`). Use its `supabaseUrl`, `supabaseAnonKey`, and `projectId`.
> 2. First, ask me one question: who should client replies be signed from? Default is `NWC`; I'll usually give something like `NWC Riu`. Hold onto it for step 7.
> 3. List the open comments: GET `{supabaseUrl}/rest/v1/comments?project_id=eq.{projectId}&status=eq.open&select=*&order=page_path.asc,created_at.asc` with headers `apikey: {supabaseAnonKey}` and `Authorization: Bearer {supabaseAnonKey}`. Replies are rows too (they carry `anchor.parentId`). If a top-level comment already has a reply from us, it is already handled: skip it, don't re-answer.
> 4. Classify each top-level comment into exactly one type, using its `body` and its placement context (`anchor.context`: target `text`/`label`/`role`/`tag`, `section.heading`/`landmark`, and `nearest` if it was placed beside rather than on something; fall back to `anchor.sel` / `px`,`py` for older comments):
>    - 🟢 small change: copy, spacing, colour, simple content you can do confidently with no decision from me.
>    - 🟡 quick change: needs a quick call from me but is simple, a single one-line choice (no options to lay out).
>    - 🟠 big change: larger, or needs a real decision. Lay out up to three options + your recommendation.
>    - ❓ question: the client is asking something (e.g. "how do we edit this in HubSpot?"), not requesting a design change. Draft a suggested answer.
>    - 🔴 unsure: you can't confidently action it, or you don't understand what they mean. Say so plainly. Never guess, and never quietly skip it. (An emoji the client typed does NOT make a comment a question; judge by the content.)
> 5. Group by page and print ONE markdown table per page, titled with the page name. **Number to match the pins the client sees on that page:** within a page take only top-level comments (no `anchor.parentId`), sort by `created_at` ascending, and number from 1, so `H3` is pin 3 on Home. Prefix with a short unique page code (Home → `H`; if two pages share a first letter use distinct codes, e.g. Policy `PL`, Pricing `PR`). Do not number replies, and do not reorder by your own judgement. Keep it to TWO tight columns so it stays glanceable:
>    - `Ref`: the type emoji + label, e.g. `🟢 H1`.
>    - `Comment → action`: a short summary of the comment, then what you propose. For 🟢, the fix. For 🟡, the one-line choice, tagged "needs your pick". For 🟠, the options as **bullets** (put each on its own line in the cell using `<br>• `) followed by your recommendation, tagged "needs your pick". For ❓, your drafted answer, tagged "needs your approval to send". For 🔴, what's unclear, tagged "needs your input".
>    Sort each table in this order: 🟢, 🟡, 🟠, ❓, 🔴. Tables only: do not repeat the detail in lists underneath.
> 6. STOP. Do not edit any code and do not post any reply yet. Wait for me to make the picks for the 🟡s and 🟠s, approve or adjust the drafted answers for the ❓s, and answer or steer the 🔴s.
> 7. Once I approve, in a single pass:
>    - Make the approved 🟢, 🟡 and 🟠 changes on a NEW branch (never main unless I explicitly said main is okay this run) and commit them with a clear message.
>    - As soon as they are committed, mark ONLY those committed change-comments resolved: PATCH `{supabaseUrl}/rest/v1/comments?id=eq.{COMMENT_ID}` with headers `apikey`, `Authorization: Bearer {supabaseAnonKey}`, `Content-Type: application/json`, `Prefer: return=minimal`, body `{"status":"resolved"}`.
>    - For each ❓ whose answer I approved, post a reply onto that comment, signed from the name from step 2: POST `{supabaseUrl}/rest/v1/comments` with headers `apikey`, `Authorization: Bearer {supabaseAnonKey}`, `Content-Type: application/json`, `Prefer: return=representation`, body `{"project_id":"{projectId}","page_path":"{that comment's page_path}","anchor":{"parentId":"{PARENT_COMMENT_ID}"},"author":"{reply-from name}","body":"{the approved answer}"}`. Leave the question OPEN; a human resolves it once the thread is done.
>    - Leave every 🔴 open and untouched.
> 8. Push the branch and open a pull request into main (or print the GitHub compare URL), and print the branch name. Only push to main if I explicitly allowed it this run.
> 9. Finish with a short **Needs you** list: the refs still waiting on me (🔴 to answer, 🟡 and 🟠 to pick, ❓ to approve), then remind me to open the Netlify deploy-preview on the PR, click through the changed pages, and merge when it looks right (I merge, not you).
>
> Rules: only ever resolve a comment that was a change AND is committed, or one I explicitly tell you to resolve. NEVER resolve a question, a 🔴, or anything you did not actually address (a silently-resolved client comment reads as us ignoring them). Always get my approval before posting any client-facing reply. Default to a new branch; use main only with my explicit say-so this run. Never force-push, never rewrite history, and only ever change a comment's `status` (never delete a row). Do not merge the pull request yourself.

## Notes

- Resolving sets `status = 'resolved'`; the row stays for the audit trail and so it isn't re-processed. The comment panel and this loop only show open comments.
- Changes auto-resolve the moment they're committed. Questions and 🔴s never auto-resolve: a human resolves them (a question once the client has seen the reply / the thread ends). This is deliberate, so nothing a client raised is closed without a real response.
- Replies are ordinary rows with `anchor.parentId` set, authored by the name you give (default `NWC`, e.g. `NWC Riu`). The kit shows named authors verbatim (so a team reply reads as the team) and anonymous reviewers as "Reviewer N". A comment that already has a reply from us is treated as handled and not re-answered.
- The per-page number matches the pin the client sees on that page (open top-level comments in date order), so `H3` in the table is pin 3 on Home. Replies aren't numbered.
- Multi-site: this works in any website that includes the kit, because it reads that site's own connection values and `projectId` from its config.

## Optional: Supabase MCP (richer, needs a secret)

Only if you later want Claude to do more than the comments table (arbitrary SQL, schema, other tables). It needs a Supabase access token (a real secret), ideally created on a shared service account and stored in the company vault, added once per machine via `claude mcp add`. Not needed for this loop.
