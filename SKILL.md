---
name: mia-tasks
description: "Keep the user's shared to-do list — add, list, update, and complete tasks with priority, due date, owner and status. Use whenever the user wants to remember or track a task, set a reminder or deadline, or asks what's on their list or what's pending."
metadata: { "openclaw": { "emoji": "🗒️" } }
---

# Tasks — the shared to-do list

You keep a curated, persistent to-do list for the user with the `mia_tasks` tool.
This is the **human-facing** task list — separate from OpenClaw's internal run
registry and from inferred commitments. It is the source of truth for "what the
user is on the hook for".

## When to use
- The user wants to remember / track / add something, or set a reminder or deadline:
  "remind me to send the board deck Friday", "add a task to call the bank",
  "I need to follow up with Sara", "don't let me forget the invoice".
- The user asks what's pending: "what's on my list", "what's due this week",
  "what am I waiting on", "show my tasks".
- The user finishes something: "I sent it", "mark the deck done".
- You start (or finish) working a tracked task → update its status.

## How to use the `mia_tasks` tool
- **add** — capture the title, plus anything mentioned: `priority`, `dueDate`,
  `humanOwner` (who it's waiting on), `stakeholder`. Parse natural language:
  "Friday" → a due date · "high priority"/"urgent" → priority high ·
  "waiting on Sara" → humanOwner Sara + status `waiting`.
- **list** — show the current list; filter by status/priority/due when asked.
  Lead with overdue + due-soon + high priority.
- **update** — change priority/dueDate/owner/status as things change.
- **done** — mark complete when the user says it's finished, or when you finish
  executing it.
- **remove** — only when the user explicitly wants it dropped.

Status values: `todo · doing · waiting · blocked · done`.

## Working style
- **Capture first.** Record the task immediately; ask clarifying questions only
  if needed — never lose a task while gathering details.
- When you actually do a tracked task, set it `doing`, then `done` — keep the list
  honest so status reflects reality.
- Short, actionable titles. One task = one outcome.
- For a multi-step job, pair this with the structured-work discipline — mirror the
  big steps into this list so the user sees progress.

## Definition of done
- Anything the user asked to remember is in the list with the right
  priority / due date / owner; finished items are marked done; the list reflects
  reality.
