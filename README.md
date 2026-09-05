# FX Petrodactyl Manager

A Discord bot for managing a [Pterodactyl](https://pterodactyl.io/) game-hosting panel — create/delete servers, provision panel accounts, and inspect panel inventory — straight from Discord. Built on discord.js v14 with Components V2.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env` and fill in:
   - `DISCORD_TOKEN` / `DISCORD_CLIENT_ID` — from the [Discord Developer Portal](https://discord.com/developers/applications)
   - `BOT_PREFIX` — message-command prefix (default `,,`)
   - `BOT_NAME` / `BOT_SUPPORT_LINK` — branding shown in embeds and the console banner
3. `npm start`

Slash commands are registered automatically on startup. Give the bot **Administrator** (or at least the specific permissions it needs) in any server it manages, since most commands require it.

## Project layout

```
index.js                    entrypoint: loads env, syncs emojis, deploys slash commands, wires up events
src/
  commands/
    slash/                  one file per slash command  (data + execute)
    prefix/                 one file per text command   (prefix + prefixExecute)
    shared/                 card-building + business logic shared by slash, prefix, and the listener
  events/                   ready, guildCreate, messageCreate
  listeners/                interactionCreate.js — all button/select-menu wizard handling
  utils/                    panel API client, local JSON storage, emoji cache, cooldowns, etc.
storage/                    local JSON "database" (panel config, linked accounts, emoji cache)
```

Every command that has both a slash and prefix version keeps its UI-building and validation logic in `src/commands/shared/<name>.js` so the two entry points can't drift out of sync.

## Commands

| Command | Access | Description |
|---|---|---|
| `/configure` | Admin | Link your panel URL + API key |
| `/rescan` | Admin | Re-sync servers/nodes/eggs/users from the panel |
| `/create-server` | Admin | 3-step wizard: node → egg → owner |
| `/server-delete` | Admin | Pick a server, confirm twice, delete |
| `/create-user` | Everyone | Create your own panel account |
| `/userinfo` | Everyone | View your panel account, view email, regenerate password |
| `/help` | Everyone | Command reference |
| `/ping` | Everyone | Latency check |

All except `/configure`, `/create-server`, and `/server-delete` also work as prefix commands (e.g. `,,ping`). Panel-admin commands with sensitive input (URLs, API keys) were kept slash-only to avoid credentials sitting in plain chat history — `,,configure` is the one exception and **deletes its own invoking message** immediately for the same reason; consider disabling it if that's not enough for your use case.
