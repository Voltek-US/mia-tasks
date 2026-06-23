# Mia Tasks (`mia-tasks`) — 2B user-facing task layer

A curated, persistent **shared to-do list** for Mia and the user. OpenClaw's task
*registry* tracks the assistant's runs and *commitments* are inferred nudges —
neither is a managed executive to-do list. This plugin adds that missing layer.

It registers one tool, **`mia_tasks`**, that compiles standalone and is loaded by
OpenClaw via `definePluginEntry` (the official seam) — it does **not** modify the
core. `contracts.tools: ["mia_tasks"]` declares the tool.

## The tool

| action | needs | does |
|---|---|---|
| `add` | `title` (+ optional `priority`/`dueDate`/`humanOwner`/`stakeholder`/`notes`) | create a task |
| `list` | optional `filterStatus` | show open tasks (or a status), sorted by priority then due date |
| `update` | `id` + any fields | edit a task |
| `done` | `id` | mark a task done |
| `remove` | `id` | delete a task |

**Task fields:** `id`, `title`, `priority` (low/normal/high/urgent),
`status` (todo/doing/waiting/blocked/done), `dueDate`, `humanOwner`, `stakeholder`,
`notes`, `linkedRegistryTaskId` (reserved), `createdAt`, `updatedAt`.

**Example:** *"Remind me to send the board deck Friday, high priority"* →
`mia_tasks{action:"add", title:"Send the board deck", dueDate:"Friday", priority:"high"}`
→ a tracked task; *"what's on my list?"* → `mia_tasks{action:"list"}`; *"that's done"*
→ `mia_tasks{action:"done", id:"…"}`.

## Storage

A single JSON file in the agent workspace: `<workspace>/mia-tasks.json`
(default `~/.openclaw/workspace/mia-tasks.json`). Human-readable and easy to
surface on the dashboard later. Invisible by default — no heavy UI; the agent
just calls the tool.

## Install

```bash
# from ClawHub (after publish)
openclaw plugins install clawhub:@voltek-us/mia-tasks
# or local, during development
openclaw plugins install /path/to/plugins/mia-tasks --link
openclaw plugins enable mia-tasks
```

In **Mia Launcher → Control Panel → Skills & Plugins**, "Mia Tasks" appears with
an Install-from-ClawHub button and an On/Off toggle.

## Future (board 2B "reuse")

- `linkedRegistryTaskId`: when a task is *executed*, spawn an OpenClaw registry
  task and link it (so working a task shows the linked run; completing marks both
  done).
- Pull inferred **commitments** in as todo candidates the assistant proposes.

These are deliberately deferred — the board's guidance is "invisible by default,
not a heavy integration now."
