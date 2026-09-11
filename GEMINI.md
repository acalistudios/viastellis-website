# ViaStellis — Antigravity / Gemini

Read **[AGENTS.md](./AGENTS.md)** first. It is the shared working agreement for
all three agents on this project (Claude Code, Codex, Antigravity) and is kept as
the single source of truth so the per-agent files cannot drift apart.

Short version:
1. `git fetch origin` before starting — another agent has probably pushed.
2. Log deploys / migrations / secrets / external changes in `docs/AGENT_LOG.md`.
   Git does not record them, and they are what surprise the next agent.
3. Stripe billing belongs to Codex; Android + RevenueCat belong to Claude Code.
   Check AGENTS.md and the log before touching either.
4. Native Android code lives in the separate private repo
   `acalistudios/viastellis-android` — never re-add `android/` to this repo.
5. Never push to `main` or deploy the live site without Hans's explicit consent.
