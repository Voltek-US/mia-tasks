/**
 * Mia Tasks (mia-tasks) — runnable JS build.
 * =========================================================================
 * The user-facing task layer (board task 2B): a curated, persistent to-do list
 * that Mia and the user share. OpenClaw's task *registry* tracks the assistant's
 * runs and *commitments* are inferred nudges — neither is a managed executive
 * to-do list. This plugin adds that missing layer.
 *
 * It registers ONE tool, `mia_tasks`, with actions:
 *   add | list | update | done | remove
 * Tasks carry priority, dueDate, humanOwner, stakeholder, status
 * (todo/doing/waiting/blocked/done) and a slot for a linked registry task id.
 *
 * Storage: a single JSON file in the agent workspace (mia-tasks.json) — simple,
 * human-readable, and easy to surface on the dashboard later. Invisible by
 * default: no heavy UI, the agent just calls the tool.
 *
 * NOTE: index.ts is the typed source-of-truth reference. This .js file is the
 * runnable entry OpenClaw loads (see package.json "openclaw.extensions").
 */

import { definePluginEntry } from "openclaw/plugin-sdk";
import { homedir } from "node:os";
import { join } from "node:path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const STATUSES = ["todo", "doing", "waiting", "blocked", "done"];
const PRIORITIES = ["low", "normal", "high", "urgent"];
const PRIORITY_RANK = { urgent: 0, high: 1, normal: 2, low: 3 };

/** Resolve <workspace>/mia-tasks.json the same way OpenClaw resolves the workspace. */
function tasksFile() {
  const home = process.env.HOME?.trim() || process.env.USERPROFILE?.trim() || homedir();
  const explicit = process.env.OPENCLAW_WORKSPACE_DIR?.trim();
  const profile = process.env.OPENCLAW_PROFILE?.trim();
  let ws;
  if (explicit) ws = explicit;
  else if (profile && profile.toLowerCase() !== "default") ws = join(home, ".openclaw", `workspace-${profile}`);
  else ws = join(home, ".openclaw", "workspace");
  return join(ws, "mia-tasks.json");
}

