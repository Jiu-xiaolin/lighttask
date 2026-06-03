const assert = require("node:assert/strict");
const { mkdir, mkdtemp, rm } = require("node:fs/promises");
const path = require("node:path");
const { createLightTaskServer } = require("../app/server.cjs");

const tests = [];
let runtime;
let tmp;

function test(name, fn) {
  tests.push({ name, fn });
}

async function startTestServer(options = {}) {
  const parent = path.join(process.cwd(), ".test-data");
  await mkdir(parent, { recursive: true });
  tmp = await mkdtemp(path.join(parent, "lighttask-v12-"));
  runtime = createLightTaskServer({
    dataDir: tmp,
    sessionIdleMs: options.sessionIdleMs || 24 * 60 * 60 * 1000,
    now: options.now
  });
  await runtime.start(0);
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
  return { response, data: text ? JSON.parse(text) : null };
}

test("logs in, returns dashboard summary, and blocks after idle timeout", async () => {
  let now = Date.parse("2026-06-02T08:00:00Z");
  await startTestServer({ now: () => now });
  const login = await api("POST", "/api/auth/login", { username: "admin", password: "admin123" });
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
  await startTestServer();
  const adminLogin = await api("POST", "/api/auth/login", { username: "admin", password: "admin123" }, null, "127.0.0.1");
  assert.equal(adminLogin.response.status, 200);
  const policy = await api("PATCH", "/api/admin/users/u_member/ip-policy", { enabled: true }, adminLogin.data.token, "127.0.0.1");
  assert.equal(policy.response.status, 200);
  const entry = await api("POST", "/api/admin/users/u_member/ip-whitelist", { value: "10.0.0.8", note: "study room" }, adminLogin.data.token, "127.0.0.1");
  assert.equal(entry.response.status, 201);
  const blockedLogin = await api("POST", "/api/auth/login", { username: "member", password: "member123" }, null, "10.0.0.9");
  assert.equal(blockedLogin.response.status, 403);
  assert.equal(blockedLogin.data.error.code, "IP_NOT_ALLOWED");
  const allowedLogin = await api("POST", "/api/auth/login", { username: "member", password: "member123" }, null, "10.0.0.8");
  assert.equal(allowedLogin.response.status, 200);
  const blockedApi = await api("GET", "/api/projects", null, allowedLogin.data.token, "10.0.0.9");
  assert.equal(blockedApi.response.status, 403);
  assert.equal(blockedApi.data.error.code, "IP_NOT_ALLOWED");
});

