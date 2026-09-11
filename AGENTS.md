# ViaStellis — AI agent working agreement

The working agreement and the shared action log are **not in this repo**. This
repository is public; the log records what is deployed, what is half-finished and
which database objects are missing, which is needless exposure.

They live in the private `acalistudios/ai-history` repo, cloned locally at:

    C:\Users\hansi\_ACALI\ai-history\coordination\viastellis\AGENTS.md
    C:\Users\hansi\_ACALI\ai-history\coordination\viastellis\AGENT_LOG.md

**Read AGENTS.md before making changes**, and append to AGENT_LOG.md after any
action git cannot show — a deploy, an applied migration, a secret set, a change
in an external dashboard.

Two rules worth repeating here, because they are cheap and prevent most trouble:

1. `git fetch origin` before you start. Three agents share this repo.
2. Never push to `main` or deploy the live site without Hans's explicit consent.