function load() {
  try {
    const raw = readFileSync(tasksFile(), "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data?.tasks) ? data.tasks : [];
  } catch {
    return [];
  }
}

function save(tasks) {
  const file = tasksFile();
  mkdirSync(join(file, ".."), { recursive: true });
  writeFileSync(file, JSON.stringify({ tasks }, null, 2), "utf8");
}

function newId() {
  return `mt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function clampEnum(value, allowed, fallback) {
  const v = typeof value === "string" ? value.toLowerCase().trim() : "";
  return allowed.includes(v) ? v : fallback;
}

function str(value) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/** One-line render of a task for the agent. */
function fmt(t) {
  const bits = [`#${t.id}`, `[${t.priority}]`, t.title, `— ${t.status}`];
  if (t.dueDate) bits.push(`(due ${t.dueDate})`);
  if (t.humanOwner) bits.push(`@${t.humanOwner}`);
  if (t.stakeholder) bits.push(`for ${t.stakeholder}`);
  return bits.join(" ");
}

function result(text, details) {
  return { content: [{ type: "text", text }], details };
}

function sortTasks(tasks) {
  return [...tasks].sort((a, b) => {
    const pr = (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9);
    if (pr !== 0) return pr;
    return String(a.dueDate ?? "~").localeCompare(String(b.dueDate ?? "~"));
  });
}

const PARAMS = {
  type: "object",
  additionalProperties: false,
  required: ["action"],
  properties: {
    action: {
      type: "string",
      enum: ["add", "list", "update", "done", "remove"],
      description: "What to do with the shared to-do list.",
    },
    id: { type: "string", description: "Task id (required for update/done/remove)." },
    title: { type: "string", description: "Task title (required for add)." },
    priority: { type: "string", enum: PRIORITIES, description: "Priority. Defaults to normal." },
    dueDate: { type: "string", description: "Due date — ISO (2026-06-26) or natural ('Friday')." },
    humanOwner: { type: "string", description: "Who owns doing it (the user, a colleague)." },
    stakeholder: { type: "string", description: "Who it's for / who cares about it." },
    status: { type: "string", enum: STATUSES, description: "todo | doing | waiting | blocked | done." },
    notes: { type: "string", description: "Free-text notes." },
    filterStatus: { type: "string", enum: STATUSES, description: "list: only tasks with this status." },
  },
};

function runTool(args) {
  const a = args && typeof args === "object" ? args : {};
  const action = clampEnum(a.action, ["add", "list", "update", "done", "remove"], "");
  const tasks = load();

  if (action === "add") {
    const title = str(a.title);
    if (!title) return result('To add a task I need a "title".', { status: "failed" });
    const now = new Date().toISOString();
    const task = {
      id: newId(),
      title,
      priority: clampEnum(a.priority, PRIORITIES, "normal"),
      status: clampEnum(a.status, STATUSES, "todo"),
      dueDate: str(a.dueDate),
      humanOwner: str(a.humanOwner),
      stakeholder: str(a.stakeholder),
      notes: str(a.notes),
      linkedRegistryTaskId: undefined,
      createdAt: now,
      updatedAt: now,
    };
    tasks.push(task);
    save(tasks);
    return result(`Added: ${fmt(task)}`, { status: "ok", task });
  }

  if (action === "list") {
    const filter = clampEnum(a.filterStatus, STATUSES, "");
    const open = filter ? tasks.filter((t) => t.status === filter) : tasks.filter((t) => t.status !== "done");
    const sorted = sortTasks(open);
    if (sorted.length === 0) return result(filter ? `No ${filter} tasks.` : "No open tasks.", { status: "ok", tasks: [] });
    const text = sorted.map((t) => `• ${fmt(t)}`).join("\n");
    return result(text, { status: "ok", tasks: sorted });
  }

  if (action === "update" || action === "done" || action === "remove") {
    const id = str(a.id);
    if (!id) return result(`To ${action} a task I need its "id" (run list first).`, { status: "failed" });
    const idx = tasks.findIndex((t) => t.id === id);
    if (idx < 0) return result(`No task with id "${id}".`, { status: "failed" });

    if (action === "remove") {
      const [removed] = tasks.splice(idx, 1);
      save(tasks);
      return result(`Removed: ${fmt(removed)}`, { status: "ok", task: removed });
    }

    const task = tasks[idx];
    if (action === "done") {
      task.status = "done";
    } else {
      if (str(a.title)) task.title = str(a.title);
      if (a.priority !== undefined) task.priority = clampEnum(a.priority, PRIORITIES, task.priority);
      if (a.status !== undefined) task.status = clampEnum(a.status, STATUSES, task.status);
      if (a.dueDate !== undefined) task.dueDate = str(a.dueDate);
      if (a.humanOwner !== undefined) task.humanOwner = str(a.humanOwner);
      if (a.stakeholder !== undefined) task.stakeholder = str(a.stakeholder);
      if (a.notes !== undefined) task.notes = str(a.notes);
    }
    task.updatedAt = new Date().toISOString();
    save(tasks);
    return result(`${action === "done" ? "Completed" : "Updated"}: ${fmt(task)}`, { status: "ok", task });
  }

  return result('Unknown action. Use add | list | update | done | remove.', { status: "failed" });
}

export default definePluginEntry({
  id: "mia-tasks",
  name: "Mia Tasks",
  description: "A shared executive to-do list for Mia and the user (the user-facing task layer).",
  register(api) {
    api.registerTool(
      {
        name: "mia_tasks",
        label: "Mia Tasks",
        description:
          "Manage the user's shared to-do list. actions: add (title[,priority,dueDate,humanOwner,stakeholder,notes]), " +
          "list ([filterStatus]), update (id + fields), done (id), remove (id). " +
          "Use this for 'remind me', 'add to my list', 'what's on my list', 'mark X done'.",
        parameters: PARAMS,
        execute: async (_toolCallId, rawParams) => runTool(rawParams),
      },
      { name: "mia_tasks" },
    );
  },
});
