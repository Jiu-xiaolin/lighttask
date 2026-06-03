import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { createLightTaskServer } from "../app/server.mjs";

let runtime;
let tmp;

async function startTestServer(options = {}) {
  tmp = await mkdtemp(path.join(tmpdir(), "lighttask-v12-"));
  runtime = createLightTaskServer({
    dataDir: tmp,
    sessionIdleMs: options.sessionIdleMs ?? 24 * 60 * 60 * 1000,
    now: options.now
  });
  await runtime.start(0);
  return runtime;
}

async function stopTestServer() {
  if (runtime) {
    await runtime.stop();
    runtime = null;
  }
  if (tmp) {
    await rm(tmp, { recursive: true, force: true });
    tmp = null;
  }
}

async function api(method, pathname, body, token, ip = "127.0.0.1") {
  const response = await fetch(`${runtime.url}${pathname}`, {
    method,
    headers: {
      "content-type": "application/json",
      "x-test-ip": ip,
      ...(token ? { authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  return { response, data };
}

beforeEach(async () => {
  await startTestServer();
});

afterEach(async () => {
  await stopTestServer();
});

test("logs in, returns dashboard summary, and blocks after idle timeout", async () => {
  await stopTestServer();
  let now = Date.parse("2026-06-02T08:00:00Z");
  await startTestServer({ now: () => now });

  const login = await api("POST", "/api/auth/login", {
    username: "admin",
    password: "admin123"
  });

  assert.equal(login.response.status, 200);
  assert.match(login.data.token, /^lt_/);
  assert.equal(login.data.user.role, "super_admin");

  const dashboard = await api("GET", "/api/dashboard/summary", null, login.data.token);
  assert.equal(dashboard.response.status, 200);
  assert.equal(dashboard.data.metrics.todayActions, 3);
  assert.equal(dashboard.data.myProgress.deltaDays, -1);

  now += 24 * 60 * 60 * 1000 + 1;
  const expired = await api("GET", "/api/dashboard/summary", null, login.data.token);
  assert.equal(expired.response.status, 401);
  assert.equal(expired.data.error.code, "SESSION_IDLE_EXPIRED");
});

test("enforces user IP whitelist for login and authenticated operations", async () => {
  const adminLogin = await api("POST", "/api/auth/login", {
    username: "admin",
    password: "admin123"
  }, null, "127.0.0.1");
  assert.equal(adminLogin.response.status, 200);

  const policy = await api("PATCH", "/api/admin/users/u_member/ip-policy", {
    enabled: true
  }, adminLogin.data.token, "127.0.0.1");
  assert.equal(policy.response.status, 200);

  const entry = await api("POST", "/api/admin/users/u_member/ip-whitelist", {
    value: "10.0.0.8",
    note: "study room"
  }, adminLogin.data.token, "127.0.0.1");
  assert.equal(entry.response.status, 201);

  const blockedLogin = await api("POST", "/api/auth/login", {
    username: "member",
    password: "member123"
  }, null, "10.0.0.9");
  assert.equal(blockedLogin.response.status, 403);
  assert.equal(blockedLogin.data.error.code, "IP_NOT_ALLOWED");

  const allowedLogin = await api("POST", "/api/auth/login", {
    username: "member",
    password: "member123"
  }, null, "10.0.0.8");
  assert.equal(allowedLogin.response.status, 200);

  const blockedApi = await api("GET", "/api/projects", null, allowedLogin.data.token, "10.0.0.9");
  assert.equal(blockedApi.response.status, 403);
  assert.equal(blockedApi.data.error.code, "IP_NOT_ALLOWED");
});

test("updates member task progress and writes timeline plus directed notification", async () => {
  const login = await api("POST", "/api/auth/login", {
    username: "member",
    password: "member123"
  });
  assert.equal(login.response.status, 200);

  const completed = await api("POST", "/api/task-assignments/ta_design/complete", {
    note: "完成需求确认，进入资料整理",
    nextAction: "continue"
  }, login.data.token);
  assert.equal(completed.response.status, 200);
  assert.equal(completed.data.assignment.status, "completed");
  assert.equal(completed.data.assignment.actualEnd, "2026-06-03");

  const timeline = await api("GET", "/api/projects/p_alpha/timeline", null, login.data.token);
  assert.equal(timeline.response.status, 200);
  assert.equal(timeline.data.events[0].type, "task.assignment_completed");
  assert.equal(timeline.data.events[0].actorName, "林树");

  const notifications = await api("GET", "/api/notification-logs", null, login.data.token);
  assert.equal(notifications.response.status, 200);
  assert.equal(notifications.data.logs[0].targetMode, "creator");
  assert.match(notifications.data.logs[0].message, /完成需求确认/);
});

test("supports project file CRUD and lightweight document editing", async () => {
  const login = await api("POST", "/api/auth/login", {
    username: "admin",
    password: "admin123"
  });

  const created = await api("POST", "/api/projects/p_alpha/files", {
    name: "会议纪要",
    type: "word_doc",
    content: "# 会议纪要\n\n- 明确任务拆分"
  }, login.data.token);
  assert.equal(created.response.status, 201);

  const patched = await api("PATCH", `/api/project-files/${created.data.file.id}/document`, {
    content: "# 会议纪要\n\n- 明确任务拆分\n- 补充验收口径"
  }, login.data.token);
  assert.equal(patched.response.status, 200);
  assert.equal(patched.data.file.version, 2);

  const files = await api("GET", "/api/projects/p_alpha/files", null, login.data.token);
  assert.equal(files.response.status, 200);
  assert.equal(files.data.files.find((file) => file.name === "会议纪要").version, 2);

  const removed = await api("DELETE", `/api/project-files/${created.data.file.id}`, null, login.data.token);
  assert.equal(removed.response.status, 200);
  assert.equal(removed.data.file.deleted, true);
});

test("admin can create notification rules and revoke user sessions", async () => {
  const adminLogin = await api("POST", "/api/auth/login", {
    username: "admin",
    password: "admin123"
  });
  const memberLogin = await api("POST", "/api/auth/login", {
    username: "member",
    password: "member123"
  });

  const rule = await api("POST", "/api/notification-rules", {
    event: "task.assignment_delayed",
    channel: "feishu",
    targetMode: "custom",
    targets: ["u_admin"]
  }, adminLogin.data.token);
  assert.equal(rule.response.status, 201);
  assert.equal(rule.data.rule.targets[0], "u_admin");

  const sessions = await api("GET", "/api/admin/users/u_member/sessions", null, adminLogin.data.token);
  assert.equal(sessions.response.status, 200);
  const memberSession = sessions.data.sessions.find((session) => session.token === memberLogin.data.token);
  assert.ok(memberSession);

  const revoked = await api("DELETE", `/api/admin/users/u_member/sessions/${memberSession.id}`, null, adminLogin.data.token);
  assert.equal(revoked.response.status, 200);

  const blocked = await api("GET", "/api/projects", null, memberLogin.data.token);
  assert.equal(blocked.response.status, 401);
  assert.equal(blocked.data.error.code, "SESSION_REVOKED");
});
