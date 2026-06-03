const http = require("node:http");
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const { JsonStore, daysBetween, toDateOnly } = require("./store.cjs");

const PUBLIC_DIR = path.join(__dirname, "public");
const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "application/javascript; charset=utf-8" };

function createLightTaskServer(options = {}) {
  const now = options.now || (() => new Date());
  const sessionIdleMs = options.sessionIdleMs || 24 * 60 * 60 * 1000;
  const store = new JsonStore(options.dataDir || path.join(__dirname, ".data"), now);
  let server;

  async function start(port = Number(process.env.PORT || 4173)) {
    await store.load();
    server = http.createServer((req, res) => handle(req, res).catch((error) => {
      if (res.headersSent) {
        console.error(error);
        return;
      }
      sendError(res, 500, "SERVER_ERROR", error.message);
    }));
    await new Promise((resolve) => server.listen(port, resolve));
    return runtime;
  }

  async function stop() {
    if (!server) return;
    await new Promise((resolve) => server.close(resolve));
    server = null;
  }

  async function handle(req, res) {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname.startsWith("/api/")) return handleApi(req, res, url);
    return serveStatic(res, url);
  }

  async function handleApi(req, res, url) {
    const route = matchRoute(req.method, url.pathname);
    if (!route) return sendError(res, 404, "NOT_FOUND", "接口不存在");
    const body = await readJson(req);
    let auth = null;
    if (`${req.method} ${route.pattern}` !== "POST /api/auth/login") {
      auth = authenticate(req);
      if (auth.error) return sendJson(res, auth.status, { error: auth.error });
    }
    await route.handler({ req, res, url, body, params: route.params, auth, data: store.data, ip: getRequestIp(req) });
    await store.save();
  }

  function currentDate() {
    const value = now();
    return value instanceof Date ? value : new Date(value);
  }

  function currentDay() {
    return toDateOnly(currentDate());
  }

  function authenticate(req) {
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!token) return authError(401, "NO_TOKEN", "需要登录");
    const session = store.data.sessions.find((item) => item.token === token);
    if (!session) return authError(401, "INVALID_SESSION", "登录状态不存在");
    if (session.revoked) return authError(401, "SESSION_REVOKED", "登录状态已失效");
    const user = store.data.users.find((item) => item.id === session.userId);
    if (!user || !user.enabled) return authError(401, "USER_DISABLED", "用户不可用");
    if (currentDate().getTime() - Date.parse(session.lastActivityAt) > sessionIdleMs) {
      session.revoked = true;
      session.revokedReason = "idle_timeout";
      addAudit("security.session_idle_expired", user.id, `用户 ${user.name} 24 小时未操作，会话失效`);
      return authError(401, "SESSION_IDLE_EXPIRED", "登录状态已超过 24 小时未操作");
    }
    const ip = getRequestIp(req);
    if (!isIpAllowed(user.id, ip)) {
      session.revoked = true;
      session.revokedReason = "ip_not_allowed";
      addAudit("security.ip_whitelist_blocked", user.id, `用户 ${user.name} 从 ${ip} 访问被 IP 白名单拦截`);
      return authError(403, "IP_NOT_ALLOWED", "当前网络不允许访问");
    }
    session.lastActivityAt = currentDate().toISOString();
    return { user, session };
  }

  function authError(status, code, message) {
    return { status, error: { code, message } };
  }

  function addAudit(type, actorId, message) {
    store.data.auditLogs.unshift({ id: store.nextId("audit"), type, actorId, message, createdAt: currentDate().toISOString() });
  }

  function addTimeline(projectId, type, actor, message, color = "blue") {
    store.data.timelineEvents.unshift({ id: store.nextId("ev"), projectId, type, actorId: actor.id, actorName: actor.name, message, color, createdAt: currentDate().toISOString() });
  }

  function addNotification(event, projectId, actor, message) {
    const rules = store.data.notificationRules.filter((rule) => rule.enabled && rule.event === event);
    for (const rule of rules) {
      store.data.notificationLogs.unshift({ id: store.nextId("nl"), ruleId: rule.id, event, projectId, channel: rule.channel, targetMode: rule.targetMode, targets: resolveTargets(rule, projectId, actor), status: "queued", message, createdAt: currentDate().toISOString() });
    }
  }

  function resolveTargets(rule, projectId, actor) {
    if (rule.targetMode === "creator") {
      const project = store.data.projects.find((item) => item.id === projectId);
      return project ? [project.ownerId] : [];
    }
    if (rule.targetMode === "responsible") return [actor.id];
    if (rule.targetMode === "all") return store.data.projectMembers.filter((item) => item.projectId === projectId).map((item) => item.userId);
    return rule.targets || [];
  }

  function canAccessProject(user, projectId) {
    if (user.role === "super_admin") return true;
    return store.data.projectMembers.some((member) => member.projectId === projectId && member.userId === user.id);
  }

  function projectMember(userId, projectId) {
    return store.data.projectMembers.find((member) => member.projectId === projectId && member.userId === userId);
  }

  function canManageProject(user, projectId) {
    if (user.role === "super_admin") return true;
    const project = store.data.projects.find((item) => item.id === projectId);
    if (project && project.ownerId === user.id) return true;
    const member = projectMember(user.id, projectId);
    return Boolean(member && ["owner", "admin"].includes(member.role));
  }

  function canEditProject(user, projectId) {
    if (canManageProject(user, projectId)) return true;
    const member = projectMember(user.id, projectId);
    return Boolean(member && ["editor"].includes(member.role));
  }

  function isAdmin(user) {
    return user.role === "super_admin";
  }

  function visibleProjects(user) {
    if (user.role === "super_admin") return store.data.projects.filter((project) => project.status !== "deleted");
    const ids = new Set(store.data.projectMembers.filter((member) => member.userId === user.id).map((member) => member.projectId));
    return store.data.projects.filter((project) => ids.has(project.id) && project.status !== "deleted");
  }

  function requireProject(ctx, projectId) {
    const project = store.data.projects.find((item) => item.id === projectId && item.status !== "deleted");
    if (!project || !canAccessProject(ctx.auth.user, projectId)) return null;
    return project;
  }

  function getAccessibleFile(ctx, fileId) {
    const file = store.data.projectFiles.find((item) => item.id === fileId && !item.deleted);
    if (!file || !canAccessProject(ctx.auth.user, file.projectId)) return null;
    return file;
  }

  function getFileIncludingDeleted(ctx, fileId) {
    const file = store.data.projectFiles.find((item) => item.id === fileId);
    if (!file || !canAccessProject(ctx.auth.user, file.projectId)) return null;
    return file;
  }

  function getTask(ctx, taskId) {
    const task = store.data.tasks.find((item) => item.id === taskId && item.status !== "deleted");
    if (!task || !canAccessProject(ctx.auth.user, task.projectId)) return null;
    return task;
  }

  function getAssignment(ctx, assignmentId) {
    const assignment = store.data.taskAssignments.find((item) => item.id === assignmentId && item.status !== "deleted");
    if (!assignment || !canAccessProject(ctx.auth.user, assignment.projectId)) return null;
    return assignment;
  }

  function canUpdateAssignment(user, assignment) {
    return user.role === "super_admin" || assignment.userId === user.id || canManageProject(user, assignment.projectId);
  }

  function canAcceptSubmission(user, submission) {
    return user.role === "super_admin" || canManageProject(user, submission.projectId);
  }

  function normalizeFileContent(type, content) {
    if (content === undefined || content === null) {
      if (type === "sheet") return JSON.stringify([["字段", "值"], ["状态", "待填写"]]);
      return "";
    }
    if (typeof content === "string") return content;
    return JSON.stringify(content);
  }

  function addFileVersion(file, actor, kind = "updated") {
    const version = { id: store.nextId("fv"), fileId: file.id, projectId: file.projectId, version: file.version, content: file.content, createdBy: actor.id, createdAt: currentDate().toISOString(), kind };
    store.data.fileVersions.unshift(version);
    return version;
  }

  function publicProject(project) {
    return { ...project, members: store.data.projectMembers.filter((member) => member.projectId === project.id) };
  }

  function publicAssignment(assignment) {
    const user = store.data.users.find((item) => item.id === assignment.userId);
    return { ...assignment, userName: user ? user.name : assignment.userId, submissions: store.data.taskSubmissions.filter((item) => item.assignmentId === assignment.id && !item.deleted) };
  }

  function getSubmission(ctx, submissionId) {
    const submission = store.data.taskSubmissions.find((item) => item.id === submissionId && !item.deleted);
    if (!submission || !canAccessProject(ctx.auth.user, submission.projectId)) return null;
    if (!canManageProject(ctx.auth.user, submission.projectId) && ctx.auth.user.id !== submission.userId) return null;
    return submission;
  }

  function parseSheet(file) {
    try {
      return JSON.parse(file.content || "[]");
    } catch {
      return [];
    }
  }

  function timelineForAssignment(assignment) {
    const task = store.data.tasks.find((item) => item.id === assignment.taskId);
    return store.data.timelineEvents.filter((event) => event.projectId === assignment.projectId && (!task || event.message.includes(task.title) || event.actorId === assignment.userId));
  }

  function requireNotificationRule(ctx, ruleId) {
    if (!isAdmin(ctx.auth.user)) return { error: sendError(ctx.res, 403, "FORBIDDEN", "需要管理员权限") };
    const rule = store.data.notificationRules.find((item) => item.id === ruleId);
    if (!rule) return { error: sendError(ctx.res, 404, "RULE_NOT_FOUND", "消息规则不存在") };
    return { rule };
  }

  function publicRuleTargets(rule) {
    const projectIds = visibleProjects({ role: "super_admin" }).map((project) => project.id);
    const targets = new Set(rule.targets || []);
    if (rule.targetMode === "creator") {
      for (const project of store.data.projects.filter((item) => projectIds.includes(item.id))) targets.add(project.ownerId);
    }
    if (rule.targetMode === "all") {
      for (const member of store.data.projectMembers.filter((item) => projectIds.includes(item.projectId))) targets.add(member.userId);
    }
    return [...targets].map((userId) => publicUser(store.data.users.find((user) => user.id === userId) || { id: userId, username: userId, name: userId }));
  }

  function maskedSecret(value) {
    const text = String(value || "");
    if (!text) return "";
    if (text.length <= 6) return "***";
    return `${text.slice(0, 3)}***${text.slice(-3)}`;
  }

  function encodeSecret(value) {
    return Buffer.from(String(value || ""), "utf8").toString("base64");
  }

  function publicNotificationKey(key) {
    return { id: key.id, name: key.name, channelId: key.channelId, type: key.type, enabled: key.enabled, secretMasked: key.secretMasked, createdAt: key.createdAt, updatedAt: key.updatedAt };
  }

  function publicGanttView(view) {
    return { id: view.id, userId: view.userId, name: view.name, filters: view.filters || {}, columns: view.columns || [], zoom: view.zoom || "week", updatedAt: view.updatedAt };
  }

  function createImportExportJob(type, file, actor, payload = {}) {
    const job = { id: store.nextId("job"), type, projectId: file.projectId, fileId: file.id, status: "completed", requestedBy: actor.id, createdAt: currentDate().toISOString(), finishedAt: currentDate().toISOString(), payload };
    store.data.importExportJobs.unshift(job);
    return job;
  }

  function addSystemEvent(type, actor, message, level = "info") {
    const event = { id: store.nextId("se"), type, actorId: actor.id, actorName: actor.name, message, level, createdAt: currentDate().toISOString() };
    store.data.systemEvents.unshift(event);
    return event;
  }

  function updateAcceptanceItem(ctx, status, eventType, color) {
    const item = store.data.acceptanceItems.find((entry) => entry.id === ctx.params.itemId);
    if (!item || !canAccessProject(ctx.auth.user, item.projectId)) return sendError(ctx.res, 404, "ACCEPTANCE_ITEM_NOT_FOUND", "验收项不存在或无权限");
    if (!canManageProject(ctx.auth.user, item.projectId)) return sendError(ctx.res, 403, "FORBIDDEN", "无验收项操作权限");
    item.status = status;
    item.note = ctx.body.note || item.note || "";
    item.reviewedBy = ctx.auth.user.id;
    item.reviewedAt = currentDate().toISOString();
    addTimeline(item.projectId, eventType, ctx.auth.user, `${item.title}：${item.note || status}`, color);
    sendJson(ctx.res, 200, { item });
  }

  function getOrCreateIpPolicy(userId) {
    let policy = store.data.userIpPolicies.find((item) => item.userId === userId);
    if (!policy) {
      policy = { userId, enabled: false, updatedBy: "system", updatedAt: currentDay() };
      store.data.userIpPolicies.push(policy);
    }
    return policy;
  }

  function revokeMismatchedSessions(userId) {
    for (const session of store.data.sessions.filter((item) => item.userId === userId && !item.revoked)) {
      if (!isIpAllowed(userId, session.ip)) {
        session.revoked = true;
        session.revokedReason = "ip_policy_changed";
      }
    }
  }

  function isIpAllowed(userId, ip) {
    const policy = store.data.userIpPolicies.find((item) => item.userId === userId);
    if (!policy || !policy.enabled) return true;
    return store.data.userIpWhitelistEntries.filter((entry) => entry.userId === userId && entry.enabled !== false).some((entry) => matchIp(entry.value, ip));
  }

  const routes = [
    ["POST", "/api/auth/login", async (ctx) => {
      const { username, password } = ctx.body || {};
      const user = store.data.users.find((item) => item.username === username && item.password === password);
      if (!user || !user.enabled) {
        addAudit("security.login_failed", "anonymous", `账号 ${username || "-"} 登录失败`);
        return sendError(ctx.res, 401, "INVALID_CREDENTIALS", "账号或密码错误");
      }
      if (!isIpAllowed(user.id, ctx.ip)) {
        addAudit("security.ip_whitelist_blocked", user.id, `用户 ${user.name} 从 ${ctx.ip} 登录被 IP 白名单拦截`);
        return sendError(ctx.res, 403, "IP_NOT_ALLOWED", "当前网络不允许访问");
      }
      const token = `lt_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
      const createdAt = currentDate().toISOString();
      store.data.sessions.push({ id: store.nextId("sess"), token, userId: user.id, ip: ctx.ip, userAgent: ctx.req.headers["user-agent"] || "", createdAt, lastActivityAt: createdAt, revoked: false, revokedReason: null });
      addAudit("security.login_succeeded", user.id, `用户 ${user.name} 登录成功`);
      sendJson(ctx.res, 200, { token, user: publicUser(user) });
    }],
    ["POST", "/api/auth/logout", async (ctx) => {
      ctx.auth.session.revoked = true;
      ctx.auth.session.revokedReason = "logout";
      addAudit("security.session_revoked", ctx.auth.user.id, `用户 ${ctx.auth.user.name} 退出登录`);
      sendJson(ctx.res, 200, { ok: true });
    }],
    ["POST", "/api/auth/refresh", async (ctx) => sendJson(ctx.res, 200, { token: ctx.auth.session.token, user: publicUser(ctx.auth.user) })],
    ["GET", "/api/auth/me", async (ctx) => sendJson(ctx.res, 200, { user: publicUser(ctx.auth.user) })],
    ["PATCH", "/api/auth/me/profile", async (ctx) => {
      const user = ctx.auth.user;
      for (const field of ["name", "avatar", "signature", "cardBackground"]) {
        if (ctx.body[field] !== undefined) user[field] = String(ctx.body[field]);
      }
      addAudit("user.profile_updated", user.id, `用户 ${user.name} 更新个人资料`);
      sendJson(ctx.res, 200, { user: publicUser(user) });
    }],
    ["PATCH", "/api/auth/me/theme", async (ctx) => {
      const user = ctx.auth.user;
      if (ctx.body.theme !== undefined) user.theme = String(ctx.body.theme);
      user.themeConfig = {
        ...(user.themeConfig || {}),
        ...(ctx.body.customBackground !== undefined ? { customBackground: String(ctx.body.customBackground) } : {}),
        ...(ctx.body.blur !== undefined ? { blur: Number(ctx.body.blur) } : {})
      };
      addAudit("user.theme_updated", user.id, `用户 ${user.name} 更新全局皮肤`);
      sendJson(ctx.res, 200, { user: publicUser(user) });
    }],
    ["PATCH", "/api/auth/me/password", async (ctx) => {
      const { oldPassword, newPassword } = ctx.body || {};
      if (!oldPassword || !newPassword || ctx.auth.user.password !== oldPassword) return sendError(ctx.res, 400, "PASSWORD_INVALID", "旧密码不正确");
      if (String(newPassword).length < 6) return sendError(ctx.res, 400, "PASSWORD_TOO_SHORT", "新密码至少 6 位");
      ctx.auth.user.password = String(newPassword);
      addAudit("security.password_updated", ctx.auth.user.id, `用户 ${ctx.auth.user.name} 修改密码`);
      sendJson(ctx.res, 200, { ok: true });
    }],
    ["GET", "/api/dashboard/summary", async (ctx) => {
      const projects = visibleProjects(ctx.auth.user);
      const assignments = store.data.taskAssignments.filter((item) => canAccessProject(ctx.auth.user, item.projectId));
      sendJson(ctx.res, 200, {
        metrics: { activeProjects: projects.length, todayActions: 3, pendingFiles: store.data.projectFiles.filter((item) => !item.deleted && item.type === "submission").length, riskProjects: projects.filter((project) => project.risk !== "low").length, myProgress: assignments.filter((item) => item.userId === ctx.auth.user.id && item.status === "completed").length, deltaDays: -1 },
        myProgress: { todayDone: 2, weekDone: 9, monthDone: 27, expectedFinish: "2026-06-29", deltaDays: -1 },
        gantt: store.data.tasks.filter((task) => projects.some((project) => project.id === task.projectId)).map((task) => ({ ...task, assignments: store.data.taskAssignments.filter((item) => item.taskId === task.id) }))
      });
    }],
    ["GET", "/api/dashboard/gantt", async (ctx) => {
      const projectIds = new Set(visibleProjects(ctx.auth.user).map((project) => project.id));
      const tasks = store.data.tasks.filter((task) => projectIds.has(task.projectId) && task.status !== "deleted").map((task) => ({ ...task, assignments: store.data.taskAssignments.filter((item) => item.taskId === task.id && item.status !== "deleted").map(publicAssignment) }));
      sendJson(ctx.res, 200, { tasks });
    }],
    ["GET", "/api/dashboard/my-progress", async (ctx) => {
      const assignments = store.data.taskAssignments.filter((item) => item.userId === ctx.auth.user.id && item.status !== "deleted" && canAccessProject(ctx.auth.user, item.projectId)).map(publicAssignment);
      sendJson(ctx.res, 200, { assignments, stats: { total: assignments.length, completed: assignments.filter((item) => item.status === "completed").length, delayed: assignments.filter((item) => item.status === "delayed").length, blocked: assignments.filter((item) => item.status === "blocked").length } });
    }],
    ["GET", "/api/dashboard/member-gantt", async (ctx) => {
      const projectIds = new Set(visibleProjects(ctx.auth.user).map((project) => project.id));
      const assignments = store.data.taskAssignments.filter((item) => item.status !== "deleted" && projectIds.has(item.projectId)).map((assignment) => {
        const task = store.data.tasks.find((item) => item.id === assignment.taskId);
        const project = store.data.projects.find((item) => item.id === assignment.projectId);
        return { ...publicAssignment(assignment), taskTitle: task ? task.title : assignment.taskId, projectName: project ? project.name : assignment.projectId, baselineStart: task ? task.baselineStart : assignment.planStart, baselineEnd: task ? task.baselineEnd : assignment.planEnd };
      });
      sendJson(ctx.res, 200, { assignments });
    }],
    ["GET", "/api/dashboard/gantt/views", async (ctx) => {
      const views = store.data.ganttViews.filter((view) => view.userId === ctx.auth.user.id).map(publicGanttView);
      sendJson(ctx.res, 200, { views, defaultView: views[0] || null });
    }],
    ["PATCH", "/api/dashboard/gantt/views", async (ctx) => {
      let view = store.data.ganttViews.find((item) => item.id === ctx.body.id && item.userId === ctx.auth.user.id);
      if (!view) {
        view = { id: store.nextId("gv"), userId: ctx.auth.user.id, name: ctx.body.name || "默认视图", filters: {}, columns: [], zoom: "week", updatedAt: currentDate().toISOString() };
        store.data.ganttViews.unshift(view);
      }
      for (const field of ["name", "filters", "columns", "zoom"]) {
        if (ctx.body[field] !== undefined) view[field] = ctx.body[field];
      }
      view.updatedAt = currentDate().toISOString();
      sendJson(ctx.res, 200, { view: publicGanttView(view) });
    }],
    ["GET", "/api/projects", async (ctx) => sendJson(ctx.res, 200, { projects: visibleProjects(ctx.auth.user) })],
    ["POST", "/api/projects", async (ctx) => {
      const project = { id: store.nextId("p"), name: ctx.body.name || "新项目", group: ctx.body.group || "默认分组", ownerId: ctx.auth.user.id, status: "active", progress: 0, risk: "low", start: ctx.body.start || currentDay(), baselineEnd: ctx.body.baselineEnd || currentDay(), currentEnd: ctx.body.currentEnd || ctx.body.baselineEnd || currentDay(), description: ctx.body.description || "" };
      store.data.projects.unshift(project);
      store.data.projectMembers.push({ id: store.nextId("pm"), projectId: project.id, userId: ctx.auth.user.id, role: "owner" });
      addTimeline(project.id, "project.created", ctx.auth.user, `创建项目：${project.name}`);
      sendJson(ctx.res, 201, { project });
    }],
    ["GET", "/api/projects/:projectId", async (ctx) => {
      const project = requireProject(ctx, ctx.params.projectId);
      if (!project) return sendError(ctx.res, 404, "PROJECT_NOT_FOUND", "项目不存在或无权限");
      sendJson(ctx.res, 200, { project: publicProject(project) });
    }],
    ["PATCH", "/api/projects/:projectId", async (ctx) => {
      const project = requireProject(ctx, ctx.params.projectId);
      if (!project) return sendError(ctx.res, 404, "PROJECT_NOT_FOUND", "项目不存在或无权限");
      if (!canManageProject(ctx.auth.user, project.id)) return sendError(ctx.res, 403, "FORBIDDEN", "无项目管理权限");
      for (const field of ["name", "group", "description", "progress", "risk", "start", "baselineEnd", "currentEnd", "status"]) {
        if (ctx.body[field] !== undefined) project[field] = ctx.body[field];
      }
      addTimeline(project.id, "project.updated", ctx.auth.user, `更新项目：${project.name}`, "blue");
      sendJson(ctx.res, 200, { project });
    }],
    ["DELETE", "/api/projects/:projectId", async (ctx) => {
      const project = requireProject(ctx, ctx.params.projectId);
      if (!project) return sendError(ctx.res, 404, "PROJECT_NOT_FOUND", "项目不存在或无权限");
      if (!canManageProject(ctx.auth.user, project.id)) return sendError(ctx.res, 403, "FORBIDDEN", "无项目管理权限");
      project.status = "deleted";
      addTimeline(project.id, "project.deleted", ctx.auth.user, `删除项目：${project.name}`, "red");
      sendJson(ctx.res, 200, { project });
    }],
    ["POST", "/api/projects/:projectId/archive", async (ctx) => {
      const project = requireProject(ctx, ctx.params.projectId);
      if (!project) return sendError(ctx.res, 404, "PROJECT_NOT_FOUND", "项目不存在或无权限");
      if (!canManageProject(ctx.auth.user, project.id)) return sendError(ctx.res, 403, "FORBIDDEN", "无项目归档权限");
      project.status = "archived";
      project.archivedAt = currentDate().toISOString();
      project.archivedBy = ctx.auth.user.id;
      addTimeline(project.id, "project.archived", ctx.auth.user, `归档项目：${project.name}`, "purple");
      sendJson(ctx.res, 200, { project });
    }],
    ["POST", "/api/projects/:projectId/restore", async (ctx) => {
      const project = store.data.projects.find((item) => item.id === ctx.params.projectId && item.status !== "deleted");
      if (!project || !canAccessProject(ctx.auth.user, project.id)) return sendError(ctx.res, 404, "PROJECT_NOT_FOUND", "项目不存在或无权限");
      if (!canManageProject(ctx.auth.user, project.id)) return sendError(ctx.res, 403, "FORBIDDEN", "无项目恢复权限");
      project.status = "active";
      project.restoredAt = currentDate().toISOString();
      project.restoredBy = ctx.auth.user.id;
      addTimeline(project.id, "project.restored", ctx.auth.user, `恢复项目：${project.name}`, "green");
      sendJson(ctx.res, 200, { project });
    }],
    ["PATCH", "/api/projects/:projectId/settings", async (ctx) => {
      const project = requireProject(ctx, ctx.params.projectId);
      if (!project) return sendError(ctx.res, 404, "PROJECT_NOT_FOUND", "项目不存在或无权限");
      if (!canManageProject(ctx.auth.user, project.id)) return sendError(ctx.res, 403, "FORBIDDEN", "无项目设置权限");
      project.settings = { ...(project.settings || {}), ...(ctx.body || {}) };
      addTimeline(project.id, "project.settings_updated", ctx.auth.user, `更新项目设置：${project.name}`, "blue");
      sendJson(ctx.res, 200, { project });
    }],
    ["GET", "/api/projects/:projectId/members", async (ctx) => {
      const project = requireProject(ctx, ctx.params.projectId);
      if (!project) return sendError(ctx.res, 404, "PROJECT_NOT_FOUND", "项目不存在或无权限");
      const members = store.data.projectMembers.filter((member) => member.projectId === project.id).map((member) => ({ ...member, user: publicUser(store.data.users.find((user) => user.id === member.userId) || {}) }));
      sendJson(ctx.res, 200, { members });
    }],
    ["POST", "/api/projects/:projectId/members/invite", async (ctx) => {
      const project = requireProject(ctx, ctx.params.projectId);
      if (!project) return sendError(ctx.res, 404, "PROJECT_NOT_FOUND", "项目不存在或无权限");
      if (!canManageProject(ctx.auth.user, project.id)) return sendError(ctx.res, 403, "FORBIDDEN", "无邀请成员权限");
      const user = store.data.users.find((item) => item.id === ctx.body.userId || item.username === ctx.body.username);
      if (!user || !user.enabled) return sendError(ctx.res, 404, "USER_NOT_FOUND", "用户不存在");
      let member = projectMember(user.id, project.id);
      const status = member ? 200 : 201;
      if (member) member.role = ctx.body.role || member.role;
      else {
        member = { id: store.nextId("pm"), projectId: project.id, userId: user.id, role: ctx.body.role || "editor" };
        store.data.projectMembers.push(member);
      }
      addTimeline(project.id, "project.member_invited", ctx.auth.user, `邀请成员：${user.name}`, "green");
      sendJson(ctx.res, status, { member: { ...member, user: publicUser(user) } });
    }],
    ["PATCH", "/api/projects/:projectId/members/:memberId", async (ctx) => {
      const project = requireProject(ctx, ctx.params.projectId);
      if (!project) return sendError(ctx.res, 404, "PROJECT_NOT_FOUND", "项目不存在或无权限");
      if (!canManageProject(ctx.auth.user, project.id)) return sendError(ctx.res, 403, "FORBIDDEN", "无成员管理权限");
      const member = store.data.projectMembers.find((item) => item.id === ctx.params.memberId && item.projectId === project.id);
      if (!member) return sendError(ctx.res, 404, "MEMBER_NOT_FOUND", "成员不存在");
      if (ctx.body.role) member.role = ctx.body.role;
      addTimeline(project.id, "project.member_updated", ctx.auth.user, `更新成员权限：${member.userId}`, "blue");
      sendJson(ctx.res, 200, { member });
    }],
    ["DELETE", "/api/projects/:projectId/members/:memberId", async (ctx) => {
      const project = requireProject(ctx, ctx.params.projectId);
      if (!project) return sendError(ctx.res, 404, "PROJECT_NOT_FOUND", "项目不存在或无权限");
      if (!canManageProject(ctx.auth.user, project.id)) return sendError(ctx.res, 403, "FORBIDDEN", "无成员管理权限");
      const index = store.data.projectMembers.findIndex((item) => item.id === ctx.params.memberId && item.projectId === project.id);
      if (index === -1) return sendError(ctx.res, 404, "MEMBER_NOT_FOUND", "成员不存在");
      const [member] = store.data.projectMembers.splice(index, 1);
      addTimeline(project.id, "project.member_removed", ctx.auth.user, `移除成员：${member.userId}`, "red");
      sendJson(ctx.res, 200, { member });
    }],
    ["GET", "/api/projects/:projectId/tasks", async (ctx) => {
      const project = requireProject(ctx, ctx.params.projectId);
      if (!project) return sendError(ctx.res, 404, "PROJECT_NOT_FOUND", "项目不存在或无权限");
      const tasks = store.data.tasks.filter((task) => task.projectId === project.id && task.status !== "deleted").map((task) => ({ ...task, assignments: store.data.taskAssignments.filter((item) => item.taskId === task.id && item.status !== "deleted").map(publicAssignment) }));
      sendJson(ctx.res, 200, { tasks });
    }],
    ["POST", "/api/projects/:projectId/tasks", async (ctx) => {
      const project = requireProject(ctx, ctx.params.projectId);
      if (!project) return sendError(ctx.res, 404, "PROJECT_NOT_FOUND", "项目不存在或无权限");
      if (!canEditProject(ctx.auth.user, project.id)) return sendError(ctx.res, 403, "FORBIDDEN", "无任务创建权限");
      const task = {
        id: store.nextId("t"),
        projectId: project.id,
        title: ctx.body.title || "未命名任务",
        status: ctx.body.status || "todo",
        priority: ctx.body.priority || "medium",
        baselineStart: ctx.body.baselineStart || currentDay(),
        baselineEnd: ctx.body.baselineEnd || ctx.body.currentEnd || currentDay(),
        currentStart: ctx.body.currentStart || ctx.body.baselineStart || currentDay(),
        currentEnd: ctx.body.currentEnd || ctx.body.baselineEnd || currentDay(),
        dependencyIds: ctx.body.dependencyIds || [],
        note: ctx.body.note || ""
      };
      store.data.tasks.unshift(task);
      const assignments = (ctx.body.assignments || []).map((item) => {
        const assignment = { id: store.nextId("ta"), taskId: task.id, projectId: project.id, userId: item.userId, status: "todo", planStart: item.planStart || task.baselineStart, planEnd: item.planEnd || task.baselineEnd, currentEnd: item.currentEnd || item.planEnd || task.currentEnd, actualStart: null, actualEnd: null, deltaDays: null, note: item.note || "" };
        store.data.taskAssignments.push(assignment);
        return assignment;
      });
      addTimeline(project.id, "task.created", ctx.auth.user, `创建任务：${task.title}`, "blue");
      sendJson(ctx.res, 201, { task, assignments });
    }],
    ["GET", "/api/tasks/:taskId", async (ctx) => {
      const task = getTask(ctx, ctx.params.taskId);
      if (!task) return sendError(ctx.res, 404, "TASK_NOT_FOUND", "任务不存在或无权限");
      sendJson(ctx.res, 200, { task: { ...task, assignments: store.data.taskAssignments.filter((item) => item.taskId === task.id && item.status !== "deleted").map(publicAssignment) } });
    }],
    ["PATCH", "/api/tasks/:taskId", async (ctx) => {
      const task = getTask(ctx, ctx.params.taskId);
      if (!task) return sendError(ctx.res, 404, "TASK_NOT_FOUND", "任务不存在或无权限");
      if (!canEditProject(ctx.auth.user, task.projectId)) return sendError(ctx.res, 403, "FORBIDDEN", "无任务编辑权限");
      for (const field of ["title", "status", "priority", "baselineStart", "baselineEnd", "currentStart", "currentEnd", "dependencyIds", "note"]) {
        if (ctx.body[field] !== undefined) task[field] = ctx.body[field];
      }
      addTimeline(task.projectId, "task.updated", ctx.auth.user, `更新任务：${task.title}`, "blue");
      sendJson(ctx.res, 200, { task });
    }],
    ["DELETE", "/api/tasks/:taskId", async (ctx) => {
      const task = getTask(ctx, ctx.params.taskId);
      if (!task) return sendError(ctx.res, 404, "TASK_NOT_FOUND", "任务不存在或无权限");
      if (!canEditProject(ctx.auth.user, task.projectId)) return sendError(ctx.res, 403, "FORBIDDEN", "无任务删除权限");
      task.status = "deleted";
      addTimeline(task.projectId, "task.deleted", ctx.auth.user, `删除任务：${task.title}`, "red");
      sendJson(ctx.res, 200, { task });
    }],
    ["POST", "/api/tasks/:taskId/copy", async (ctx) => {
      const source = getTask(ctx, ctx.params.taskId);
      if (!source) return sendError(ctx.res, 404, "TASK_NOT_FOUND", "任务不存在或无权限");
      if (!canEditProject(ctx.auth.user, source.projectId)) return sendError(ctx.res, 403, "FORBIDDEN", "无任务复制权限");
      const task = { ...source, id: store.nextId("t"), title: ctx.body.title || `${source.title} 副本`, status: "todo" };
      store.data.tasks.unshift(task);
      const assignments = store.data.taskAssignments.filter((item) => item.taskId === source.id && item.status !== "deleted").map((item) => {
        const assignment = { ...item, id: store.nextId("ta"), taskId: task.id, status: "todo", actualStart: null, actualEnd: null, deltaDays: null };
        store.data.taskAssignments.push(assignment);
        return assignment;
      });
      addTimeline(task.projectId, "task.created", ctx.auth.user, `复制任务：${task.title}`, "blue");
      sendJson(ctx.res, 201, { task, assignments });
    }],
    ["POST", "/api/tasks/:taskId/archive", async (ctx) => {
      const task = getTask(ctx, ctx.params.taskId);
      if (!task) return sendError(ctx.res, 404, "TASK_NOT_FOUND", "任务不存在或无权限");
      if (!canEditProject(ctx.auth.user, task.projectId)) return sendError(ctx.res, 403, "FORBIDDEN", "无任务归档权限");
      task.status = "archived";
      addTimeline(task.projectId, "task.archived", ctx.auth.user, `归档任务：${task.title}`, "purple");
      sendJson(ctx.res, 200, { task });
    }],
    ["POST", "/api/tasks/:taskId/restore", async (ctx) => {
      const task = store.data.tasks.find((item) => item.id === ctx.params.taskId);
      if (!task || !canAccessProject(ctx.auth.user, task.projectId)) return sendError(ctx.res, 404, "TASK_NOT_FOUND", "任务不存在或无权限");
      if (!canEditProject(ctx.auth.user, task.projectId)) return sendError(ctx.res, 403, "FORBIDDEN", "无任务恢复权限");
      task.status = ctx.body.status || "todo";
      addTimeline(task.projectId, "task.restored", ctx.auth.user, `恢复任务：${task.title}`, "green");
      sendJson(ctx.res, 200, { task });
    }],
    ["GET", "/api/projects/:projectId/timeline", async (ctx) => {
      const project = requireProject(ctx, ctx.params.projectId);
      if (!project) return sendError(ctx.res, 404, "PROJECT_NOT_FOUND", "项目不存在或无权限");
      sendJson(ctx.res, 200, { events: store.data.timelineEvents.filter((item) => item.projectId === project.id) });
    }],
    ["GET", "/api/projects/:projectId/files", async (ctx) => {
      const project = requireProject(ctx, ctx.params.projectId);
      if (!project) return sendError(ctx.res, 404, "PROJECT_NOT_FOUND", "项目不存在或无权限");
      sendJson(ctx.res, 200, { files: store.data.projectFiles.filter((file) => file.projectId === project.id && !file.deleted) });
    }],
    ["POST", "/api/projects/:projectId/files", async (ctx) => {
      const project = requireProject(ctx, ctx.params.projectId);
      if (!project) return sendError(ctx.res, 404, "PROJECT_NOT_FOUND", "项目不存在或无权限");
      if (!canEditProject(ctx.auth.user, project.id)) return sendError(ctx.res, 403, "FORBIDDEN", "无文件创建权限");
      const type = ctx.body.type || "word_doc";
      const file = { id: store.nextId("f"), projectId: project.id, name: ctx.body.name || "未命名文件", type, folder: ctx.body.folder || "项目资料", content: normalizeFileContent(type, ctx.body.content), version: 1, ownerId: ctx.auth.user.id, deleted: false, updatedAt: currentDay() };
      store.data.projectFiles.unshift(file);
      addFileVersion(file, ctx.auth.user, "created");
      addTimeline(project.id, "file.created", ctx.auth.user, `新增项目文件：${file.name}`, "green");
      sendJson(ctx.res, 201, { file });
    }],
    ["GET", "/api/project-files/:fileId", async (ctx) => {
      const file = getFileIncludingDeleted(ctx, ctx.params.fileId);
      if (!file) return sendError(ctx.res, 404, "FILE_NOT_FOUND", "文件不存在或无权限");
      sendJson(ctx.res, 200, { file, versions: store.data.fileVersions.filter((item) => item.fileId === file.id).sort((a, b) => b.version - a.version) });
    }],
    ["PATCH", "/api/project-files/:fileId", async (ctx) => {
      const file = getAccessibleFile(ctx, ctx.params.fileId);
      if (!file) return sendError(ctx.res, 404, "FILE_NOT_FOUND", "文件不存在或无权限");
      if (!canEditProject(ctx.auth.user, file.projectId)) return sendError(ctx.res, 403, "FORBIDDEN", "无文件编辑权限");
      for (const field of ["name", "type", "folder"]) {
        if (ctx.body[field] !== undefined) file[field] = ctx.body[field];
      }
      file.updatedAt = currentDay();
      addTimeline(file.projectId, "file.updated", ctx.auth.user, `更新文件信息：${file.name}`, "blue");
      sendJson(ctx.res, 200, { file });
    }],
    ["POST", "/api/project-files/:fileId/move", async (ctx) => {
      const file = getAccessibleFile(ctx, ctx.params.fileId);
      if (!file) return sendError(ctx.res, 404, "FILE_NOT_FOUND", "文件不存在或无权限");
      if (!canEditProject(ctx.auth.user, file.projectId)) return sendError(ctx.res, 403, "FORBIDDEN", "无文件移动权限");
      file.folder = ctx.body.folder || file.folder;
      file.updatedAt = currentDay();
      addTimeline(file.projectId, "file.moved", ctx.auth.user, `移动文件：${file.name}`, "blue");
      sendJson(ctx.res, 200, { file });
    }],
    ["GET", "/api/project-files/:fileId/document", async (ctx) => {
      const file = getAccessibleFile(ctx, ctx.params.fileId);
      if (!file) return sendError(ctx.res, 404, "FILE_NOT_FOUND", "文件不存在或无权限");
      sendJson(ctx.res, 200, { content: file.content, file });
    }],
    ["GET", "/api/project-files/:fileId/sheet", async (ctx) => {
      const file = getAccessibleFile(ctx, ctx.params.fileId);
      if (!file) return sendError(ctx.res, 404, "FILE_NOT_FOUND", "文件不存在或无权限");
      sendJson(ctx.res, 200, { cells: parseSheet(file), file });
    }],
    ["PATCH", "/api/project-files/:fileId/document", async (ctx) => updateFileContent(ctx, ctx.body.content || "", "document.updated")],
    ["PATCH", "/api/project-files/:fileId/sheet", async (ctx) => updateFileContent(ctx, JSON.stringify(ctx.body.cells || []), "sheet.cell_changed")],
    ["POST", "/api/project-files/:fileId/import", async (ctx) => {
      const file = getAccessibleFile(ctx, ctx.params.fileId);
      if (!file) return sendError(ctx.res, 404, "FILE_NOT_FOUND", "文件不存在或无权限");
      if (!canEditProject(ctx.auth.user, file.projectId)) return sendError(ctx.res, 403, "FORBIDDEN", "无文件导入权限");
      file.content = normalizeFileContent(file.type, ctx.body.content);
      file.version += 1;
      file.updatedAt = currentDay();
      addFileVersion(file, ctx.auth.user, "file.imported");
      const job = createImportExportJob("import", file, ctx.auth.user, { format: ctx.body.format || file.type });
      addTimeline(file.projectId, "file.imported", ctx.auth.user, `导入文件内容：${file.name}`, "purple");
      sendJson(ctx.res, 202, { job, file });
    }],
    ["POST", "/api/project-files/:fileId/export", async (ctx) => {
      const file = getAccessibleFile(ctx, ctx.params.fileId);
      if (!file) return sendError(ctx.res, 404, "FILE_NOT_FOUND", "文件不存在或无权限");
      const job = createImportExportJob("export", file, ctx.auth.user, { format: ctx.body.format || "markdown", content: file.content });
      addTimeline(file.projectId, "file.exported", ctx.auth.user, `导出文件：${file.name}`, "blue");
      sendJson(ctx.res, 202, { job, export: { fileId: file.id, name: file.name, format: job.payload.format, content: file.content } });
    }],
    ["DELETE", "/api/project-files/:fileId", async (ctx) => {
      const file = getAccessibleFile(ctx, ctx.params.fileId);
      if (!file) return sendError(ctx.res, 404, "FILE_NOT_FOUND", "文件不存在或无权限");
      if (!canEditProject(ctx.auth.user, file.projectId)) return sendError(ctx.res, 403, "FORBIDDEN", "无文件删除权限");
      file.deleted = true;
      file.updatedAt = currentDay();
      addTimeline(file.projectId, "file.deleted", ctx.auth.user, `删除文件：${file.name}`, "red");
      sendJson(ctx.res, 200, { file });
    }],
    ["POST", "/api/project-files/:fileId/restore", async (ctx) => {
      const file = getFileIncludingDeleted(ctx, ctx.params.fileId);
      if (!file) return sendError(ctx.res, 404, "FILE_NOT_FOUND", "文件不存在或无权限");
      if (!canEditProject(ctx.auth.user, file.projectId)) return sendError(ctx.res, 403, "FORBIDDEN", "无文件恢复权限");
      file.deleted = false;
      file.updatedAt = currentDay();
      addTimeline(file.projectId, "file.restored", ctx.auth.user, `恢复文件：${file.name}`, "green");
      sendJson(ctx.res, 200, { file });
    }],
    ["GET", "/api/projects/:projectId/submissions", async (ctx) => {
      const project = requireProject(ctx, ctx.params.projectId);
      if (!project) return sendError(ctx.res, 404, "PROJECT_NOT_FOUND", "项目不存在或无权限");
      const canSeeAll = canManageProject(ctx.auth.user, project.id);
      const submissions = store.data.taskSubmissions.filter((item) => item.projectId === project.id && !item.deleted && (canSeeAll || item.userId === ctx.auth.user.id)).map((item) => {
        const task = store.data.tasks.find((taskItem) => taskItem.id === item.taskId);
        const user = store.data.users.find((userItem) => userItem.id === item.userId);
        return { ...item, taskTitle: task ? task.title : item.taskId, userName: user ? user.name : item.userId };
      });
      sendJson(ctx.res, 200, { submissions });
    }],
    ["POST", "/api/task-assignments/:assignmentId/complete", async (ctx) => {
      const assignment = store.data.taskAssignments.find((item) => item.id === ctx.params.assignmentId);
      if (!assignment || !canAccessProject(ctx.auth.user, assignment.projectId)) return sendError(ctx.res, 404, "ASSIGNMENT_NOT_FOUND", "成员进度不存在或无权限");
      if (!canUpdateAssignment(ctx.auth.user, assignment)) return sendError(ctx.res, 403, "FORBIDDEN", "只能更新自己的成员进度");
      assignment.status = "completed";
      assignment.actualEnd = "2026-06-03";
      assignment.deltaDays = daysBetween(assignment.planEnd, assignment.actualEnd);
      assignment.note = ctx.body.note || assignment.note;
      assignment.nextAction = ctx.body.nextAction || assignment.nextAction || "rest";
      const task = store.data.tasks.find((item) => item.id === assignment.taskId);
      if (task) task.status = "done";
      const message = `${ctx.auth.user.name} 完成任务：${task ? task.title : assignment.taskId}。${assignment.note}`;
      addTimeline(assignment.projectId, "task.assignment_completed", ctx.auth.user, message, "green");
      addNotification("task.assignment_completed", assignment.projectId, ctx.auth.user, message);
      sendJson(ctx.res, 200, { assignment });
    }],
    ["POST", "/api/task-assignments/:assignmentId/delay", async (ctx) => {
      const assignment = store.data.taskAssignments.find((item) => item.id === ctx.params.assignmentId);
      if (!assignment || !canAccessProject(ctx.auth.user, assignment.projectId)) return sendError(ctx.res, 404, "ASSIGNMENT_NOT_FOUND", "成员进度不存在或无权限");
      if (!canUpdateAssignment(ctx.auth.user, assignment)) return sendError(ctx.res, 403, "FORBIDDEN", "无成员进度更新权限");
      assignment.status = "delayed";
      assignment.currentEnd = ctx.body.delayTo || assignment.currentEnd;
      assignment.note = ctx.body.reason || assignment.note;
      const task = store.data.tasks.find((item) => item.id === assignment.taskId);
      const message = `${ctx.auth.user.name} 上报延期：${task ? task.title : assignment.taskId} 延至 ${assignment.currentEnd}`;
      addTimeline(assignment.projectId, "task.assignment_delayed", ctx.auth.user, message, "orange");
      addNotification("task.assignment_delayed", assignment.projectId, ctx.auth.user, message);
      sendJson(ctx.res, 200, { assignment });
    }],
    ["GET", "/api/tasks/:taskId/assignments", async (ctx) => {
      const task = getTask(ctx, ctx.params.taskId);
      if (!task) return sendError(ctx.res, 404, "TASK_NOT_FOUND", "任务不存在或无权限");
      sendJson(ctx.res, 200, { assignments: store.data.taskAssignments.filter((item) => item.taskId === task.id && item.status !== "deleted").map(publicAssignment) });
    }],
    ["POST", "/api/tasks/:taskId/assignments", async (ctx) => {
      const task = getTask(ctx, ctx.params.taskId);
      if (!task) return sendError(ctx.res, 404, "TASK_NOT_FOUND", "任务不存在或无权限");
      if (!canEditProject(ctx.auth.user, task.projectId)) return sendError(ctx.res, 403, "FORBIDDEN", "无任务分配权限");
      const assignment = { id: store.nextId("ta"), taskId: task.id, projectId: task.projectId, userId: ctx.body.userId, status: "todo", planStart: ctx.body.planStart || task.baselineStart, planEnd: ctx.body.planEnd || task.baselineEnd, currentEnd: ctx.body.currentEnd || ctx.body.planEnd || task.currentEnd, actualStart: null, actualEnd: null, deltaDays: null, note: ctx.body.note || "" };
      store.data.taskAssignments.push(assignment);
      addTimeline(task.projectId, "task.assignment_created", ctx.auth.user, `分配任务：${task.title}`, "green");
      sendJson(ctx.res, 201, { assignment });
    }],
    ["PATCH", "/api/task-assignments/:assignmentId", async (ctx) => {
      const assignment = getAssignment(ctx, ctx.params.assignmentId);
      if (!assignment) return sendError(ctx.res, 404, "ASSIGNMENT_NOT_FOUND", "成员进度不存在或无权限");
      if (!canUpdateAssignment(ctx.auth.user, assignment)) return sendError(ctx.res, 403, "FORBIDDEN", "无成员进度更新权限");
      for (const field of ["status", "planStart", "planEnd", "currentEnd", "actualStart", "actualEnd", "note"]) {
        if (ctx.body[field] !== undefined) assignment[field] = ctx.body[field];
      }
      if (assignment.actualEnd) assignment.deltaDays = daysBetween(assignment.planEnd, assignment.actualEnd);
      addTimeline(assignment.projectId, "task.assignment_updated", ctx.auth.user, "更新成员进度", "blue");
      sendJson(ctx.res, 200, { assignment });
    }],
    ["POST", "/api/task-assignments/:assignmentId/block", async (ctx) => {
      const assignment = getAssignment(ctx, ctx.params.assignmentId);
      if (!assignment) return sendError(ctx.res, 404, "ASSIGNMENT_NOT_FOUND", "成员进度不存在或无权限");
      if (!canUpdateAssignment(ctx.auth.user, assignment)) return sendError(ctx.res, 403, "FORBIDDEN", "无成员进度更新权限");
      assignment.status = "blocked";
      assignment.note = ctx.body.reason || assignment.note;
      const task = store.data.tasks.find((item) => item.id === assignment.taskId);
      const message = `${ctx.auth.user.name} 标记阻塞：${task ? task.title : assignment.taskId}。${assignment.note}`;
      addTimeline(assignment.projectId, "task.assignment_blocked", ctx.auth.user, message, "red");
      addNotification("task.assignment_blocked", assignment.projectId, ctx.auth.user, message);
      sendJson(ctx.res, 200, { assignment });
    }],
    ["POST", "/api/task-assignments/:assignmentId/abandon", async (ctx) => {
      const assignment = getAssignment(ctx, ctx.params.assignmentId);
      if (!assignment) return sendError(ctx.res, 404, "ASSIGNMENT_NOT_FOUND", "成员进度不存在或无权限");
      if (!canUpdateAssignment(ctx.auth.user, assignment)) return sendError(ctx.res, 403, "FORBIDDEN", "无成员进度更新权限");
      assignment.status = "abandoned";
      assignment.note = ctx.body.reason || assignment.note;
      const task = store.data.tasks.find((item) => item.id === assignment.taskId);
      const message = `${ctx.auth.user.name} 放弃任务：${task ? task.title : assignment.taskId}。${assignment.note}`;
      addTimeline(assignment.projectId, "task.assignment_abandoned", ctx.auth.user, message, "red");
      addNotification("task.assignment_abandoned", assignment.projectId, ctx.auth.user, message);
      sendJson(ctx.res, 200, { assignment });
    }],
    ["POST", "/api/task-assignments/:assignmentId/rest", async (ctx) => {
      const assignment = getAssignment(ctx, ctx.params.assignmentId);
      if (!assignment) return sendError(ctx.res, 404, "ASSIGNMENT_NOT_FOUND", "成员进度不存在或无权限");
      if (!canUpdateAssignment(ctx.auth.user, assignment)) return sendError(ctx.res, 403, "FORBIDDEN", "无成员进度更新权限");
      assignment.nextAction = "rest";
      addTimeline(assignment.projectId, "task.assignment_rest", ctx.auth.user, `${ctx.auth.user.name} 完成节点后选择休息一下`, "purple");
      sendJson(ctx.res, 200, { assignment });
    }],
    ["POST", "/api/task-assignments/:assignmentId/continue", async (ctx) => {
      const assignment = getAssignment(ctx, ctx.params.assignmentId);
      if (!assignment) return sendError(ctx.res, 404, "ASSIGNMENT_NOT_FOUND", "成员进度不存在或无权限");
      if (!canUpdateAssignment(ctx.auth.user, assignment)) return sendError(ctx.res, 403, "FORBIDDEN", "无成员进度更新权限");
      assignment.nextAction = "continue";
      addTimeline(assignment.projectId, "task.assignment_continue", ctx.auth.user, `${ctx.auth.user.name} 完成节点后继续下一任务`, "green");
      sendJson(ctx.res, 200, { assignment });
    }],
    ["POST", "/api/task-assignments/:assignmentId/remind-creator", async (ctx) => {
      const assignment = getAssignment(ctx, ctx.params.assignmentId);
      if (!assignment) return sendError(ctx.res, 404, "ASSIGNMENT_NOT_FOUND", "成员进度不存在或无权限");
      const task = store.data.tasks.find((item) => item.id === assignment.taskId);
      const message = `${ctx.auth.user.name} 提醒创建者关注：${task ? task.title : assignment.taskId}`;
      addTimeline(assignment.projectId, "task.creator_reminded", ctx.auth.user, message, "orange");
      addNotification("task.creator_reminded", assignment.projectId, ctx.auth.user, message);
      sendJson(ctx.res, 200, { ok: true });
    }],
    ["GET", "/api/task-assignments/:assignmentId", async (ctx) => {
      const assignment = getAssignment(ctx, ctx.params.assignmentId);
      if (!assignment) return sendError(ctx.res, 404, "ASSIGNMENT_NOT_FOUND", "成员进度不存在或无权限");
      sendJson(ctx.res, 200, { assignment: publicAssignment(assignment) });
    }],
    ["DELETE", "/api/task-assignments/:assignmentId", async (ctx) => {
      const assignment = getAssignment(ctx, ctx.params.assignmentId);
      if (!assignment) return sendError(ctx.res, 404, "ASSIGNMENT_NOT_FOUND", "成员进度不存在或无权限");
      if (!canEditProject(ctx.auth.user, assignment.projectId)) return sendError(ctx.res, 403, "FORBIDDEN", "无成员进度删除权限");
      assignment.status = "deleted";
      addTimeline(assignment.projectId, "task.assignment_deleted", ctx.auth.user, "删除成员进度", "red");
      sendJson(ctx.res, 200, { assignment });
    }],
    ["POST", "/api/task-assignments/:assignmentId/reassign", async (ctx) => {
      const assignment = getAssignment(ctx, ctx.params.assignmentId);
      if (!assignment) return sendError(ctx.res, 404, "ASSIGNMENT_NOT_FOUND", "成员进度不存在或无权限");
      if (!canEditProject(ctx.auth.user, assignment.projectId)) return sendError(ctx.res, 403, "FORBIDDEN", "无成员进度转派权限");
      const user = store.data.users.find((item) => item.id === ctx.body.userId && item.enabled);
      if (!user) return sendError(ctx.res, 404, "USER_NOT_FOUND", "用户不存在");
      assignment.userId = user.id;
      assignment.note = ctx.body.note || assignment.note;
      addTimeline(assignment.projectId, "task.assignment_reassigned", ctx.auth.user, `转派成员进度给：${user.name}`, "purple");
      sendJson(ctx.res, 200, { assignment: publicAssignment(assignment) });
    }],
    ["GET", "/api/task-assignments/:assignmentId/logs", async (ctx) => {
      const assignment = getAssignment(ctx, ctx.params.assignmentId);
      if (!assignment) return sendError(ctx.res, 404, "ASSIGNMENT_NOT_FOUND", "成员进度不存在或无权限");
      sendJson(ctx.res, 200, { logs: timelineForAssignment(assignment) });
    }],
    ["POST", "/api/task-assignments/:assignmentId/status", async (ctx) => {
      const assignment = getAssignment(ctx, ctx.params.assignmentId);
      if (!assignment) return sendError(ctx.res, 404, "ASSIGNMENT_NOT_FOUND", "成员进度不存在或无权限");
      if (!canUpdateAssignment(ctx.auth.user, assignment)) return sendError(ctx.res, 403, "FORBIDDEN", "无成员进度更新权限");
      assignment.status = ctx.body.status || assignment.status;
      assignment.note = ctx.body.note || assignment.note;
      addTimeline(assignment.projectId, "task.assignment_status_changed", ctx.auth.user, `更新成员进度状态：${assignment.status}`, "blue");
      sendJson(ctx.res, 200, { assignment: publicAssignment(assignment) });
    }],
    ["POST", "/api/task-assignments/:assignmentId/report", async (ctx) => {
      const assignment = getAssignment(ctx, ctx.params.assignmentId);
      if (!assignment) return sendError(ctx.res, 404, "ASSIGNMENT_NOT_FOUND", "成员进度不存在或无权限");
      if (!canUpdateAssignment(ctx.auth.user, assignment)) return sendError(ctx.res, 403, "FORBIDDEN", "无成员进度上报权限");
      assignment.note = ctx.body.note || assignment.note;
      if (ctx.body.progress !== undefined) assignment.progress = Number(ctx.body.progress);
      addTimeline(assignment.projectId, "task.assignment_reported", ctx.auth.user, `上报成员进度：${assignment.note}`, "blue");
      sendJson(ctx.res, 200, { assignment: publicAssignment(assignment) });
    }],
    ["POST", "/api/task-assignments/:assignmentId/submissions", async (ctx) => {
      const assignment = getAssignment(ctx, ctx.params.assignmentId);
      if (!assignment) return sendError(ctx.res, 404, "ASSIGNMENT_NOT_FOUND", "成员进度不存在或无权限");
      if (!canUpdateAssignment(ctx.auth.user, assignment) || (ctx.auth.user.role !== "super_admin" && ctx.auth.user.id !== assignment.userId)) return sendError(ctx.res, 403, "FORBIDDEN", "只能提交自己的任务成果");
      const task = store.data.tasks.find((item) => item.id === assignment.taskId);
      const submission = { id: store.nextId("sub"), projectId: assignment.projectId, taskId: assignment.taskId, assignmentId: assignment.id, userId: assignment.userId, name: ctx.body.name || "未命名提交物", fileType: ctx.body.fileType || "attachment", content: normalizeFileContent(ctx.body.fileType || "attachment", ctx.body.content), status: "submitted", note: ctx.body.note || "", createdAt: currentDate().toISOString(), updatedAt: currentDate().toISOString(), deleted: false };
      store.data.taskSubmissions.unshift(submission);
      const file = { id: store.nextId("f"), projectId: assignment.projectId, name: submission.name, type: "submission", folder: "任务提交", content: submission.content, version: 1, ownerId: assignment.userId, submissionId: submission.id, deleted: false, updatedAt: currentDay() };
      store.data.projectFiles.unshift(file);
      addFileVersion(file, ctx.auth.user, "submitted");
      const message = `${ctx.auth.user.name} 提交成果：${task ? task.title : assignment.taskId} / ${submission.name}`;
      addTimeline(assignment.projectId, "task.submission_created", ctx.auth.user, message, "green");
      addNotification("task.submission_created", assignment.projectId, ctx.auth.user, message);
      sendJson(ctx.res, 201, { submission, file });
    }],
    ["GET", "/api/task-submissions/:submissionId", async (ctx) => {
      const submission = getSubmission(ctx, ctx.params.submissionId);
      if (!submission) return sendError(ctx.res, 404, "SUBMISSION_NOT_FOUND", "提交物不存在或无权限");
      sendJson(ctx.res, 200, { submission });
    }],
    ["PATCH", "/api/task-submissions/:submissionId", async (ctx) => {
      const submission = getSubmission(ctx, ctx.params.submissionId);
      if (!submission) return sendError(ctx.res, 404, "SUBMISSION_NOT_FOUND", "提交物不存在或无权限");
      if (!canManageProject(ctx.auth.user, submission.projectId) && ctx.auth.user.id !== submission.userId) return sendError(ctx.res, 403, "FORBIDDEN", "无提交物编辑权限");
      for (const field of ["name", "fileType", "content", "note", "status"]) {
        if (ctx.body[field] !== undefined) submission[field] = field === "content" ? normalizeFileContent(submission.fileType, ctx.body[field]) : ctx.body[field];
      }
      submission.updatedAt = currentDate().toISOString();
      addTimeline(submission.projectId, "task.submission_updated", ctx.auth.user, `更新提交物：${submission.name}`, "blue");
      sendJson(ctx.res, 200, { submission });
    }],
    ["DELETE", "/api/task-submissions/:submissionId", async (ctx) => {
      const submission = getSubmission(ctx, ctx.params.submissionId);
      if (!submission) return sendError(ctx.res, 404, "SUBMISSION_NOT_FOUND", "提交物不存在或无权限");
      if (!canManageProject(ctx.auth.user, submission.projectId) && ctx.auth.user.id !== submission.userId) return sendError(ctx.res, 403, "FORBIDDEN", "无提交物删除权限");
      submission.deleted = true;
      submission.updatedAt = currentDate().toISOString();
      for (const file of store.data.projectFiles.filter((item) => item.submissionId === submission.id)) {
        file.deleted = true;
        file.updatedAt = currentDay();
      }
      addTimeline(submission.projectId, "task.submission_deleted", ctx.auth.user, `删除提交物：${submission.name}`, "red");
      sendJson(ctx.res, 200, { submission });
    }],
    ["POST", "/api/task-submissions/:submissionId/accept", async (ctx) => {
      const submission = store.data.taskSubmissions.find((item) => item.id === ctx.params.submissionId && !item.deleted);
      if (!submission || !canAccessProject(ctx.auth.user, submission.projectId)) return sendError(ctx.res, 404, "SUBMISSION_NOT_FOUND", "提交物不存在或无权限");
      if (!canAcceptSubmission(ctx.auth.user, submission)) return sendError(ctx.res, 403, "FORBIDDEN", "无提交物验收权限");
      submission.status = "accepted";
      submission.reviewNote = ctx.body.note || "";
      submission.reviewedBy = ctx.auth.user.id;
      submission.updatedAt = currentDate().toISOString();
      addTimeline(submission.projectId, "task.submission_accepted", ctx.auth.user, `验收通过提交物：${submission.name}`, "green");
      sendJson(ctx.res, 200, { submission });
    }],
    ["POST", "/api/task-submissions/:submissionId/rework", async (ctx) => {
      const submission = store.data.taskSubmissions.find((item) => item.id === ctx.params.submissionId && !item.deleted);
      if (!submission || !canAccessProject(ctx.auth.user, submission.projectId)) return sendError(ctx.res, 404, "SUBMISSION_NOT_FOUND", "提交物不存在或无权限");
      if (!canAcceptSubmission(ctx.auth.user, submission)) return sendError(ctx.res, 403, "FORBIDDEN", "无提交物退回权限");
      submission.status = "needs_revision";
      submission.reviewNote = ctx.body.note || "";
      submission.reviewedBy = ctx.auth.user.id;
      submission.updatedAt = currentDate().toISOString();
      addTimeline(submission.projectId, "task.submission_rework", ctx.auth.user, `退回修改提交物：${submission.name}`, "orange");
      sendJson(ctx.res, 200, { submission });
    }],
    ["GET", "/api/projects/:projectId/acceptance/items", async (ctx) => {
      const project = requireProject(ctx, ctx.params.projectId);
      if (!project) return sendError(ctx.res, 404, "PROJECT_NOT_FOUND", "项目不存在或无权限");
      sendJson(ctx.res, 200, { items: store.data.acceptanceItems.filter((item) => item.projectId === project.id) });
    }],
    ["POST", "/api/projects/:projectId/acceptance/items", async (ctx) => {
      const project = requireProject(ctx, ctx.params.projectId);
      if (!project) return sendError(ctx.res, 404, "PROJECT_NOT_FOUND", "项目不存在或无权限");
      if (!canManageProject(ctx.auth.user, project.id)) return sendError(ctx.res, 403, "FORBIDDEN", "无验收项创建权限");
      const item = { id: store.nextId("acc"), projectId: project.id, title: ctx.body.title || "未命名验收项", status: ctx.body.status || "pending", note: ctx.body.note || "" };
      store.data.acceptanceItems.unshift(item);
      addTimeline(project.id, "acceptance.item_created", ctx.auth.user, `新增验收项：${item.title}`, "blue");
      sendJson(ctx.res, 201, { item });
    }],
    ["PATCH", "/api/acceptance-items/:itemId", async (ctx) => {
      const item = store.data.acceptanceItems.find((entry) => entry.id === ctx.params.itemId);
      if (!item || !canAccessProject(ctx.auth.user, item.projectId)) return sendError(ctx.res, 404, "ACCEPTANCE_ITEM_NOT_FOUND", "验收项不存在或无权限");
      if (!canManageProject(ctx.auth.user, item.projectId)) return sendError(ctx.res, 403, "FORBIDDEN", "无验收项编辑权限");
      for (const field of ["title", "status", "note"]) {
        if (ctx.body[field] !== undefined) item[field] = ctx.body[field];
      }
      addTimeline(item.projectId, "acceptance.item_updated", ctx.auth.user, `更新验收项：${item.title}`, "purple");
      sendJson(ctx.res, 200, { item });
    }],
    ["POST", "/api/acceptance-items/:itemId/pass", async (ctx) => updateAcceptanceItem(ctx, "passed", "acceptance.item_passed", "green")],
    ["POST", "/api/acceptance-items/:itemId/rework", async (ctx) => updateAcceptanceItem(ctx, "needs_rework", "acceptance.item_rework", "orange")],
    ["POST", "/api/acceptance-items/:itemId/reject", async (ctx) => updateAcceptanceItem(ctx, "rejected", "acceptance.item_rejected", "red")],
    ["GET", "/api/acceptance-items/:itemId", async (ctx) => {
      const item = store.data.acceptanceItems.find((entry) => entry.id === ctx.params.itemId);
      if (!item || !canAccessProject(ctx.auth.user, item.projectId)) return sendError(ctx.res, 404, "ACCEPTANCE_ITEM_NOT_FOUND", "验收项不存在或无权限");
      sendJson(ctx.res, 200, { item });
    }],
    ["DELETE", "/api/acceptance-items/:itemId", async (ctx) => {
      const index = store.data.acceptanceItems.findIndex((entry) => entry.id === ctx.params.itemId);
      const item = index >= 0 ? store.data.acceptanceItems[index] : null;
      if (!item || !canAccessProject(ctx.auth.user, item.projectId)) return sendError(ctx.res, 404, "ACCEPTANCE_ITEM_NOT_FOUND", "验收项不存在或无权限");
      if (!canManageProject(ctx.auth.user, item.projectId)) return sendError(ctx.res, 403, "FORBIDDEN", "无验收项删除权限");
      store.data.acceptanceItems.splice(index, 1);
      addTimeline(item.projectId, "acceptance.item_deleted", ctx.auth.user, `删除验收项：${item.title}`, "red");
      sendJson(ctx.res, 200, { item });
    }],
    ["POST", "/api/projects/:projectId/acceptance/start", async (ctx) => {
      const project = requireProject(ctx, ctx.params.projectId);
      if (!project) return sendError(ctx.res, 404, "PROJECT_NOT_FOUND", "项目不存在或无权限");
      if (!canManageProject(ctx.auth.user, project.id)) return sendError(ctx.res, 403, "FORBIDDEN", "无启动验收权限");
      project.acceptanceStatus = "in_review";
      project.acceptanceStartedAt = currentDate().toISOString();
      project.acceptanceStartedBy = ctx.auth.user.id;
      addTimeline(project.id, "acceptance.started", ctx.auth.user, `启动项目验收：${project.name}`, "purple");
      sendJson(ctx.res, 200, { project });
    }],
    ["POST", "/api/projects/:projectId/acceptance/approve", async (ctx) => {
      const project = requireProject(ctx, ctx.params.projectId);
      if (!project) return sendError(ctx.res, 404, "PROJECT_NOT_FOUND", "项目不存在或无权限");
      if (!canManageProject(ctx.auth.user, project.id)) return sendError(ctx.res, 403, "FORBIDDEN", "无项目验收审批权限");
      project.acceptanceStatus = "approved";
      project.acceptanceApprovedAt = currentDate().toISOString();
      project.acceptanceApprovedBy = ctx.auth.user.id;
      for (const file of store.data.projectFiles.filter((item) => item.projectId === project.id && !item.deleted)) file.frozenVersion = file.version;
      addTimeline(project.id, "acceptance.approved", ctx.auth.user, `项目验收通过：${project.name}`, "green");
      addNotification("project.acceptance_approved", project.id, ctx.auth.user, `项目 ${project.name} 验收通过`);
      sendJson(ctx.res, 200, { project, frozenFiles: store.data.projectFiles.filter((item) => item.projectId === project.id && !item.deleted).map((file) => ({ id: file.id, version: file.frozenVersion })) });
    }],
    ["GET", "/api/projects/:projectId/acceptance/report", async (ctx) => {
      const project = requireProject(ctx, ctx.params.projectId);
      if (!project) return sendError(ctx.res, 404, "PROJECT_NOT_FOUND", "项目不存在或无权限");
      sendJson(ctx.res, 200, { reports: store.data.acceptanceReports.filter((item) => item.projectId === project.id) });
    }],
    ["POST", "/api/projects/:projectId/acceptance/report/generate", async (ctx) => {
      const project = requireProject(ctx, ctx.params.projectId);
      if (!project) return sendError(ctx.res, 404, "PROJECT_NOT_FOUND", "项目不存在或无权限");
      if (!canManageProject(ctx.auth.user, project.id)) return sendError(ctx.res, 403, "FORBIDDEN", "无验收报告生成权限");
      const assignments = store.data.taskAssignments.filter((item) => item.projectId === project.id && item.status !== "deleted");
      const memberIds = [...new Set([...store.data.projectMembers.filter((item) => item.projectId === project.id).map((item) => item.userId), ...assignments.map((item) => item.userId)])];
      const memberStats = memberIds.map((userId) => {
        const userAssignments = assignments.filter((item) => item.userId === userId);
        const submissions = store.data.taskSubmissions.filter((item) => item.projectId === project.id && item.userId === userId && !item.deleted);
        const delayCount = store.data.timelineEvents.filter((item) => item.projectId === project.id && item.actorId === userId && item.type === "task.assignment_delayed").length;
        return {
          userId,
          userName: (store.data.users.find((item) => item.id === userId) || {}).name || userId,
          totalAssignments: userAssignments.length,
          completedAssignments: userAssignments.filter((item) => item.status === "completed").length,
          delayCount,
          blockedCount: store.data.timelineEvents.filter((item) => item.projectId === project.id && item.actorId === userId && item.type === "task.assignment_blocked").length,
          abandonCount: store.data.timelineEvents.filter((item) => item.projectId === project.id && item.actorId === userId && item.type === "task.assignment_abandoned").length,
          submittedFiles: submissions.length,
          acceptedSubmissions: submissions.filter((item) => item.status === "accepted").length,
          averageDeltaDays: userAssignments.length ? Math.round(userAssignments.reduce((sum, item) => sum + (Number(item.deltaDays) || 0), 0) / userAssignments.length) : 0
        };
      });
      const report = { id: store.nextId("ar"), projectId: project.id, generatedBy: ctx.auth.user.id, generatedAt: currentDate().toISOString(), note: ctx.body.note || "", memberStats, items: store.data.acceptanceItems.filter((item) => item.projectId === project.id), projectSummary: { progress: project.progress, start: project.start, baselineEnd: project.baselineEnd, currentEnd: project.currentEnd } };
      store.data.acceptanceReports.unshift(report);
      addTimeline(project.id, "acceptance.report_generated", ctx.auth.user, `生成验收报告：${project.name}`, "green");
      addNotification("project.acceptance_completed", project.id, ctx.auth.user, `项目 ${project.name} 已生成验收报告`);
      sendJson(ctx.res, 201, { report });
    }],
    ["GET", "/api/notification-logs", async (ctx) => sendJson(ctx.res, 200, { logs: store.data.notificationLogs.filter((log) => canAccessProject(ctx.auth.user, log.projectId)) })],
    ["POST", "/api/notification-logs/:logId/retry", async (ctx) => requireAdmin(ctx, () => {
      const log = store.data.notificationLogs.find((item) => item.id === ctx.params.logId);
      if (!log) return sendError(ctx.res, 404, "NOTIFICATION_LOG_NOT_FOUND", "通知日志不存在");
      log.status = "queued";
      log.retryCount = (log.retryCount || 0) + 1;
      log.retriedAt = currentDate().toISOString();
      addAudit("notification.log_retried", ctx.auth.user.id, `重试通知：${log.event}`);
      sendJson(ctx.res, 200, { log });
    })],
    ["GET", "/api/notification-rules", async (ctx) => sendJson(ctx.res, 200, { rules: store.data.notificationRules })],
    ["POST", "/api/notification-rules", async (ctx) => {
      if (!isAdmin(ctx.auth.user)) return sendError(ctx.res, 403, "FORBIDDEN", "需要管理员权限");
      const rule = { id: store.nextId("nr"), event: ctx.body.event, channel: ctx.body.channel || "feishu", targetMode: ctx.body.targetMode || "creator", targets: ctx.body.targets || [], enabled: true };
      store.data.notificationRules.unshift(rule);
      addAudit("notification.rule_created", ctx.auth.user.id, `新增消息规则：${rule.event}`);
      sendJson(ctx.res, 201, { rule });
    }],
    ["GET", "/api/notification-rules/:ruleId", async (ctx) => {
      const result = requireNotificationRule(ctx, ctx.params.ruleId);
      if (result.error) return;
      sendJson(ctx.res, 200, { rule: result.rule });
    }],
    ["POST", "/api/notification-rules/:ruleId/copy", async (ctx) => {
      const result = requireNotificationRule(ctx, ctx.params.ruleId);
      if (result.error) return;
      const rule = { ...result.rule, id: store.nextId("nr"), event: ctx.body.event || result.rule.event, enabled: ctx.body.enabled !== undefined ? Boolean(ctx.body.enabled) : result.rule.enabled };
      store.data.notificationRules.unshift(rule);
      addAudit("notification.rule_created", ctx.auth.user.id, `复制消息规则：${rule.event}`);
      sendJson(ctx.res, 201, { rule });
    }],
    ["PATCH", "/api/notification-rules/:ruleId/status", async (ctx) => {
      const result = requireNotificationRule(ctx, ctx.params.ruleId);
      if (result.error) return;
      result.rule.enabled = Boolean(ctx.body.enabled);
      addAudit("notification.rule_updated", ctx.auth.user.id, `${result.rule.enabled ? "启用" : "停用"}消息规则：${result.rule.event}`);
      sendJson(ctx.res, 200, { rule: result.rule });
    }],
    ["GET", "/api/notification-rules/:ruleId/targets", async (ctx) => {
      const result = requireNotificationRule(ctx, ctx.params.ruleId);
      if (result.error) return;
      sendJson(ctx.res, 200, { targets: publicRuleTargets(result.rule) });
    }],
    ["PATCH", "/api/notification-rules/:ruleId", async (ctx) => {
      if (!isAdmin(ctx.auth.user)) return sendError(ctx.res, 403, "FORBIDDEN", "需要管理员权限");
      const rule = store.data.notificationRules.find((item) => item.id === ctx.params.ruleId);
      if (!rule) return sendError(ctx.res, 404, "RULE_NOT_FOUND", "消息规则不存在");
      for (const field of ["event", "channel", "targetMode", "targets", "enabled"]) {
        if (ctx.body[field] !== undefined) rule[field] = ctx.body[field];
      }
      addAudit("notification.rule_updated", ctx.auth.user.id, `更新消息规则：${rule.event}`);
      sendJson(ctx.res, 200, { rule });
    }],
    ["DELETE", "/api/notification-rules/:ruleId", async (ctx) => {
      if (!isAdmin(ctx.auth.user)) return sendError(ctx.res, 403, "FORBIDDEN", "需要管理员权限");
      const index = store.data.notificationRules.findIndex((item) => item.id === ctx.params.ruleId);
      if (index === -1) return sendError(ctx.res, 404, "RULE_NOT_FOUND", "消息规则不存在");
      const [rule] = store.data.notificationRules.splice(index, 1);
      addAudit("notification.rule_deleted", ctx.auth.user.id, `删除消息规则：${rule.event}`);
      sendJson(ctx.res, 200, { rule });
    }],
    ["GET", "/api/admin/users", async (ctx) => requireAdmin(ctx, () => sendJson(ctx.res, 200, { users: store.data.users.map(publicUser) }))],
    ["POST", "/api/admin/users", async (ctx) => requireAdmin(ctx, () => {
      const username = String(ctx.body.username || "").trim();
      const password = String(ctx.body.password || "");
      if (!username || password.length < 6) return sendError(ctx.res, 400, "USER_INVALID", "账号不能为空且密码至少 6 位");
      if (store.data.users.some((user) => user.username === username)) return sendError(ctx.res, 409, "USERNAME_EXISTS", "账号已存在");
      const user = { id: store.nextId("u"), username, password, name: ctx.body.name || username, role: ctx.body.role || "member", enabled: ctx.body.enabled !== false, signature: ctx.body.signature || "", avatar: ctx.body.avatar || username[0].toUpperCase(), theme: ctx.body.theme || "letter", cardBackground: ctx.body.cardBackground || "letter-paper", themeConfig: { blur: 14, customBackground: "" } };
      store.data.users.push(user);
      store.data.userIpPolicies.push({ userId: user.id, enabled: false, updatedBy: ctx.auth.user.id, updatedAt: currentDay() });
      addAudit("admin.user_created", ctx.auth.user.id, `创建用户：${user.username}`);
      sendJson(ctx.res, 201, { user: publicUser(user) });
    })],
    ["GET", "/api/admin/users/:userId", async (ctx) => requireAdmin(ctx, () => {
      const user = store.data.users.find((item) => item.id === ctx.params.userId);
      if (!user) return sendError(ctx.res, 404, "USER_NOT_FOUND", "用户不存在");
      sendJson(ctx.res, 200, { user: publicUser(user), policy: getOrCreateIpPolicy(user.id), sessions: store.data.sessions.filter((session) => session.userId === user.id), ipWhitelist: store.data.userIpWhitelistEntries.filter((entry) => entry.userId === user.id) });
    })],
    ["POST", "/api/admin/users/:userId/reset-password", async (ctx) => requireAdmin(ctx, () => {
      const user = store.data.users.find((item) => item.id === ctx.params.userId);
      if (!user) return sendError(ctx.res, 404, "USER_NOT_FOUND", "用户不存在");
      const password = String(ctx.body.password || "");
      if (password.length < 6) return sendError(ctx.res, 400, "PASSWORD_TOO_SHORT", "密码至少 6 位");
      user.password = password;
      for (const session of store.data.sessions.filter((item) => item.userId === user.id && !item.revoked)) {
        session.revoked = true;
        session.revokedReason = "password_reset";
      }
      addAudit("security.password_reset", ctx.auth.user.id, `重置用户密码：${user.username}`);
      sendJson(ctx.res, 200, { user: publicUser(user) });
    })],
    ["PATCH", "/api/admin/users/:userId", async (ctx) => requireAdmin(ctx, () => {
      const user = store.data.users.find((item) => item.id === ctx.params.userId);
      if (!user) return sendError(ctx.res, 404, "USER_NOT_FOUND", "用户不存在");
      for (const field of ["name", "role", "enabled", "signature", "avatar", "theme", "cardBackground"]) {
        if (ctx.body[field] !== undefined) user[field] = ctx.body[field];
      }
      if (ctx.body.password !== undefined) {
        if (String(ctx.body.password).length < 6) return sendError(ctx.res, 400, "PASSWORD_TOO_SHORT", "密码至少 6 位");
        user.password = String(ctx.body.password);
      }
      if (ctx.body.enabled === false) {
        for (const session of store.data.sessions.filter((item) => item.userId === user.id && !item.revoked)) {
          session.revoked = true;
          session.revokedReason = "user_disabled";
        }
      }
      addAudit("admin.user_updated", ctx.auth.user.id, `更新用户：${user.username}`);
      sendJson(ctx.res, 200, { user: publicUser(user) });
    })],
    ["DELETE", "/api/admin/users/:userId", async (ctx) => requireAdmin(ctx, () => {
      const user = store.data.users.find((item) => item.id === ctx.params.userId);
      if (!user) return sendError(ctx.res, 404, "USER_NOT_FOUND", "用户不存在");
      user.enabled = false;
      for (const session of store.data.sessions.filter((item) => item.userId === user.id && !item.revoked)) {
        session.revoked = true;
        session.revokedReason = "user_deleted";
      }
      addAudit("admin.user_deleted", ctx.auth.user.id, `停用用户：${user.username}`);
      sendJson(ctx.res, 200, { user: publicUser(user) });
    })],
    ["GET", "/api/admin/users/:userId/sessions", async (ctx) => requireAdmin(ctx, () => sendJson(ctx.res, 200, { sessions: store.data.sessions.filter((session) => session.userId === ctx.params.userId) }))],
    ["DELETE", "/api/admin/users/:userId/sessions/:sessionId", async (ctx) => requireAdmin(ctx, () => {
      const session = store.data.sessions.find((item) => item.userId === ctx.params.userId && item.id === ctx.params.sessionId);
      if (!session) return sendError(ctx.res, 404, "SESSION_NOT_FOUND", "会话不存在");
      session.revoked = true;
      session.revokedReason = "admin_revoked";
      addAudit("security.session_revoked", ctx.auth.user.id, `管理员吊销用户 ${ctx.params.userId} 的会话`);
      sendJson(ctx.res, 200, { session });
    })],
    ["GET", "/api/admin/users/:userId/ip-policy", async (ctx) => requireAdmin(ctx, () => sendJson(ctx.res, 200, { policy: getOrCreateIpPolicy(ctx.params.userId) }))],
    ["PATCH", "/api/admin/users/:userId/ip-policy", async (ctx) => requireAdmin(ctx, () => {
      const policy = getOrCreateIpPolicy(ctx.params.userId);
      policy.enabled = Boolean(ctx.body.enabled);
      policy.updatedBy = ctx.auth.user.id;
      policy.updatedAt = currentDay();
      revokeMismatchedSessions(ctx.params.userId);
      addAudit("security.ip_policy_updated", ctx.auth.user.id, `更新用户 ${ctx.params.userId} IP 白名单策略`);
      sendJson(ctx.res, 200, { policy });
    })],
    ["GET", "/api/admin/users/:userId/ip-whitelist", async (ctx) => requireAdmin(ctx, () => sendJson(ctx.res, 200, { entries: store.data.userIpWhitelistEntries.filter((entry) => entry.userId === ctx.params.userId) }))],
    ["POST", "/api/admin/users/:userId/ip-whitelist", async (ctx) => requireAdmin(ctx, () => {
      const entry = { id: store.nextId("ip"), userId: ctx.params.userId, value: ctx.body.value, note: ctx.body.note || "", enabled: true, createdBy: ctx.auth.user.id, createdAt: currentDay() };
      store.data.userIpWhitelistEntries.unshift(entry);
      revokeMismatchedSessions(ctx.params.userId);
      addAudit("security.ip_whitelist_updated", ctx.auth.user.id, `新增用户 ${ctx.params.userId} IP 白名单条目`);
      sendJson(ctx.res, 201, { entry });
    })],
    ["PATCH", "/api/admin/users/:userId/ip-whitelist/:entryId", async (ctx) => requireAdmin(ctx, () => {
      const entry = store.data.userIpWhitelistEntries.find((item) => item.userId === ctx.params.userId && item.id === ctx.params.entryId);
      if (!entry) return sendError(ctx.res, 404, "IP_ENTRY_NOT_FOUND", "IP 白名单条目不存在");
      for (const field of ["value", "note", "enabled"]) {
        if (ctx.body[field] !== undefined) entry[field] = ctx.body[field];
      }
      revokeMismatchedSessions(ctx.params.userId);
      addAudit("security.ip_whitelist_updated", ctx.auth.user.id, `更新用户 ${ctx.params.userId} IP 白名单条目`);
      sendJson(ctx.res, 200, { entry });
    })],
    ["DELETE", "/api/admin/users/:userId/ip-whitelist/:entryId", async (ctx) => requireAdmin(ctx, () => {
      const index = store.data.userIpWhitelistEntries.findIndex((item) => item.userId === ctx.params.userId && item.id === ctx.params.entryId);
      if (index === -1) return sendError(ctx.res, 404, "IP_ENTRY_NOT_FOUND", "IP 白名单条目不存在");
      const [entry] = store.data.userIpWhitelistEntries.splice(index, 1);
      revokeMismatchedSessions(ctx.params.userId);
      addAudit("security.ip_whitelist_updated", ctx.auth.user.id, `删除用户 ${ctx.params.userId} IP 白名单条目`);
      sendJson(ctx.res, 200, { entry });
    })],
    ["GET", "/api/admin/users/:userId/ip-block-events", async (ctx) => requireAdmin(ctx, () => sendJson(ctx.res, 200, { events: store.data.auditLogs.filter((item) => item.type === "security.ip_whitelist_blocked" && item.actorId === ctx.params.userId) }))],
    ["GET", "/api/admin/notification-channels", async (ctx) => requireAdmin(ctx, () => sendJson(ctx.res, 200, { channels: store.data.notificationChannels }))],
    ["POST", "/api/admin/notification-channels", async (ctx) => requireAdmin(ctx, () => {
      const channel = { id: store.nextId("nc"), name: ctx.body.name || "未命名渠道", type: ctx.body.type || "feishu", enabled: ctx.body.enabled !== false, config: ctx.body.config || {}, createdAt: currentDay(), updatedAt: currentDay() };
      store.data.notificationChannels.unshift(channel);
      addAudit("notification.channel_created", ctx.auth.user.id, `新增通知渠道：${channel.name}`);
      sendJson(ctx.res, 201, { channel });
    })],
    ["PATCH", "/api/admin/notification-channels/:channelId", async (ctx) => requireAdmin(ctx, () => {
      const channel = store.data.notificationChannels.find((item) => item.id === ctx.params.channelId);
      if (!channel) return sendError(ctx.res, 404, "CHANNEL_NOT_FOUND", "通知渠道不存在");
      for (const field of ["name", "type", "enabled", "config"]) {
        if (ctx.body[field] !== undefined) channel[field] = ctx.body[field];
      }
      channel.updatedAt = currentDay();
      addAudit("notification.channel_updated", ctx.auth.user.id, `更新通知渠道：${channel.name}`);
      sendJson(ctx.res, 200, { channel });
    })],
    ["POST", "/api/admin/notification-channels/:channelId/test", async (ctx) => requireAdmin(ctx, () => {
      const channel = store.data.notificationChannels.find((item) => item.id === ctx.params.channelId);
      if (!channel) return sendError(ctx.res, 404, "CHANNEL_NOT_FOUND", "通知渠道不存在");
      const log = { id: store.nextId("nl"), ruleId: null, event: "notification.channel_test", projectId: "system", channel: channel.type, targetMode: "custom", targets: [ctx.auth.user.id], status: "sent", message: ctx.body.message || `测试通知渠道：${channel.name}`, createdAt: currentDate().toISOString() };
      store.data.notificationLogs.unshift(log);
      addAudit("notification.channel_tested", ctx.auth.user.id, `测试通知渠道：${channel.name}`);
      sendJson(ctx.res, 200, { log });
    })],
    ["DELETE", "/api/admin/notification-channels/:channelId", async (ctx) => requireAdmin(ctx, () => {
      const index = store.data.notificationChannels.findIndex((item) => item.id === ctx.params.channelId);
      if (index === -1) return sendError(ctx.res, 404, "CHANNEL_NOT_FOUND", "通知渠道不存在");
      const [channel] = store.data.notificationChannels.splice(index, 1);
      addAudit("notification.channel_deleted", ctx.auth.user.id, `删除通知渠道：${channel.name}`);
      sendJson(ctx.res, 200, { channel });
    })],
    ["GET", "/api/admin/notification-keys", async (ctx) => requireAdmin(ctx, () => sendJson(ctx.res, 200, { keys: store.data.notificationKeys.map(publicNotificationKey) }))],
    ["POST", "/api/admin/notification-keys", async (ctx) => requireAdmin(ctx, () => {
      const key = { id: store.nextId("nk"), name: ctx.body.name || "未命名密钥", channelId: ctx.body.channelId || "", type: ctx.body.type || "webhook", secretEncrypted: encodeSecret(ctx.body.secret || ""), secretMasked: maskedSecret(ctx.body.secret || ""), enabled: ctx.body.enabled !== false, createdAt: currentDay(), updatedAt: currentDay() };
      store.data.notificationKeys.unshift(key);
      addAudit("notification.key_created", ctx.auth.user.id, `新增通知密钥：${key.name}`);
      sendJson(ctx.res, 201, { key: publicNotificationKey(key) });
    })],
    ["PATCH", "/api/admin/notification-keys/:keyId", async (ctx) => requireAdmin(ctx, () => {
      const key = store.data.notificationKeys.find((item) => item.id === ctx.params.keyId);
      if (!key) return sendError(ctx.res, 404, "KEY_NOT_FOUND", "通知密钥不存在");
      for (const field of ["name", "channelId", "type", "enabled"]) {
        if (ctx.body[field] !== undefined) key[field] = ctx.body[field];
      }
      if (ctx.body.secret !== undefined) {
        key.secretEncrypted = encodeSecret(ctx.body.secret);
        key.secretMasked = maskedSecret(ctx.body.secret);
      }
      key.updatedAt = currentDay();
      addAudit("notification.key_updated", ctx.auth.user.id, `更新通知密钥：${key.name}`);
      sendJson(ctx.res, 200, { key: publicNotificationKey(key) });
    })],
    ["POST", "/api/admin/notification-keys/:keyId/test", async (ctx) => requireAdmin(ctx, () => {
      const key = store.data.notificationKeys.find((item) => item.id === ctx.params.keyId);
      if (!key) return sendError(ctx.res, 404, "KEY_NOT_FOUND", "通知密钥不存在");
      const log = { id: store.nextId("nl"), ruleId: null, event: "notification.key_test", projectId: "system", channel: key.type, targetMode: "custom", targets: [ctx.auth.user.id], status: "sent", message: ctx.body.message || `测试通知密钥：${key.name}`, createdAt: currentDate().toISOString() };
      store.data.notificationLogs.unshift(log);
      addAudit("notification.key_tested", ctx.auth.user.id, `测试通知密钥：${key.name}`);
      sendJson(ctx.res, 200, { log, key: publicNotificationKey(key) });
    })],
    ["DELETE", "/api/admin/notification-keys/:keyId", async (ctx) => requireAdmin(ctx, () => {
      const index = store.data.notificationKeys.findIndex((item) => item.id === ctx.params.keyId);
      if (index === -1) return sendError(ctx.res, 404, "KEY_NOT_FOUND", "通知密钥不存在");
      const [key] = store.data.notificationKeys.splice(index, 1);
      addAudit("notification.key_deleted", ctx.auth.user.id, `删除通知密钥：${key.name}`);
      sendJson(ctx.res, 200, { key: publicNotificationKey(key) });
    })],
    ["GET", "/api/admin/role-templates", async (ctx) => requireAdmin(ctx, () => sendJson(ctx.res, 200, { roles: store.data.roleTemplates }))],
    ["POST", "/api/admin/role-templates", async (ctx) => requireAdmin(ctx, () => {
      const role = { id: store.nextId("rt"), name: ctx.body.name || "未命名角色模板", role: ctx.body.role || "custom", permissions: ctx.body.permissions || [] };
      store.data.roleTemplates.unshift(role);
      addAudit("permission.role_template_created", ctx.auth.user.id, `新增角色模板：${role.name}`);
      sendJson(ctx.res, 201, { role });
    })],
    ["POST", "/api/admin/role-templates/:roleId/copy", async (ctx) => requireAdmin(ctx, () => {
      const source = store.data.roleTemplates.find((item) => item.id === ctx.params.roleId);
      if (!source) return sendError(ctx.res, 404, "ROLE_TEMPLATE_NOT_FOUND", "角色模板不存在");
      const role = { ...source, id: store.nextId("rt"), name: ctx.body.name || `${source.name} 副本`, role: ctx.body.role || source.role };
      store.data.roleTemplates.unshift(role);
      addAudit("permission.role_template_created", ctx.auth.user.id, `复制角色模板：${role.name}`);
      sendJson(ctx.res, 201, { role });
    })],
    ["PATCH", "/api/admin/role-templates/:roleId", async (ctx) => requireAdmin(ctx, () => {
      const role = store.data.roleTemplates.find((item) => item.id === ctx.params.roleId);
      if (!role) return sendError(ctx.res, 404, "ROLE_TEMPLATE_NOT_FOUND", "角色模板不存在");
      for (const field of ["name", "role", "permissions"]) {
        if (ctx.body[field] !== undefined) role[field] = ctx.body[field];
      }
      addAudit("permission.role_template_updated", ctx.auth.user.id, `更新角色模板：${role.name}`);
      sendJson(ctx.res, 200, { role });
    })],
    ["DELETE", "/api/admin/role-templates/:roleId", async (ctx) => requireAdmin(ctx, () => {
      const index = store.data.roleTemplates.findIndex((item) => item.id === ctx.params.roleId);
      if (index === -1) return sendError(ctx.res, 404, "ROLE_TEMPLATE_NOT_FOUND", "角色模板不存在");
      const [role] = store.data.roleTemplates.splice(index, 1);
      addAudit("permission.role_template_deleted", ctx.auth.user.id, `删除角色模板：${role.name}`);
      sendJson(ctx.res, 200, { role });
    })],
    ["GET", "/api/admin/permission-scopes", async (ctx) => requireAdmin(ctx, () => sendJson(ctx.res, 200, { scopes: store.data.permissionScopes }))],
    ["POST", "/api/admin/permission-scopes", async (ctx) => requireAdmin(ctx, () => {
      const scope = { id: store.nextId("ps"), key: ctx.body.key, name: ctx.body.name || ctx.body.key, enabled: ctx.body.enabled !== false, target: ctx.body.target || "project" };
      store.data.permissionScopes.unshift(scope);
      addAudit("permission.scope_created", ctx.auth.user.id, `新增权限范围：${scope.key}`);
      sendJson(ctx.res, 201, { scope });
    })],
    ["PATCH", "/api/admin/permission-scopes/:scopeId", async (ctx) => requireAdmin(ctx, () => {
      const scope = store.data.permissionScopes.find((item) => item.id === ctx.params.scopeId);
      if (!scope) return sendError(ctx.res, 404, "PERMISSION_SCOPE_NOT_FOUND", "权限范围不存在");
      for (const field of ["key", "name", "enabled", "target"]) {
        if (ctx.body[field] !== undefined) scope[field] = ctx.body[field];
      }
      addAudit("permission.scope_updated", ctx.auth.user.id, `更新权限范围：${scope.key}`);
      sendJson(ctx.res, 200, { scope });
    })],
    ["DELETE", "/api/admin/permission-scopes/:scopeId", async (ctx) => requireAdmin(ctx, () => {
      const index = store.data.permissionScopes.findIndex((item) => item.id === ctx.params.scopeId);
      if (index === -1) return sendError(ctx.res, 404, "PERMISSION_SCOPE_NOT_FOUND", "权限范围不存在");
      const [scope] = store.data.permissionScopes.splice(index, 1);
      addAudit("permission.scope_deleted", ctx.auth.user.id, `删除权限范围：${scope.key}`);
      sendJson(ctx.res, 200, { scope });
    })],
    ["GET", "/api/admin/audit-logs", async (ctx) => requireAdmin(ctx, () => {
      const type = ctx.url.searchParams.get("type");
      const actorId = ctx.url.searchParams.get("actorId");
      const logs = store.data.auditLogs.filter((log) => (!type || log.type === type) && (!actorId || log.actorId === actorId));
      sendJson(ctx.res, 200, { logs });
    })],
    ["GET", "/api/system/events", async (ctx) => requireAdmin(ctx, () => sendJson(ctx.res, 200, { events: store.data.systemEvents }))],
    ["POST", "/api/system/events", async (ctx) => requireAdmin(ctx, () => {
      const event = addSystemEvent(ctx.body.type || "system.manual", ctx.auth.user, ctx.body.message || "系统事件", ctx.body.level || "info");
      sendJson(ctx.res, 201, { event });
    })],
    ["GET", "/api/realtime/status", async (ctx) => sendJson(ctx.res, 200, { status: { onlineUsers: store.data.sessions.filter((session) => !session.revoked).length, activeProjects: visibleProjects(ctx.auth.user).length, lowResourceMode: true } })],
    ["GET", "/api/collaboration/sessions", async (ctx) => {
      const projectIds = new Set(visibleProjects(ctx.auth.user).map((project) => project.id));
      const sessions = store.data.realtimeEvents.filter((event) => projectIds.has(event.projectId));
      sendJson(ctx.res, 200, { sessions });
    }],
    ["POST", "/api/collaboration/events", async (ctx) => {
      const project = requireProject(ctx, ctx.body.projectId);
      if (!project) return sendError(ctx.res, 404, "PROJECT_NOT_FOUND", "项目不存在或无权限");
      const event = { id: store.nextId("rt"), projectId: project.id, fileId: ctx.body.fileId || null, type: ctx.body.type || "collaboration.patch", actorId: ctx.auth.user.id, actorName: ctx.auth.user.name, payload: ctx.body.payload || {}, createdAt: currentDate().toISOString() };
      store.data.realtimeEvents.unshift(event);
      sendJson(ctx.res, 201, { event });
    }],
    ["GET", "/api/import-export/jobs", async (ctx) => {
      const projectIds = new Set(visibleProjects(ctx.auth.user).map((project) => project.id));
      sendJson(ctx.res, 200, { jobs: store.data.importExportJobs.filter((job) => projectIds.has(job.projectId)) });
    }],
    ["GET", "/api/admin/health", async (ctx) => requireAdmin(ctx, () => sendJson(ctx.res, 200, { health: { cpu: "normal", memory: "612MB", disk: "18%", worker: store.data.importExportJobs.filter((job) => job.status === "queued").length, websocket: store.data.sessions.filter((s) => !s.revoked).length, lowResourceMode: true, events: store.data.systemEvents.length } }))]
  ];

  function requireAdmin(ctx, callback) {
    if (!isAdmin(ctx.auth.user)) return sendError(ctx.res, 403, "FORBIDDEN", "需要管理员权限");
    return callback();
  }

  function updateFileContent(ctx, content, event) {
    const file = getAccessibleFile(ctx, ctx.params.fileId);
    if (!file) return sendError(ctx.res, 404, "FILE_NOT_FOUND", "文件不存在或无权限");
    if (!canEditProject(ctx.auth.user, file.projectId)) return sendError(ctx.res, 403, "FORBIDDEN", "无文件编辑权限");
    file.content = content;
    file.version += 1;
    file.updatedAt = currentDay();
    addFileVersion(file, ctx.auth.user, event);
    addTimeline(file.projectId, event, ctx.auth.user, `更新文件：${file.name}`, "purple");
    sendJson(ctx.res, 200, { file });
  }

  function matchRoute(method, pathname) {
    for (const [routeMethod, pattern, handler] of routes) {
      if (routeMethod !== method) continue;
      const params = matchPattern(pattern, pathname);
      if (params) return { pattern, params, handler };
    }
    return null;
  }

  const runtime = {
    start,
    stop,
    get url() {
      const address = server && server.address();
      return address ? `http://127.0.0.1:${address.port}` : "";
    },
    get store() {
      return store;
    }
  };
  return runtime;
}