test("updates member task progress and writes timeline plus directed notification", async () => {
  await startTestServer();
  const login = await api("POST", "/api/auth/login", { username: "member", password: "member123" });
  const completed = await api("POST", "/api/task-assignments/ta_design/complete", { note: "完成需求确认，进入资料整理", nextAction: "continue" }, login.data.token);
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
  await startTestServer();
  const login = await api("POST", "/api/auth/login", { username: "admin", password: "admin123" });
  const created = await api("POST", "/api/projects/p_alpha/files", { name: "会议纪要", type: "word_doc", content: "# 会议纪要\n\n- 明确任务拆分" }, login.data.token);
  assert.equal(created.response.status, 201);
  const patched = await api("PATCH", `/api/project-files/${created.data.file.id}/document`, { content: "# 会议纪要\n\n- 明确任务拆分\n- 补充验收口径" }, login.data.token);
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
  await startTestServer();
  const adminLogin = await api("POST", "/api/auth/login", { username: "admin", password: "admin123" });
  const memberLogin = await api("POST", "/api/auth/login", { username: "member", password: "member123" });
  const rule = await api("POST", "/api/notification-rules", { event: "task.assignment_delayed", channel: "feishu", targetMode: "custom", targets: ["u_admin"] }, adminLogin.data.token);
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

test("v12 project workspace supports members, tasks, progress actions, submissions, and acceptance report", async () => {
  await startTestServer();
  const ownerLogin = await api("POST", "/api/auth/login", { username: "admin", password: "admin123" });
  const memberLogin = await api("POST", "/api/auth/login", { username: "member", password: "member123" });
  const project = await api("POST", "/api/projects", { name: "六人协同验收", group: "交付", start: "2026-06-02", baselineEnd: "2026-06-12" }, ownerLogin.data.token);
  assert.equal(project.response.status, 201);
  const invited = await api("POST", `/api/projects/${project.data.project.id}/members/invite`, { userId: "u_member", role: "editor" }, ownerLogin.data.token);
  assert.equal(invited.response.status, 201);
  const task = await api("POST", `/api/projects/${project.data.project.id}/tasks`, {
    title: "整理协同表格",
    priority: "high",
    baselineStart: "2026-06-02",
    baselineEnd: "2026-06-05",
    currentStart: "2026-06-02",
    currentEnd: "2026-06-05",
    assignments: [{ userId: "u_member", planStart: "2026-06-02", planEnd: "2026-06-05" }]
  }, ownerLogin.data.token);
  assert.equal(task.response.status, 201);
  assert.equal(task.data.assignments.length, 1);
  const assignmentId = task.data.assignments[0].id;
  const delayed = await api("POST", `/api/task-assignments/${assignmentId}/delay`, { delayTo: "2026-06-07", reason: "需要等成员补齐数据" }, memberLogin.data.token);
  assert.equal(delayed.response.status, 200);
  assert.equal(delayed.data.assignment.currentEnd, "2026-06-07");
  const blocked = await api("POST", `/api/task-assignments/${assignmentId}/block`, { reason: "缺少原始统计表" }, memberLogin.data.token);
  assert.equal(blocked.response.status, 200);
  assert.equal(blocked.data.assignment.status, "blocked");
  const submission = await api("POST", `/api/task-assignments/${assignmentId}/submissions`, { name: "协同统计表.xlsx", fileType: "sheet", content: "成员,状态\n林树,已补齐" }, memberLogin.data.token);
  assert.equal(submission.response.status, 201);
  assert.equal(submission.data.submission.status, "submitted");
  const denied = await api("POST", `/api/task-submissions/${submission.data.submission.id}/accept`, { note: "成员不能验收自己的提交物" }, memberLogin.data.token);
  assert.equal(denied.response.status, 403);
  const accepted = await api("POST", `/api/task-submissions/${submission.data.submission.id}/accept`, { note: "验收通过" }, ownerLogin.data.token);
  assert.equal(accepted.response.status, 200);
  assert.equal(accepted.data.submission.status, "accepted");
  const completed = await api("POST", `/api/task-assignments/${assignmentId}/complete`, { note: "表格已提交并验收", nextAction: "rest" }, memberLogin.data.token);
  assert.equal(completed.response.status, 200);
  const collectionBox = await api("GET", `/api/projects/${project.data.project.id}/submissions`, null, ownerLogin.data.token);
  assert.equal(collectionBox.response.status, 200);
  assert.equal(collectionBox.data.submissions[0].name, "协同统计表.xlsx");
  const report = await api("POST", `/api/projects/${project.data.project.id}/acceptance/report/generate`, { note: "项目验收归档" }, ownerLogin.data.token);
  assert.equal(report.response.status, 201);
  assert.equal(report.data.report.memberStats.find((item) => item.userId === "u_member").acceptedSubmissions, 1);
  assert.equal(report.data.report.memberStats.find((item) => item.userId === "u_member").delayCount, 1);
});

test("v12 project files support unified CRUD, restore, sheet updates, and version timeline", async () => {
  await startTestServer();
  const login = await api("POST", "/api/auth/login", { username: "admin", password: "admin123" });
  const created = await api("POST", "/api/projects/p_alpha/files", { name: "轻量协同表", type: "sheet", content: [["成员", "进度"], ["林树", "60%"]] }, login.data.token);
  assert.equal(created.response.status, 201);
  const renamed = await api("PATCH", `/api/project-files/${created.data.file.id}`, { name: "轻量协同进度表", folder: "任务资料" }, login.data.token);
  assert.equal(renamed.response.status, 200);
  assert.equal(renamed.data.file.name, "轻量协同进度表");
  const sheet = await api("PATCH", `/api/project-files/${created.data.file.id}/sheet`, { cells: [["成员", "进度"], ["林树", "100%"]] }, login.data.token);
  assert.equal(sheet.response.status, 200);
  assert.equal(sheet.data.file.version, 2);
  const detail = await api("GET", `/api/project-files/${created.data.file.id}`, null, login.data.token);
  assert.equal(detail.response.status, 200);
  assert.equal(detail.data.versions.length, 2);
  const removed = await api("DELETE", `/api/project-files/${created.data.file.id}`, null, login.data.token);
  assert.equal(removed.response.status, 200);
  const restored = await api("POST", `/api/project-files/${created.data.file.id}/restore`, null, login.data.token);
  assert.equal(restored.response.status, 200);
  assert.equal(restored.data.file.deleted, false);
});

test("v12 user and admin APIs support profile, theme, password, and user CRUD", async () => {
  await startTestServer();
  const adminLogin = await api("POST", "/api/auth/login", { username: "admin", password: "admin123" });
  const createdUser = await api("POST", "/api/admin/users", { username: "tester", password: "tester123", name: "测试成员", role: "member" }, adminLogin.data.token);
  assert.equal(createdUser.response.status, 201);
  const userLogin = await api("POST", "/api/auth/login", { username: "tester", password: "tester123" });
  assert.equal(userLogin.response.status, 200);
  const profile = await api("PATCH", "/api/auth/me/profile", { name: "测试成员A", avatar: "测", signature: "协作有记录", cardBackground: "letter-paper" }, userLogin.data.token);
  assert.equal(profile.response.status, 200);
  assert.equal(profile.data.user.signature, "协作有记录");
  const theme = await api("PATCH", "/api/auth/me/theme", { theme: "love-letter", customBackground: "", blur: 16 }, userLogin.data.token);
  assert.equal(theme.response.status, 200);
  assert.equal(theme.data.user.theme, "love-letter");
  const password = await api("PATCH", "/api/auth/me/password", { oldPassword: "tester123", newPassword: "tester456" }, userLogin.data.token);
  assert.equal(password.response.status, 200);
  const oldLogin = await api("POST", "/api/auth/login", { username: "tester", password: "tester123" });
  assert.equal(oldLogin.response.status, 401);
  const newLogin = await api("POST", "/api/auth/login", { username: "tester", password: "tester456" });
  assert.equal(newLogin.response.status, 200);
  const disabled = await api("PATCH", `/api/admin/users/${createdUser.data.user.id}`, { enabled: false }, adminLogin.data.token);
  assert.equal(disabled.response.status, 200);
  const blocked = await api("POST", "/api/auth/login", { username: "tester", password: "tester456" });
  assert.equal(blocked.response.status, 401);
});

test("supports all v12 member progress actions", async () => {
  await startTestServer();
  const ownerLogin = await api("POST", "/api/auth/login", { username: "admin", password: "admin123" });
  const memberLogin = await api("POST", "/api/auth/login", { username: "member", password: "member123" });
  const remindRule = await api("POST", "/api/notification-rules", { event: "task.creator_reminded", channel: "feishu", targetMode: "creator", targets: [] }, ownerLogin.data.token);
  assert.equal(remindRule.response.status, 201);
  const abandonRule = await api("POST", "/api/notification-rules", { event: "task.assignment_abandoned", channel: "feishu", targetMode: "creator", targets: [] }, ownerLogin.data.token);
  assert.equal(abandonRule.response.status, 201);
  const task = await api("POST", "/api/projects/p_alpha/tasks", {
    title: "成员动作全链路",
    assignments: [{ userId: "u_member", planStart: "2026-06-03", planEnd: "2026-06-07" }]
  }, ownerLogin.data.token);
  assert.equal(task.response.status, 201);
  const assignmentId = task.data.assignments[0].id;
  const continued = await api("POST", `/api/task-assignments/${assignmentId}/continue`, {}, memberLogin.data.token);
  assert.equal(continued.response.status, 200);
  assert.equal(continued.data.assignment.nextAction, "continue");
  const rested = await api("POST", `/api/task-assignments/${assignmentId}/rest`, {}, memberLogin.data.token);
  assert.equal(rested.response.status, 200);
  assert.equal(rested.data.assignment.nextAction, "rest");
  const reminded = await api("POST", `/api/task-assignments/${assignmentId}/remind-creator`, {}, memberLogin.data.token);
  assert.equal(reminded.response.status, 200);
  const abandoned = await api("POST", `/api/task-assignments/${assignmentId}/abandon`, { reason: "不再需要" }, memberLogin.data.token);
  assert.equal(abandoned.response.status, 200);
  assert.equal(abandoned.data.assignment.status, "abandoned");
  const notifications = await api("GET", "/api/notification-logs", null, ownerLogin.data.token);
  assert.equal(notifications.response.status, 200);
  assert.ok(notifications.data.logs.some((log) => log.event === "task.creator_reminded" || log.event === "task.assignment_abandoned"));
});

test("supports backend task copy, archive, and restore lifecycle", async () => {
  await startTestServer();
  const ownerLogin = await api("POST", "/api/auth/login", { username: "admin", password: "admin123" });
  const viewer = await api("POST", "/api/admin/users", { username: "viewer", password: "viewer123", name: "只读成员", role: "member" }, ownerLogin.data.token);
  assert.equal(viewer.response.status, 201);
  const invited = await api("POST", "/api/projects/p_alpha/members/invite", { userId: viewer.data.user.id, role: "viewer" }, ownerLogin.data.token);
  assert.equal(invited.response.status, 201);
  const viewerLogin = await api("POST", "/api/auth/login", { username: "viewer", password: "viewer123" });
  assert.equal(viewerLogin.response.status, 200);
  const created = await api("POST", "/api/projects/p_alpha/tasks", {
    title: "后端任务生命周期",
    priority: "high",
    assignments: [{ userId: "u_member", planStart: "2026-06-03", planEnd: "2026-06-06" }]
  }, ownerLogin.data.token);
  assert.equal(created.response.status, 201);
  const copied = await api("POST", `/api/tasks/${created.data.task.id}/copy`, { title: "后端任务生命周期副本" }, ownerLogin.data.token);
  assert.equal(copied.response.status, 201);
  assert.equal(copied.data.task.title, "后端任务生命周期副本");
  assert.equal(copied.data.assignments.length, 1);
  assert.equal(copied.data.assignments[0].taskId, copied.data.task.id);
  assert.equal(copied.data.assignments[0].actualEnd, null);
  const deniedArchive = await api("POST", `/api/tasks/${created.data.task.id}/archive`, {}, viewerLogin.data.token);
  assert.equal(deniedArchive.response.status, 403);
  const archived = await api("POST", `/api/tasks/${created.data.task.id}/archive`, {}, ownerLogin.data.token);
  assert.equal(archived.response.status, 200);
  assert.equal(archived.data.task.status, "archived");
  const restored = await api("POST", `/api/tasks/${created.data.task.id}/restore`, { status: "todo" }, ownerLogin.data.token);
  assert.equal(restored.response.status, 200);
  assert.equal(restored.data.task.status, "todo");
  const timeline = await api("GET", "/api/projects/p_alpha/timeline", null, ownerLogin.data.token);
  assert.equal(timeline.response.status, 200);
  assert.ok(timeline.data.events.some((event) => event.type === "task.created" && event.message.includes("复制任务")));
  assert.ok(timeline.data.events.some((event) => event.type === "task.archived"));
  assert.ok(timeline.data.events.some((event) => event.type === "task.restored"));
});

test("supports backend-first v12 gap APIs for progress, submissions, files, dashboard, and rules", async () => {
  await startTestServer();
  const ownerLogin = await api("POST", "/api/auth/login", { username: "admin", password: "admin123" });
  const memberLogin = await api("POST", "/api/auth/login", { username: "member", password: "member123" });
  const task = await api("POST", "/api/projects/p_alpha/tasks", {
    title: "后端能力补齐",
    assignments: [{ userId: "u_member", planStart: "2026-06-03", planEnd: "2026-06-06" }]
  }, ownerLogin.data.token);
  assert.equal(task.response.status, 201);
  const assignmentId = task.data.assignments[0].id;
  const assignment = await api("GET", `/api/task-assignments/${assignmentId}`, null, memberLogin.data.token);
  assert.equal(assignment.response.status, 200);
  assert.equal(assignment.data.assignment.userId, "u_member");
  const reported = await api("POST", `/api/task-assignments/${assignmentId}/report`, { progress: 45, note: "后端上报进度" }, memberLogin.data.token);
  assert.equal(reported.response.status, 200);
  assert.equal(reported.data.assignment.progress, 45);
  const status = await api("POST", `/api/task-assignments/${assignmentId}/status`, { status: "in_progress" }, memberLogin.data.token);
  assert.equal(status.response.status, 200);
  assert.equal(status.data.assignment.status, "in_progress");
  const logs = await api("GET", `/api/task-assignments/${assignmentId}/logs`, null, ownerLogin.data.token);
  assert.equal(logs.response.status, 200);
  assert.ok(logs.data.logs.some((log) => log.type === "task.assignment_reported"));
  const submission = await api("POST", `/api/task-assignments/${assignmentId}/submissions`, { name: "后端补齐.md", fileType: "word_doc", content: "第一版" }, memberLogin.data.token);
  assert.equal(submission.response.status, 201);
  const detail = await api("GET", `/api/task-submissions/${submission.data.submission.id}`, null, memberLogin.data.token);
  assert.equal(detail.response.status, 200);
  const patched = await api("PATCH", `/api/task-submissions/${submission.data.submission.id}`, { note: "补充说明", content: "第二版" }, memberLogin.data.token);
  assert.equal(patched.response.status, 200);
  assert.equal(patched.data.submission.note, "补充说明");
  const file = await api("POST", "/api/projects/p_alpha/files", { name: "后端表格", type: "sheet", content: [["项", "值"], ["进度", "45%"]] }, ownerLogin.data.token);
  assert.equal(file.response.status, 201);
  const sheet = await api("GET", `/api/project-files/${file.data.file.id}/sheet`, null, ownerLogin.data.token);
  assert.equal(sheet.response.status, 200);
  assert.equal(sheet.data.cells[1][1], "45%");
  const moved = await api("POST", `/api/project-files/${file.data.file.id}/move`, { folder: "后端资料" }, ownerLogin.data.token);
  assert.equal(moved.response.status, 200);
  assert.equal(moved.data.file.folder, "后端资料");
  const gantt = await api("GET", "/api/dashboard/gantt", null, ownerLogin.data.token);
  assert.equal(gantt.response.status, 200);
  assert.ok(gantt.data.tasks.some((item) => item.id === task.data.task.id));
  const myProgress = await api("GET", "/api/dashboard/my-progress", null, memberLogin.data.token);
  assert.equal(myProgress.response.status, 200);
  assert.ok(myProgress.data.assignments.some((item) => item.id === assignmentId));
  const rule = await api("POST", "/api/notification-rules", { event: "task.assignment_reported", channel: "feishu", targetMode: "all", targets: [] }, ownerLogin.data.token);
  assert.equal(rule.response.status, 201);
  const copiedRule = await api("POST", `/api/notification-rules/${rule.data.rule.id}/copy`, { event: "task.assignment_reported.copy" }, ownerLogin.data.token);
  assert.equal(copiedRule.response.status, 201);
  const disabledRule = await api("PATCH", `/api/notification-rules/${copiedRule.data.rule.id}/status`, { enabled: false }, ownerLogin.data.token);
  assert.equal(disabledRule.response.status, 200);
  assert.equal(disabledRule.data.rule.enabled, false);
  const targets = await api("GET", `/api/notification-rules/${rule.data.rule.id}/targets`, null, ownerLogin.data.token);
  assert.equal(targets.response.status, 200);
  assert.ok(targets.data.targets.some((user) => user.id === "u_member"));
  const removedSubmission = await api("DELETE", `/api/task-submissions/${submission.data.submission.id}`, null, memberLogin.data.token);
  assert.equal(removedSubmission.response.status, 200);
  assert.equal(removedSubmission.data.submission.deleted, true);
  const deletedAssignment = await api("DELETE", `/api/task-assignments/${assignmentId}`, null, ownerLogin.data.token);
  assert.equal(deletedAssignment.response.status, 200);
  assert.equal(deletedAssignment.data.assignment.status, "deleted");
});

test("supports admin, acceptance, IP whitelist, and notification configuration APIs", async () => {
  await startTestServer();
  const adminLogin = await api("POST", "/api/auth/login", { username: "admin", password: "admin123" });
  const user = await api("POST", "/api/admin/users", { username: "ops", password: "ops12345", name: "运维成员", role: "member" }, adminLogin.data.token);
  assert.equal(user.response.status, 201);
  const detail = await api("GET", `/api/admin/users/${user.data.user.id}`, null, adminLogin.data.token);
  assert.equal(detail.response.status, 200);
  assert.equal(detail.data.user.username, "ops");
  const login = await api("POST", "/api/auth/login", { username: "ops", password: "ops12345" });
  assert.equal(login.response.status, 200);
  const reset = await api("POST", `/api/admin/users/${user.data.user.id}/reset-password`, { password: "ops67890" }, adminLogin.data.token);
  assert.equal(reset.response.status, 200);
  const revoked = await api("GET", "/api/projects", null, login.data.token);
  assert.equal(revoked.response.status, 401);
  const entry = await api("POST", `/api/admin/users/${user.data.user.id}/ip-whitelist`, { value: "10.1.1.8", note: "office" }, adminLogin.data.token);
  assert.equal(entry.response.status, 201);
  const patchedEntry = await api("PATCH", `/api/admin/users/${user.data.user.id}/ip-whitelist/${entry.data.entry.id}`, { value: "10.1.1.9", enabled: false }, adminLogin.data.token);
  assert.equal(patchedEntry.response.status, 200);
  assert.equal(patchedEntry.data.entry.value, "10.1.1.9");
  assert.equal(patchedEntry.data.entry.enabled, false);
  const deletedEntry = await api("DELETE", `/api/admin/users/${user.data.user.id}/ip-whitelist/${entry.data.entry.id}`, null, adminLogin.data.token);
  assert.equal(deletedEntry.response.status, 200);
  const acceptance = await api("POST", "/api/projects/p_alpha/acceptance/items", { title: "后端验收动作" }, adminLogin.data.token);
  assert.equal(acceptance.response.status, 201);
  const passed = await api("POST", `/api/acceptance-items/${acceptance.data.item.id}/pass`, { note: "通过" }, adminLogin.data.token);
  assert.equal(passed.response.status, 200);
  assert.equal(passed.data.item.status, "passed");
  const rework = await api("POST", `/api/acceptance-items/${acceptance.data.item.id}/rework`, { note: "补充资料" }, adminLogin.data.token);
  assert.equal(rework.response.status, 200);
  assert.equal(rework.data.item.status, "needs_rework");
  const rejected = await api("POST", `/api/acceptance-items/${acceptance.data.item.id}/reject`, { note: "不通过" }, adminLogin.data.token);
  assert.equal(rejected.response.status, 200);
  assert.equal(rejected.data.item.status, "rejected");
  const itemDetail = await api("GET", `/api/acceptance-items/${acceptance.data.item.id}`, null, adminLogin.data.token);
  assert.equal(itemDetail.response.status, 200);
  const channel = await api("POST", "/api/admin/notification-channels", { name: "企业微信", type: "wechat", config: { webhookMasked: "https://qyapi.weixin.qq.com/***" } }, adminLogin.data.token);
  assert.equal(channel.response.status, 201);
  const updatedChannel = await api("PATCH", `/api/admin/notification-channels/${channel.data.channel.id}`, { enabled: false }, adminLogin.data.token);
  assert.equal(updatedChannel.response.status, 200);
  assert.equal(updatedChannel.data.channel.enabled, false);
  const key = await api("POST", "/api/admin/notification-keys", { name: "飞书密钥", channelId: channel.data.channel.id, type: "webhook", secret: "super-secret-token" }, adminLogin.data.token);
  assert.equal(key.response.status, 201);
  assert.equal(key.data.key.secretMasked, "sup***ken");
  assert.equal(key.data.key.secretEncrypted, undefined);
  const keys = await api("GET", "/api/admin/notification-keys", null, adminLogin.data.token);
  assert.equal(keys.response.status, 200);
  assert.ok(keys.data.keys.some((item) => item.id === key.data.key.id));
  const updatedKey = await api("PATCH", `/api/admin/notification-keys/${key.data.key.id}`, { enabled: false, secret: "another-secret" }, adminLogin.data.token);
  assert.equal(updatedKey.response.status, 200);
  assert.equal(updatedKey.data.key.enabled, false);
  assert.equal(updatedKey.data.key.secretEncrypted, undefined);
  const deletedKey = await api("DELETE", `/api/admin/notification-keys/${key.data.key.id}`, null, adminLogin.data.token);
  assert.equal(deletedKey.response.status, 200);
  const deletedChannel = await api("DELETE", `/api/admin/notification-channels/${channel.data.channel.id}`, null, adminLogin.data.token);
  assert.equal(deletedChannel.response.status, 200);
});

test("supports remaining v12 architecture APIs for lifecycle, jobs, permissions, and system support", async () => {
  await startTestServer();
  const adminLogin = await api("POST", "/api/auth/login", { username: "admin", password: "admin123" });
  const memberLogin = await api("POST", "/api/auth/login", { username: "member", password: "member123" });
  const settings = await api("PATCH", "/api/projects/p_alpha/settings", { defaultReminder: "daily", fileDownload: "members" }, adminLogin.data.token);
  assert.equal(settings.response.status, 200);
  assert.equal(settings.data.project.settings.defaultReminder, "daily");
  const started = await api("POST", "/api/projects/p_alpha/acceptance/start", { note: "进入验收" }, adminLogin.data.token);
  assert.equal(started.response.status, 200);
  assert.equal(started.data.project.acceptanceStatus, "in_review");
  const approved = await api("POST", "/api/projects/p_alpha/acceptance/approve", { note: "验收通过" }, adminLogin.data.token);
  assert.equal(approved.response.status, 200);
  assert.equal(approved.data.project.acceptanceStatus, "approved");
  assert.ok(approved.data.frozenFiles.some((file) => file.id === "f_plan"));
  const archived = await api("POST", "/api/projects/p_alpha/archive", {}, adminLogin.data.token);
  assert.equal(archived.response.status, 200);
  assert.equal(archived.data.project.status, "archived");
  const restored = await api("POST", "/api/projects/p_alpha/restore", {}, adminLogin.data.token);
  assert.equal(restored.response.status, 200);
  assert.equal(restored.data.project.status, "active");
  const memberGantt = await api("GET", "/api/dashboard/member-gantt", null, memberLogin.data.token);
  assert.equal(memberGantt.response.status, 200);
  assert.ok(memberGantt.data.assignments.some((item) => item.userId === "u_member"));
  const view = await api("PATCH", "/api/dashboard/gantt/views", { name: "风险视图", filters: { risk: "medium" }, columns: ["owner", "delta"], zoom: "day" }, adminLogin.data.token);
  assert.equal(view.response.status, 200);
  assert.equal(view.data.view.filters.risk, "medium");
  const views = await api("GET", "/api/dashboard/gantt/views", null, adminLogin.data.token);
  assert.equal(views.response.status, 200);
  assert.ok(views.data.views.some((item) => item.id === view.data.view.id));
  const imported = await api("POST", "/api/project-files/f_plan/import", { format: "markdown", content: "# 新计划\n\n- 已导入" }, adminLogin.data.token);
  assert.equal(imported.response.status, 202);
  assert.equal(imported.data.job.type, "import");
  const exported = await api("POST", "/api/project-files/f_plan/export", { format: "markdown" }, adminLogin.data.token);
  assert.equal(exported.response.status, 202);
  assert.equal(exported.data.export.content, "# 新计划\n\n- 已导入");
  const jobs = await api("GET", "/api/import-export/jobs", null, adminLogin.data.token);
  assert.equal(jobs.response.status, 200);
  assert.ok(jobs.data.jobs.some((job) => job.type === "export"));
  const channel = await api("POST", "/api/admin/notification-channels", { name: "测试飞书", type: "feishu" }, adminLogin.data.token);
  assert.equal(channel.response.status, 201);
  const channelTest = await api("POST", `/api/admin/notification-channels/${channel.data.channel.id}/test`, { message: "渠道测试" }, adminLogin.data.token);
  assert.equal(channelTest.response.status, 200);
  assert.equal(channelTest.data.log.status, "sent");
  const key = await api("POST", "/api/admin/notification-keys", { name: "测试密钥", channelId: channel.data.channel.id, type: "webhook", secret: "secret-value" }, adminLogin.data.token);
  assert.equal(key.response.status, 201);
  const keyTest = await api("POST", `/api/admin/notification-keys/${key.data.key.id}/test`, { message: "密钥测试" }, adminLogin.data.token);
  assert.equal(keyTest.response.status, 200);
  assert.equal(keyTest.data.key.secretEncrypted, undefined);
  const retry = await api("POST", `/api/notification-logs/${channelTest.data.log.id}/retry`, {}, adminLogin.data.token);
  assert.equal(retry.response.status, 200);
  assert.equal(retry.data.log.retryCount, 1);
  const role = await api("POST", "/api/admin/role-templates", { name: "验收负责人", role: "acceptor", permissions: ["submission.accept"] }, adminLogin.data.token);
  assert.equal(role.response.status, 201);
  const copiedRole = await api("POST", `/api/admin/role-templates/${role.data.role.id}/copy`, { name: "验收负责人副本" }, adminLogin.data.token);
  assert.equal(copiedRole.response.status, 201);
  const patchedRole = await api("PATCH", `/api/admin/role-templates/${copiedRole.data.role.id}`, { permissions: ["submission.accept", "file.download"] }, adminLogin.data.token);
  assert.equal(patchedRole.response.status, 200);
  assert.equal(patchedRole.data.role.permissions.length, 2);
  const roles = await api("GET", "/api/admin/role-templates", null, adminLogin.data.token);
  assert.equal(roles.response.status, 200);
  assert.ok(roles.data.roles.some((item) => item.id === role.data.role.id));
  const scope = await api("POST", "/api/admin/permission-scopes", { key: "acceptance.report", name: "验收报告", target: "project" }, adminLogin.data.token);
  assert.equal(scope.response.status, 201);
  const patchedScope = await api("PATCH", `/api/admin/permission-scopes/${scope.data.scope.id}`, { enabled: false }, adminLogin.data.token);
  assert.equal(patchedScope.response.status, 200);
  assert.equal(patchedScope.data.scope.enabled, false);
  const scopes = await api("GET", "/api/admin/permission-scopes", null, adminLogin.data.token);
  assert.equal(scopes.response.status, 200);
  assert.ok(scopes.data.scopes.some((item) => item.key === "acceptance.report"));
  const systemEvent = await api("POST", "/api/system/events", { type: "worker.checked", message: "低资源 worker 检查完成" }, adminLogin.data.token);
  assert.equal(systemEvent.response.status, 201);
  const systemEvents = await api("GET", "/api/system/events", null, adminLogin.data.token);
  assert.equal(systemEvents.response.status, 200);
  assert.ok(systemEvents.data.events.some((item) => item.type === "worker.checked"));
  const realtime = await api("GET", "/api/realtime/status", null, memberLogin.data.token);
  assert.equal(realtime.response.status, 200);
  assert.equal(realtime.data.status.lowResourceMode, true);
  const collab = await api("POST", "/api/collaboration/events", { projectId: "p_alpha", fileId: "f_plan", type: "document.patch", payload: { op: "insert" } }, memberLogin.data.token);
  assert.equal(collab.response.status, 201);
  const collabSessions = await api("GET", "/api/collaboration/sessions", null, memberLogin.data.token);
  assert.equal(collabSessions.response.status, 200);
  assert.ok(collabSessions.data.sessions.some((item) => item.id === collab.data.event.id));
  const audit = await api("GET", "/api/admin/audit-logs?type=notification.key_tested", null, adminLogin.data.token);
  assert.equal(audit.response.status, 200);
  assert.ok(audit.data.logs.some((item) => item.type === "notification.key_tested"));
  const health = await api("GET", "/api/admin/health", null, adminLogin.data.token);
  assert.equal(health.response.status, 200);
  assert.equal(health.data.health.lowResourceMode, true);
  const deniedScope = await api("GET", "/api/admin/permission-scopes", null, memberLogin.data.token);
  assert.equal(deniedScope.response.status, 403);
});

(async () => {
  let failed = 0;
  for (const item of tests) {
    try {
      await item.fn();
      console.log(`ok - ${item.name}`);
    } catch (error) {
      failed += 1;
      console.error(`not ok - ${item.name}`);
      console.error(error);
    } finally {
      await stopTestServer();
    }
  }
  if (failed > 0) process.exitCode = 1;
})();
