# ViaStellis — Claude Code

Read **[AGENTS.md](./AGENTS.md)** first. It is the shared working agreement for
all three agents on this project (Claude Code, Codex, Antigravity) and is kept as
the single source of truth so the per-agent files cannot drift apart.

Short version:
1. `git fetch origin` before starting — another agent has probably pushed.
2. Log deploys / migrations / secrets / external changes in `docs/AGENT_LOG.md`.
   Git does not record them, and they are what surprise the next agent.
3. Claude's area: Android + Capacitor, RevenueCat, marketing/growth.
   Stripe billing belongs to Codex — coordinate before editing it.
4. `npx tsc -b` before claiming the build is clean.
5. Never push to `main` or deploy the live site without Hans's explicit consent.