function publicUser(user) {
  return { id: user.id, username: user.username, name: user.name, role: user.role, enabled: user.enabled, signature: user.signature, avatar: user.avatar, theme: user.theme };
}

function matchPattern(pattern, pathname) {
  const patternParts = pattern.split("/").filter(Boolean);
  const pathParts = pathname.split("/").filter(Boolean);
  if (patternParts.length !== pathParts.length) return null;
  const params = {};
  for (let i = 0; i < patternParts.length; i += 1) {
    if (patternParts[i].startsWith(":")) params[patternParts[i].slice(1)] = decodeURIComponent(pathParts[i]);
    else if (patternParts[i] !== pathParts[i]) return null;
  }
  return params;
}

async function readJson(req) {
  if (!["POST", "PATCH", "PUT"].includes(req.method)) return null;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function sendError(res, status, code, message) {
  sendJson(res, status, { error: { code, message } });
}

function getRequestIp(req) {
  return req.headers["x-test-ip"] || req.socket.remoteAddress || "127.0.0.1";
}

function matchIp(rule, ip) {
  if (!rule) return false;
  if (rule === ip) return true;
  if (rule.includes("/")) return matchCidr(rule, ip);
  return false;
}

function matchCidr(cidr, ip) {
  const [base, bitsRaw] = cidr.split("/");
  const bits = Number(bitsRaw);
  const baseInt = ipv4ToInt(base);
  const ipInt = ipv4ToInt(ip);
  if (baseInt === null || ipInt === null || Number.isNaN(bits)) return false;
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (baseInt & mask) === (ipInt & mask);
}

function ipv4ToInt(ip) {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) return null;
  return parts.reduce((acc, part) => ((acc << 8) + part) >>> 0, 0);
}

async function serveStatic(res, url) {
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") pathname = "/index.html";
  const filePath = path.normalize(path.join(PUBLIC_DIR, pathname));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  try {
    const content = await readFile(filePath);
    res.writeHead(200, { "content-type": MIME[path.extname(filePath)] || "application/octet-stream" });
    res.end(content);
  } catch {
    const content = await readFile(path.join(PUBLIC_DIR, "index.html"));
    res.writeHead(200, { "content-type": MIME[".html"] });
    res.end(content);
  }
}

module.exports = { createLightTaskServer };

if (require.main === module) {
  const server = createLightTaskServer();
  server.start().then(() => {
    console.log(`LightTask v12 running at ${server.url}`);
    setInterval(() => {}, 60 * 60 * 1000);
  });
}
