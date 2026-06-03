import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JsonStore, daysBetween, toDateOnly } from "./store.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "public");

const JSON_TYPE = "application/json; charset=utf-8";
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png"
};

export function createLightTaskServer(options = {}) {
  const now = options.now ?? (() => new Date());
  const sessionIdleMs = options.sessionIdleMs ?? 24 * 60 * 60 * 1000;
  const store = new JsonStore(options.dataDir ?? path.join(__dirname, ".data"), now);
  let server;

  async function start(port = Number(process.env.PORT || 4173)) {
    await store.load();
    server = http.createServer((req, res) => {
      handle(req, res).catch((error) => sendError(res, 500, "SERVER_ERROR", error.message));
    });
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
    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
      return;
    }
    await serveStatic(req, res, url);
  }

  async function handleApi(req, res, url) {
    const body = await readJson(req);
    const route = matchRoute(req.method, url.pathname);
    if (!route) {
      sendError(res, 404, "NOT_FOUND", "接口不存在");
      return;
    }

    const publicRoutes = [
      "POST /api/auth/login"
    ];
    const routeKey = `${req.method} ${route.pattern}`;
    let auth = null;

    if (!publicRoutes.includes(routeKey)) {
      auth = authenticate(req);
      if (auth.error) {
        sendJson(res, auth.status, { error: auth.error });
        return;
      }
    }

    const context = {
      req,
      res,
      url,
      body,
      params: route.params,
      auth,
      data: store.data,
      ip: getRequestIp(req),
      now: now instanceof Function ? now : () => new Date()
    };

    await route.handler(context);
    await store.save();
  }

  function authenticate(req) {
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!token) return authError(401, "NO_TOKEN", "需要登录");

    const session = store.data.sessions.find((item) => item.token === token);
    if (!session) return authError(401, "INVALID_SESSION", "登录状态不存在");
    if (session.revoked) return authError(401, "SESSION_REVOKED", "登录状态已失效");

    const user = store.data.users.find((item) => item.id === session.userId);
    if (!user || !user.enabled) return authError(401, "USER_DISABLED", "用户不可用");

    const currentTime = currentDate().getTime();
    if (currentTime - Date.parse(session.lastActivityAt) > sessionIdleMs) {
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

  function currentDate() {
    const value = now();
    return value instanceof Date ? value : new Date(value);
  }

  function currentDay() {
    return toDateOnly(currentDate());
  }

  function addAudit(type, actorId, message) {
    store.data.auditLogs.unshift({
      id: store.nextId("audit"),
      type,
      actorId,
      message,
      createdAt: currentDate().toISOString()
    });
  }

  function addTimeline(projectId, type, actor, message, color = "blue") {
    store.data.timelineEvents.unshift({
      id: store.nextId("ev"),
      projectId,
      type,
      actorId: actor.id,
      actorName: actor.name,
      message,
      color,
      createdAt: currentDate().toISOString()
    });
  }

  function addNotification(event, projectId, actor, message) {
    const rules = store.data.notificationRules.filter((rule) => rule.enabled && rule.event === event);
    for (const rule of rules) {
      const targets = resolveTargets(rule, projectId, actor);
      store.data.notificationLogs.unshift({
        id: store.nextId("nl"),
        ruleId: rule.id,
        event,
        projectId,
        channel: rule.channel,
        targetMode: rule.targetMode,
        targets,
        status: "queued",
        message,
        createdAt: currentDate().toISOString()
      });
    }
  }

  function resolveTargets(rule, projectId, actor) {
    if (rule.targetMode === "creator") {
      const project = store.data.projects.find((item) => item.id === projectId);
      return project ? [project.ownerId] : [];
    }
    if (rule.targetMode === "responsible") return [actor.id];
    if (rule.targetMode === "all") {
      return store.data.projectMembers.filter((item) => item.projectId === projectId).map((item) => item.userId);
    }
    return rule.targets || [];
  }

  function canAccessProject(user, projectId) {
    if (user.role === "super_admin") return true;
    return store.data.projectMembers.some((member) => member.projectId === projectId && member.userId === user.id);
  }

  function isAdmin(user) {
    return user.role === "super_admin";
  }

  function requireProject(context, projectId) {
    const project = store.data.projects.find((item) => item.id === projectId && item.status !== "deleted");
    if (!project) return null;
    if (!canAccessProject(context.auth.user, projectId)) return null;
    return project;
  }

  function isIpAllowed(userId, ip) {
    const policy = store.data.userIpPolicies.find((item) => item.userId === userId);
    if (!policy?.enabled) return true;
    return store.data.userIpWhitelistEntries
      .filter((entry) => entry.userId === userId && entry.enabled !== false)
      .some((entry) => matchIp(entry.value, ip));
  }

  function createSession(userId, ip, userAgent = "") {
    const token = `lt_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    const createdAt = currentDate().toISOString();
    const session = {
      id: store.nextId("sess"),
      token,
      userId,
      ip,
      userAgent,
      createdAt,
      lastActivityAt: createdAt,
      revoked: false,
      revokedReason: null
    };
    store.data.sessions.push(session);
    return session;
  }

  const routes = [
    ["POST", "/api/auth/login", async (ctx) => {
      const { username, password } = ctx.body || {};
      const user = store.data.users.find((item) => item.username === username && item.password === password);
      if (!user || !user.enabled) {
        addAudit("security.login_failed", "anonymous", `账号 ${username || "-"} 登录失败`);
        sendError(ctx.res, 401, "INVALID_CREDENTIALS", "账号或密码错误");
        return;
      }
      if (!isIpAllowed(user.id, ctx.ip)) {
        addAudit("security.ip_whitelist_blocked", user.id, `用户 ${user.name} 从 ${ctx.ip} 登录被 IP 白名单拦截`);
        sendError(ctx.res, 403, "IP_NOT_ALLOWED", "当前网络不允许访问");
        return;
      }
      const session = createSession(user.id, ctx.ip, ctx.req.headers["user-agent"] || "");
      addAudit("security.login_succeeded", user.id, `用户 ${user.name} 登录成功`);
      sendJson(ctx.res, 200, { token: session.token, user: publicUser(user) });
    }],
    ["POST", "/api/auth/logout", async (ctx) => {
      ctx.auth.session.revoked = true;
      ctx.auth.session.revokedReason = "logout";
      addAudit("security.session_revoked", ctx.auth.user.id, `用户 ${ctx.auth.user.name} 退出登录`);
      sendJson(ctx.res, 200, { ok: true });
    }],
    ["POST", "/api/auth/refresh", async (ctx) => {
      sendJson(ctx.res, 200, { token: ctx.auth.session.token, user: publicUser(ctx.auth.user) });
    }],
    ["GET", "/api/auth/me", async (ctx) => {
      sendJson(ctx.res, 200, { user: publicUser(ctx.auth.user) });
    }],
    ["GET", "/api/dashboard/summary", async (ctx) => {
      const projects = visibleProjects(ctx.auth.user);
      const assignments = store.data.taskAssignments.filter((item) => canAccessProject(ctx.auth.user, item.projectId));
      const pendingFiles = store.data.projectFiles.filter((item) => !item.deleted && item.type === "submission").length;
      sendJson(ctx.res, 200, {
        metrics: {
          activeProjects: projects.length,
          todayActions: 3,
          pendingFiles,
          riskProjects: projects.filter((project) => project.risk !== "low").length,
          myProgress: assignments.filter((item) => item.userId === ctx.auth.user.id && item.status === "completed").length,
          deltaDays: -1
        },
        myProgress: {
          todayDone: 2,
          weekDone: 9,
          monthDone: 27,
          expectedFinish: "2026-06-29",
          deltaDays: -1
        },
        gantt: store.data.tasks
          .filter((task) => projects.some((project) => project.id === task.projectId))
          .map((task) => ({ ...task, assignments: store.data.taskAssignments.filter((item) => item.taskId === task.id) }))
      });
    }],
    ["GET", "/api/projects", async (ctx) => {
      sendJson(ctx.res, 200, { projects: visibleProjects(ctx.auth.user) });
    }],
    ["POST", "/api/projects", async (ctx) => {
      const project = {
        id: store.nextId("p"),
        name: ctx.body.name || "新项目",
        group: ctx.body.group || "默认分组",
        ownerId: ctx.auth.user.id,
        status: "active",
        progress: 0,
        risk: "low",
        start: ctx.body.start || currentDay(),
        baselineEnd: ctx.body.baselineEnd || currentDay(),
        currentEnd: ctx.body.currentEnd || ctx.body.baselineEnd || currentDay(),
        description: ctx.body.description || ""
      };
      store.data.projects.unshift(project);
      store.data.projectMembers.push({ id: store.nextId("pm"), projectId: project.id, userId: ctx.auth.user.id, role: "owner" });
      addTimeline(project.id, "project.created", ctx.auth.user, `创建项目：${project.name}`);
      sendJson(ctx.res, 201, { project });
    }],
    ["GET", "/api/projects/:projectId/timeline", async (ctx) => {
      const project = requireProject(ctx, ctx.params.projectId);
      if (!project) return sendError(ctx.res, 404, "PROJECT_NOT_FOUND", "项目不存在或无权限");
      const events = store.data.timelineEvents.filter((item) => item.projectId === project.id);
      sendJson(ctx.res, 200, { events });
    }],
    ["GET", "/api/projects/:projectId/files", async (ctx) => {
      const project = requireProject(ctx, ctx.params.projectId);
      if (!project) return sendError(ctx.res, 404, "PROJECT_NOT_FOUND", "项目不存在或无权限");
      const files = store.data.projectFiles.filter((file) => file.projectId === project.id && !file.deleted);
      sendJson(ctx.res, 200, { files });
    }],
    ["POST", "/api/projects/:projectId/files", async (ctx) => {
      const project = requireProject(ctx, ctx.params.projectId);
      if (!project) return sendError(ctx.res, 404, "PROJECT_NOT_FOUND", "项目不存在或无权限");
      const file = {
        id: store.nextId("f"),
        projectId: project.id,
        name: ctx.body.name || "未命名文件",
        type: ctx.body.type || "word_doc",
        content: ctx.body.content || "",
        version: 1,
        ownerId: ctx.auth.user.id,
        deleted: false,
        updatedAt: currentDay()
      };
      store.data.projectFiles.unshift(file);
      addTimeline(project.id, "file.created", ctx.auth.user, `新增项目文件：${file.name}`, "green");
      sendJson(ctx.res, 201, { file });
    }],
    ["PATCH", "/api/project-files/:fileId/document", async (ctx) => {
      const file = getAccessibleFile(ctx, ctx.params.fileId);
      if (!file) return sendError(ctx.res, 404, "FILE_NOT_FOUND", "文件不存在或无权限");
      file.content = ctx.body.content || "";
      file.version += 1;
      file.updatedAt = currentDay();
      addTimeline(file.projectId, "document.updated", ctx.auth.user, `更新文档：${file.name}`, "purple");
      sendJson(ctx.res, 200, { file });
    }],
    ["PATCH", "/api/project-files/:fileId/sheet", async (ctx) => {
      const file = getAccessibleFile(ctx, ctx.params.fileId);
      if (!file) return sendError(ctx.res, 404, "FILE_NOT_FOUND", "文件不存在或无权限");
      file.content = JSON.stringify(ctx.body.cells || []);
      file.version += 1;
      file.updatedAt = currentDay();
      addTimeline(file.projectId, "sheet.cell_changed", ctx.auth.user, `更新表格：${file.name}`, "purple");
      sendJson(ctx.res, 200, { file });
    }],
    ["DELETE", "/api/project-files/:fileId", async (ctx) => {
      const file = getAccessibleFile(ctx, ctx.params.fileId);
      if (!file) return sendError(ctx.res, 404, "FILE_NOT_FOUND", "文件不存在或无权限");
      file.deleted = true;
      file.updatedAt = currentDay();
      addTimeline(file.projectId, "file.deleted", ctx.auth.user, `删除文件：${file.name}`, "red");
      sendJson(ctx.res, 200, { file });
    }],
    ["POST", "/api/task-assignments/:assignmentId/complete", async (ctx) => {
      const assignment = store.data.taskAssignments.find((item) => item.id === ctx.params.assignmentId);
      if (!assignment || !canAccessProject(ctx.auth.user, assignment.projectId)) {
        return sendError(ctx.res, 404, "ASSIGNMENT_NOT_FOUND", "成员进度不存在或无权限");
      }
      if (ctx.auth.user.role !== "super_admin" && assignment.userId !== ctx.auth.user.id) {
        return sendError(ctx.res, 403, "FORBIDDEN", "只能更新自己的成员进度");
      }
      assignment.status = "completed";
      assignment.actualEnd = "2026-06-03";
      assignment.deltaDays = daysBetween(assignment.planEnd, assignment.actualEnd);
      assignment.note = ctx.body.note || assignment.note;
      const task = store.data.tasks.find((item) => item.id === assignment.taskId);
      if (task) task.status = "done";
      const message = `${ctx.auth.user.name} 完成任务：${task?.title || assignment.taskId}。${assignment.note}`;
      addTimeline(assignment.projectId, "task.assignment_completed", ctx.auth.user, message, "green");
      addNotification("task.assignment_completed", assignment.projectId, ctx.auth.user, message);
      sendJson(ctx.res, 200, { assignment });
    }],
    ["POST", "/api/task-assignments/:assignmentId/delay", async (ctx) => {
      const assignment = store.data.taskAssignments.find((item) => item.id === ctx.params.assignmentId);
      if (!assignment || !canAccessProject(ctx.auth.user, assignment.projectId)) {
        return sendError(ctx.res, 404, "ASSIGNMENT_NOT_FOUND", "成员进度不存在或无权限");
      }
      assignment.status = "delayed";
      assignment.currentEnd = ctx.body.delayTo || assignment.currentEnd;
      assignment.note = ctx.body.reason || assignment.note;
      const task = store.data.tasks.find((item) => item.id === assignment.taskId);
      const message = `${ctx.auth.user.name} 上报延期：${task?.title || assignment.taskId} 延至 ${assignment.currentEnd}`;
      addTimeline(assignment.projectId, "task.assignment_delayed", ctx.auth.user, message, "orange");
      addNotification("task.assignment_delayed", assignment.projectId, ctx.auth.user, message);
      sendJson(ctx.res, 200, { assignment });
    }],
    ["GET", "/api/notification-logs", async (ctx) => {
      const logs = store.data.notificationLogs.filter((log) => canAccessProject(ctx.auth.user, log.projectId));
      sendJson(ctx.res, 200, { logs });
    }],
    ["GET", "/api/notification-rules", async (ctx) => {
      sendJson(ctx.res, 200, { rules: store.data.notificationRules });
    }],
    ["POST", "/api/notification-rules", async (ctx) => {
      if (!isAdmin(ctx.auth.user)) return sendError(ctx.res, 403, "FORBIDDEN", "需要管理员权限");
      const rule = {
        id: store.nextId("nr"),
        event: ctx.body.event,
        channel: ctx.body.channel || "feishu",
        targetMode: ctx.body.targetMode || "creator",
        targets: ctx.body.targets || [],
        enabled: true
      };
      store.data.notificationRules.unshift(rule);
      addAudit("notification.rule_created", ctx.auth.user.id, `新增消息规则：${rule.event}`);
      sendJson(ctx.res, 201, { rule });
    }],
    ["GET", "/api/admin/users", async (ctx) => {
      if (!isAdmin(ctx.auth.user)) return sendError(ctx.res, 403, "FORBIDDEN", "需要管理员权限");
      sendJson(ctx.res, 200, { users: store.data.users.map(publicUser) });
    }],
    ["GET", "/api/admin/users/:userId/sessions", async (ctx) => {
      if (!isAdmin(ctx.auth.user)) return sendError(ctx.res, 403, "FORBIDDEN", "需要管理员权限");
      const sessions = store.data.sessions.filter((session) => session.userId === ctx.params.userId);
      sendJson(ctx.res, 200, { sessions });
    }],
    ["DELETE", "/api/admin/users/:userId/sessions/:sessionId", async (ctx) => {
      if (!isAdmin(ctx.auth.user)) return sendError(ctx.res, 403, "FORBIDDEN", "需要管理员权限");
      const session = store.data.sessions.find((item) => item.userId === ctx.params.userId && item.id === ctx.params.sessionId);
      if (!session) return sendError(ctx.res, 404, "SESSION_NOT_FOUND", "会话不存在");
      session.revoked = true;
      session.revokedReason = "admin_revoked";
      addAudit("security.session_revoked", ctx.auth.user.id, `管理员吊销用户 ${ctx.params.userId} 的会话`);
      sendJson(ctx.res, 200, { session });
    }],
    ["GET", "/api/admin/users/:userId/ip-policy", async (ctx) => {
      if (!isAdmin(ctx.auth.user)) return sendError(ctx.res, 403, "FORBIDDEN", "需要管理员权限");
      sendJson(ctx.res, 200, { policy: getOrCreateIpPolicy(ctx.params.userId) });
    }],
    ["PATCH", "/api/admin/users/:userId/ip-policy", async (ctx) => {
      if (!isAdmin(ctx.auth.user)) return sendError(ctx.res, 403, "FORBIDDEN", "需要管理员权限");
      const policy = getOrCreateIpPolicy(ctx.params.userId);
      policy.enabled = Boolean(ctx.body.enabled);
      policy.updatedBy = ctx.auth.user.id;
      policy.updatedAt = currentDay();
      revokeMismatchedSessions(ctx.params.userId);
      addAudit("security.ip_policy_updated", ctx.auth.user.id, `更新用户 ${ctx.params.userId} IP 白名单策略`);
      sendJson(ctx.res, 200, { policy });
    }],
    ["GET", "/api/admin/users/:userId/ip-whitelist", async (ctx) => {
      if (!isAdmin(ctx.auth.user)) return sendError(ctx.res, 403, "FORBIDDEN", "需要管理员权限");
      const entries = store.data.userIpWhitelistEntries.filter((entry) => entry.userId === ctx.params.userId);
      sendJson(ctx.res, 200, { entries });
    }],
    ["POST", "/api/admin/users/:userId/ip-whitelist", async (ctx) => {
      if (!isAdmin(ctx.auth.user)) return sendError(ctx.res, 403, "FORBIDDEN", "需要管理员权限");
      const entry = {
        id: store.nextId("ip"),
        userId: ctx.params.userId,
        value: ctx.body.value,
        note: ctx.body.note || "",
        enabled: true,
        createdBy: ctx.auth.user.id,
        createdAt: currentDay()
      };
      store.data.userIpWhitelistEntries.unshift(entry);
      revokeMismatchedSessions(ctx.params.userId);
      addAudit("security.ip_whitelist_updated", ctx.auth.user.id, `新增用户 ${ctx.params.userId} IP 白名单条目`);
      sendJson(ctx.res, 201, { entry });
    }],
    ["GET", "/api/admin/users/:userId/ip-block-events", async (ctx) => {
      if (!isAdmin(ctx.auth.user)) return sendError(ctx.res, 403, "FORBIDDEN", "需要管理员权限");
      const events = store.data.auditLogs.filter((item) => item.type === "security.ip_whitelist_blocked" && item.actorId === ctx.params.userId);
      sendJson(ctx.res, 200, { events });
    }]
  ];

  function visibleProjects(user) {
    if (user.role === "super_admin") return store.data.projects.filter((project) => project.status !== "deleted");
    const ids = new Set(store.data.projectMembers.filter((member) => member.userId === user.id).map((member) => member.projectId));
    return store.data.projects.filter((project) => ids.has(project.id) && project.status !== "deleted");
  }

  function getAccessibleFile(ctx, fileId) {
    const file = store.data.projectFiles.find((item) => item.id === fileId && !item.deleted);
    if (!file) return null;
    if (!canAccessProject(ctx.auth.user, file.projectId)) return null;
    return file;
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
      const address = server?.address();
      return address ? `http://127.0.0.1:${address.port}` : "";
    },
    get store() {
      return store;
    }
  };

  return runtime;
}

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    enabled: user.enabled,
    signature: user.signature,
    avatar: user.avatar,
    theme: user.theme
  };
}

function matchPattern(pattern, pathname) {
  const patternParts = pattern.split("/").filter(Boolean);
  const pathParts = pathname.split("/").filter(Boolean);
  if (patternParts.length !== pathParts.length) return null;
  const params = {};
  for (let index = 0; index < patternParts.length; index += 1) {
    const current = patternParts[index];
    if (current.startsWith(":")) {
      params[current.slice(1)] = decodeURIComponent(pathParts[index]);
      continue;
    }
    if (current !== pathParts[index]) return null;
  }
  return params;
}

async function readJson(req) {
  if (!["POST", "PATCH", "PUT"].includes(req.method)) return null;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  return JSON.parse(raw);
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "content-type": JSON_TYPE });
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

async function serveStatic(req, res, url) {
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

if (import.meta.url === `file://${process.argv[1]?.replaceAll("\\", "/")}`) {
  const server = createLightTaskServer();
  server.start().then(() => {
    console.log(`LightTask v12 running at ${server.url}`);
  });
}
