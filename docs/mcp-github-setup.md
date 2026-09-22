# GitHub MCP Server Setup

This repo is configured (see `.mcp.json` at the repo root) to connect Claude
Code / Cursor to GitHub via the official GitHub MCP server, so the AI
assistant can push branches, open pull requests, and manage issues directly.

The server runs locally in Docker and authenticates with a **Personal Access
Token (PAT)** — GitHub's remote OAuth endpoint doesn't support the dynamic
client registration these CLIs expect, so a PAT is the supported path.

Each person on the team needs to do this setup once on their own machine.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed
  and **running** (check for the whale icon in your system tray/menu bar)
- Claude Code CLI (`npm install -g @anthropic-ai/claude-code`) or Cursor,
  installed and working

## 1. Create a GitHub Personal Access Token

1. Go to GitHub → click your profile photo → **Settings**
2. Scroll down to **Developer settings** (bottom of the left sidebar)
3. **Personal access tokens → Tokens (classic) → Generate new token
   (classic)**
   - Fine-grained tokens are more tightly scoped, but require the
     organization to approve fine-grained access — if you don't own the repo
     personally, it may not show up as selectable. Classic tokens avoid this
     and work immediately for any repo you're a collaborator on.
4. Give it a name (e.g. `mcp-claude-code`) and an expiration date
5. Under **Scopes**, check **`repo`** (covers push, pull requests, and
   issues)
6. Click **Generate token** and **copy it immediately** — GitHub only shows
   it once

## 2. Store the token as an environment variable

Never paste the token directly into `.mcp.json` or any file in the repo —
it's set as a local environment variable instead, referenced from
`.mcp.json` as `${GITHUB_PERSONAL_ACCESS_TOKEN}`.

### Windows

**Option A — Settings UI:**

1. Press the Windows key, search for and open **"Edit the system
   environment variables"**
2. Click **Environment Variables...**
3. Under **User variables**, click **New...**
4. Variable name: `GITHUB_PERSONAL_ACCESS_TOKEN`
5. Variable value: paste your token (no quotes)
6. Click OK on all windows to save

**Option B — PowerShell:**

```powershell
[System.Environment]::SetEnvironmentVariable("GITHUB_PERSONAL_ACCESS_TOKEN", "your_token_here", "User")
```

Either way, **fully close and reopen** your terminal / VS Code / Cursor
afterward — a window opened before the variable was set won't see it.

If PowerShell blocks `npm`/`claude` with a script-execution error, run this
once (safe, only affects your own user account):

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

### macOS / Linux

Add this line to your shell profile (`~/.zshrc`, `~/.bashrc`, etc.):

```bash
export GITHUB_PERSONAL_ACCESS_TOKEN="your_token_here"
```

Then reload it (`source ~/.zshrc`) or open a new terminal window.

## 3. Verify the connection

In a **freshly opened** terminal, confirm the variable is set:

```powershell
# PowerShell
echo $env:GITHUB_PERSONAL_ACCESS_TOKEN
```

```bash
# bash/zsh
echo $GITHUB_PERSONAL_ACCESS_TOKEN
```

Then, with Docker Desktop running, start Claude Code in the project folder
and check the MCP server status:

```
claude
```

```
claude mcp list
```

`github` should show as connected. In Cursor, the same `.mcp.json` is picked
up automatically — check its MCP settings panel to confirm the `github`
server is connected.

## Troubleshooting

| Symptom                                                                  | Fix                                                                                                                       |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| "Connection closed" / server won't connect                               | Docker Desktop isn't running — start it and retry                                                                         |
| Env var shows blank after setting it                                     | You're checking in the same window you set it in — open a new one                                                         |
| "Incompatible auth server: does not support dynamic client registration" | You're on an old config trying OAuth — this repo's `.mcp.json` already uses the PAT/Docker method instead                 |
| Repo doesn't show up when creating a fine-grained token                  | The org (IMTEL) doesn't allow fine-grained PATs, or requires approval — use a classic token with the `repo` scope instead |
| `npm`/`claude` not recognized or blocked by PowerShell                   | Run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` (see above), or use the `.cmd` variant, e.g. `claude.cmd`       |
