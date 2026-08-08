# Claude Code Setup — sf-next-supabase

How this repo is configured for Claude Code.

## Layout

```
CLAUDE.md                 # Thin always-on memory
CLAUDE.local.md           # Optional personal overrides (gitignored)
apps/web|api/CLAUDE.md    # Package-specific conventions
libs/CLAUDE.md            # Library import boundaries
libs/shared-types/CLAUDE.md
.claude/
├── settings.json         # Permissions, hooks, MCP allowlist
├── hooks/                # block-dangerous-bash, block-secrets, format-on-write, remind-check
├── rules/                # Path-scoped MUST/NEVER rules
├── skills/               # /check, /format, /dev-bootstrap
├── agents/               # verify-changes, api-reviewer
└── SETUP.md              # This file
.mcp.json                 # Project MCP servers (Playwright)
```

## Memory strategy

| Layer | When loaded | Purpose |
|-------|-------------|---------|
| Root `CLAUDE.md` | Every session | Commands, gotchas, pointers |
| Nested `*/CLAUDE.md` | When working in that tree | Package-specific conventions |
| `.claude/rules/*.md` with `paths:` | When matching files are read | MUST/NEVER enforcement |
| Skills / agents | On invoke or proactive match | Multi-step workflows |
| `README.md` | Only when you Read it | Full architecture — keep out of always-on context |

Verify with `/context` and `/memory`. Run `/doctor` after large CLAUDE.md edits.

## Permissions

- **Allow**: common NX typecheck/lint/dev/build, Supabase local commands, LiteLLM dev, `gh pr`, git worktree, prettier
- **Deny**: remote Supabase DB push, force-push, destructive `rm -rf` of home/root
- Hooks reinforce deny for Bash + secret writes

## Hooks

| Event | Script | Behavior |
|-------|--------|----------|
| PreToolUse Bash | `block-dangerous-bash.sh` | Deny remote DB push / force-push / bad rm |
| PreToolUse Edit\|Write | `block-secrets.sh` | Deny secret-looking content / env files |
| PostToolUse Edit\|Write | `format-on-write.sh` | Prettier on `apps/`, `libs/`, `supabase/` |
| Stop | `remind-check-on-stop.sh` | One reminder to `/check` when source is dirty |

## MCP

Project `.mcp.json` enables Playwright. Claude `settings.json` sets `enableAllProjectMcpServers: false` and `enabledMcpjsonServers: ["playwright"]`.

## Validation

```bash
NX_DAEMON=false NX_ISOLATE_PLUGINS=false yarn nx run web:typecheck
NX_DAEMON=false NX_ISOLATE_PLUGINS=false yarn nx run api:typecheck
NX_DAEMON=false NX_ISOLATE_PLUGINS=false yarn lint
```

Or invoke `/check`. Agent `verify-changes` is the adversarial reviewer.

## Personal config

- Initials / preferences: `~/.claude/CLAUDE.md`
- Per-repo personal notes: `CLAUDE.local.md` (gitignored)
- Local permission tweaks: `.claude/settings.local.json` (gitignored)
