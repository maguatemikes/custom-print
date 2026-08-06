# Working agreement — how the AI assistant should operate here

Standing rules for Claude (or any AI assistant) working in this repo. Follow them
unless I explicitly override them in the moment.

## 1. Ask before committing or pushing

- **Do not run `git commit` or `git push` without asking me first.**
- Make the changes locally, then tell me what you'd commit (files + message) and
  **wait for my go-ahead**.
- This applies to every commit, including follow-ups mid-task — ask each time.

## 2. Ask before running wrangler / touching the deploy

- **Do not run any `wrangler` command without asking me first** — this includes
  `deploy`, `secret put`, `secret list`, `tail`, `deployments list`, `whoami`,
  and `login`.
- Explain what you intend to run and why, then **wait for my confirmation**.

## Why

I want to stay in control of anything that changes version-control history or
touches the live Cloudflare deployment (https://berlinhousewares.maguatemikes.workers.dev).
Preparing or editing files locally is fine — but **publishing** it (git) or
**acting on the deployment** (wrangler) needs my explicit sign-off first.
