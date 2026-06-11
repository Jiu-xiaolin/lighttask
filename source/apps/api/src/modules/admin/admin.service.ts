import { Injectable, ForbiddenException, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { readFileSync, existsSync } from "node:fs";
import { cpus, freemem, totalmem, uptime, loadavg } from "node:os";
import { join } from "node:path";
import bcrypt from "bcryptjs";
import { PrismaService } from "../../prisma/prisma.service.js";
import { genId, maskSecret, encryptSecret, decryptSecret, clientIp, ipInCidr } from "../../common/utils/index.js";
import { EventService } from "../../common/events/event.service.js";
import { RedisService } from "../../redis/redis.service.js";
import { FeishuBotService } from "./feishu-bot.service.js";
import { AppConfigService } from "../../config/app-config.service.js";

const DATA_FILE = join(process.cwd(), "data", "state.json");

@Injectable()
export class AdminService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AdminService.name);
  private dailyReportTimer: NodeJS.Timeout | null = null;

  constructor(private prisma: PrismaService, private events: EventService, private redis: RedisService, private feishu: FeishuBotService, private config: AppConfigService) {}

  onModuleInit() {
    this.dailyReportTimer = setInterval(() => {
      this.runNotificationSchedules().catch(error => this.logger.warn(`Notification schedule failed: ${error?.message || error}`));
    }, 60_000);
  }

  onModuleDestroy() {
    if (this.dailyReportTimer) clearInterval(this.dailyReportTimer);
  }

  requireAdmin(user: any) { if (user.role !== "SUPER_ADMIN") throw new ForbiddenException("需要管理员权限"); }

  private async invalidateAccess(projectId?: string, userId?: string) {
    await Promise.all([
      this.redis.delPattern("access:visible-projects:*"),
      projectId ? this.redis.delPattern(`access:edit:*:${projectId}`) : this.redis.delPattern("access:edit:*"),
      projectId ? this.redis.delPattern(`access:scope:*:${projectId}:*`) : this.redis.delPattern("access:scope:*"),
      projectId ? this.redis.delPattern(`access:member:*:${projectId}`) : this.redis.delPattern("access:member:*"),
      projectId ? this.redis.delPattern(`access:manage:*:${projectId}`) : this.redis.delPattern("access:manage:*"),
    ]);
  }

  private async visibleProjectIds(user: any) {
    if (user.role === "SUPER_ADMIN") {
      const projects = await this.prisma.project.findMany({ where: { status: { not: "DELETED" } }, select: { id: true } });
      return projects.map((p) => p.id);
    }
    const members = await this.prisma.projectMember.findMany({ where: { userId: user.id }, select: { projectId: true } });
    return members.map((m) => m.projectId);
  }

  // ---- Health ----
  health(user: any) {
    this.requireAdmin(user);
    const cpuCores = cpus(); const load = loadavg();
    const cpuUsage = Math.round((load[0] / cpuCores.length) * 100);
    const totalMem = totalmem(); const freeMem = freemem(); const usedMem = totalMem - freeMem;
    const memPercent = Math.round((usedMem / totalMem) * 100);
    const up = uptime();
    return {
      system: {
        cpu: { model: cpuCores[0]?.model || "Unknown", cores: cpuCores.length, usage: cpuUsage, load1m: Math.round(load[0] * 100) / 100, load5m: Math.round(load[1] * 100) / 100, status: cpuUsage > 80 ? "warn" : cpuUsage > 60 ? "watch" : "ok" },
        memory: { total: totalMem, used: usedMem, free: freeMem, percent: memPercent, totalGB: Math.round(totalMem / 1073741824 * 10) / 10, usedGB: Math.round(usedMem / 1073741824 * 10) / 10, status: memPercent > 80 ? "warn" : memPercent > 60 ? "watch" : "ok" },
        uptime: { seconds: up, formatted: `${Math.floor(up / 86400)}d ${Math.floor((up % 86400) / 3600)}h ${Math.floor((up % 3600) / 60)}m` },
        platform: process.platform, nodeVersion: process.version, pid: process.pid,
      },
      storage: { dataFile: { sizeBytes: existsSync(DATA_FILE) ? (readFileSync(DATA_FILE).length || 0) : 0 }, dataDir: join(process.cwd(), "data") },
      generatedAt: new Date().toISOString(),
    };
  }

  // ---- Users ----
  async adminUsers(user: any) { this.requireAdmin(user); const users = await this.prisma.user.findMany(); return { users: users.map(u => ({ id: u.id, username: u.username, name: u.name, role: u.role, enabled: u.enabled, avatar: u.avatar || "", signature: u.signature || "", theme: u.theme || "letter" })) }; }

  async createUser(user: any, body: any) {
    this.requireAdmin(user);
    const created = await this.prisma.user.create({ data: { id: genId("u"), username: body.username, passwordHash: bcrypt.hashSync(body.password || "123456", 10), name: body.name || body.username, role: body.role === "SUPER_ADMIN" ? "SUPER_ADMIN" : "MEMBER", enabled: body.enabled !== false, avatar: body.avatar || body.username?.[0] || "U" } });
    await this.events.record({ type: "admin.user.created", actor: user, message: `创建用户：${created.username}`, metadata: { userId: created.id, role: created.role }, timeline: false });
    return { user: { id: created.id, username: created.username, name: created.name, role: created.role, enabled: created.enabled } };
  }

  async updateUser(user: any, userId: string, body: any) {
    this.requireAdmin(user);
    const data: any = {};
    for (const key of ["name", "enabled", "avatar", "signature", "theme", "cardBackground", "themeConfig"]) {
      if (body[key] !== undefined) data[key] = body[key];
    }
    const updated = await this.prisma.user.update({ where: { id: userId }, data });
    await this.events.record({ type: "admin.user.updated", actor: user, message: `更新用户：${updated.username}`, metadata: { userId, fields: Object.keys(data) }, timeline: false });
    return { user: updated };
  }

  async resetUserPassword(user: any, userId: string, body: any) { this.requireAdmin(user); await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: bcrypt.hashSync(body.password || "123456", 10) } }); await this.events.record({ type: "admin.user.password_reset", actor: user, message: "重置用户密码", metadata: { userId }, timeline: false }); return { ok: true }; }

  async userSessions(user: any, userId: string) { this.requireAdmin(user); const sessions = await this.prisma.session.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }); return { sessions }; }
  async revokeSession(user: any, sessionId: string) { this.requireAdmin(user); const session = await this.prisma.session.update({ where: { id: sessionId }, data: { revoked: true, revokedReason: "admin_revoked" } }); await this.redis.del(`session:${session.tokenHash}`); await this.events.record({ type: "admin.session.revoked", actor: user, message: "吊销登录会话", metadata: { sessionId }, timeline: false }); return { ok: true }; }

  async changeUserRole(user: any, userId: string, body: any) { this.requireAdmin(user);
    if (body.role !== "SUPER_ADMIN") { const admins = await this.prisma.user.count({ where: { role: "SUPER_ADMIN", enabled: true } }); if (admins <= 1) { const target = await this.prisma.user.findUnique({ where: { id: userId } }); if (target?.role === "SUPER_ADMIN") throw new ForbiddenException("不能移除最后一个超级管理员"); } }
    const updated = await this.prisma.user.update({ where: { id: userId }, data: { role: body.role } });
    await this.invalidateAccess(undefined, userId);
    await this.events.record({ type: "admin.user.role_changed", actor: user, message: `调整用户角色：${updated.username}`, metadata: { userId, role: body.role }, timeline: false });
    return { user: updated }; }

  async userProjects(user: any, userId: string) { this.requireAdmin(user); const members = await this.prisma.projectMember.findMany({ where: { userId }, include: { project: true } }); return { members }; }
  async assignProject(user: any, userId: string, body: any) { this.requireAdmin(user); const m = await this.prisma.projectMember.create({ data: { id: genId("pm"), projectId: body.projectId, userId, role: body.role || "editor" } }); await this.invalidateAccess(body.projectId, userId); await this.events.record({ type: "admin.project.assigned", actor: user, projectId: body.projectId, message: "分配用户到项目", metadata: { userId, role: m.role } }); return { member: m }; }
  async removeProject(user: any, userId: string, projectId: string) { this.requireAdmin(user); await this.prisma.projectMember.deleteMany({ where: { userId, projectId } }); await this.invalidateAccess(projectId, userId); await this.events.record({ type: "admin.project.unassigned", actor: user, projectId, message: "移除用户项目权限", metadata: { userId } }); return { ok: true }; }

  // ---- IP Whitelist ----
  async listIpEntries(user: any, userId?: string) { this.requireAdmin(user); const where: any = {}; if (userId) where.userId = userId; const entries = await this.prisma.userIpWhitelistEntry.findMany({ where }); return { entries }; }
  async addIpEntry(user: any, body: any) { this.requireAdmin(user); const entry = await this.prisma.userIpWhitelistEntry.create({ data: { id: genId("ip"), userId: body.userId, value: body.value, note: body.note || "", enabled: true, createdBy: user.id } }); await this.events.record({ type: "admin.ip_whitelist.added", actor: user, message: "新增 IP 白名单", metadata: { userId: body.userId, value: body.value }, timeline: false }); return { entry }; }
  async removeIpEntry(user: any, entryId: string) { this.requireAdmin(user); await this.prisma.userIpWhitelistEntry.delete({ where: { id: entryId } }); await this.events.record({ type: "admin.ip_whitelist.removed", actor: user, message: "删除 IP 白名单", metadata: { entryId }, timeline: false }); return { ok: true }; }
  async toggleIpPolicy(user: any, body: any) { this.requireAdmin(user); const policy = await this.prisma.userIpPolicy.upsert({ where: { userId: body.userId }, update: { enabled: body.enabled }, create: { id: genId("ipp"), userId: body.userId, enabled: body.enabled } }); await this.events.record({ type: "admin.ip_policy.updated", actor: user, message: `${body.enabled ? "开启" : "关闭"}用户 IP 白名单`, metadata: { userId: body.userId, enabled: body.enabled }, timeline: false }); return { policy }; }

  // ---- Permissions ----
  async roles(user: any) { this.requireAdmin(user); const [roles, scopes] = await Promise.all([this.prisma.roleTemplate.findMany(), this.prisma.permissionScope.findMany()]); const matrix = roles.map(r => ({ roleId: r.id, roleName: r.name, role: r.role, builtin: r.builtin, scopes: scopes.map(s => ({ key: s.key, name: s.name, granted: (r.permissions as string[]).includes(s.key) })) })); return { roles, scopes, matrix }; }
  async createRole(user: any, body: any) { this.requireAdmin(user); const role = await this.prisma.roleTemplate.create({ data: { id: genId("rt"), name: body.name, role: body.role || "custom", builtin: false, permissions: body.permissions || [] } }); await this.events.record({ type: "admin.role.created", actor: user, message: `创建角色模板：${role.name}`, metadata: { roleId: role.id }, timeline: false }); return { role }; }
  async copyRoleTemplate(user: any, roleId: string) { this.requireAdmin(user); const src = await this.prisma.roleTemplate.findUnique({ where: { id: roleId } }); if (!src) throw new NotFoundException("角色模板不存在"); const copy = await this.prisma.roleTemplate.create({ data: { id: genId("rt"), name: `${src.name} (副本)`, role: src.role, builtin: false, permissions: src.permissions as string[] } }); return { role: copy }; }
  async deleteRoleTemplate(user: any, roleId: string) { this.requireAdmin(user); const role = await this.prisma.roleTemplate.findUnique({ where: { id: roleId } }); if (!role) throw new NotFoundException("角色模板不存在"); if (role.builtin) throw new ForbiddenException("内置角色不可删除"); await this.prisma.roleTemplate.delete({ where: { id: roleId } }); return { ok: true }; }
  async updateRolePermissions(user: any, roleId: string, body: any) { this.requireAdmin(user); const role = await this.prisma.roleTemplate.update({ where: { id: roleId }, data: { permissions: body.permissions, ...(body.name ? { name: body.name } : {}) } }); await this.invalidateAccess(); await this.events.record({ type: "admin.role.updated", actor: user, message: `更新角色权限：${role.name}`, metadata: { roleId, permissionCount: role.permissions.length }, timeline: false }); return { role }; }
  async createScope(user: any, body: any) { this.requireAdmin(user); const scope = await this.prisma.permissionScope.create({ data: { id: genId("ps"), key: body.key, name: body.name, target: body.target || "project", enabled: body.enabled !== false } }); return { scope }; }
  async updateScope(user: any, scopeId: string, body: any) { this.requireAdmin(user); const scope = await this.prisma.permissionScope.update({ where: { id: scopeId }, data: body }); return { scope }; }
  async deleteScope(user: any, scopeId: string) { this.requireAdmin(user); await this.prisma.permissionScope.delete({ where: { id: scopeId } }); return { ok: true }; }
  async permissionMatrix(user: any) { this.requireAdmin(user); return this.roles(user); }

  // ---- Audit ----
  async auditLogs(user: any, query: any = {}) { this.requireAdmin(user); const where: any = {}; if (query.type) where.type = query.type; if (query.actorId) where.actorId = query.actorId; const [logs, total] = await Promise.all([this.prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, take: Math.min(100, Number(query.pageSize || 50)), skip: (Math.max(1, Number(query.page || 1)) - 1) * Number(query.pageSize || 50) }), this.prisma.auditLog.count({ where })]); return { logs, total, page: Number(query.page || 1), pageSize: Number(query.pageSize || 50) }; }

  // ---- Notifications ----
  async notif(user: any) {
    this.requireAdmin(user);
    const [rules, logs, channels, keys] = await Promise.all([
      this.prisma.notificationRule.findMany(),
      this.prisma.notificationLog.findMany({ take: 500, orderBy: { createdAt: "desc" } }),
      this.prisma.notificationChannel.findMany({ orderBy: { createdAt: "asc" } }),
      this.prisma.notificationKey.findMany({ orderBy: { createdAt: "asc" } }),
    ]);
    return {
      rules,
      logs,
      channels,
      keys: keys.map(k => ({ id: k.id, name: k.name, channelId: k.channelId, type: k.type, enabled: k.enabled, secretMasked: k.secretMasked })),
      callback: this.callbackInfo(),
    };
  }

  private callbackInfo() {
    const path = "/api/feishu/card-callback";
    const url = this.config.publicBaseUrl ? `${this.config.publicBaseUrl}${path}` : "";
    return {
      path,
      url,
      configured: !!url && /^https:\/\//i.test(url),
      hint: url ? "请在飞书开放平台的卡片回调请求地址中填写该 URL" : "请先在后端环境变量 PUBLIC_BASE_URL 配置公网 HTTPS 域名",
    };
  }
  async createRule(user: any, body: any) { this.requireAdmin(user); const rule = await this.prisma.notificationRule.create({ data: { id: genId("nr"), event: body.event, channel: body.channel || "feishu", targetMode: body.targetMode || "creator", targets: body.targets || [], enabled: body.enabled !== false } }); return { rule }; }
  async updateRule(user: any, ruleId: string, body: any) { this.requireAdmin(user); const rule = await this.prisma.notificationRule.update({ where: { id: ruleId }, data: body }); return { rule }; }
  async deleteRule(user: any, ruleId: string) { this.requireAdmin(user); await this.prisma.notificationRule.delete({ where: { id: ruleId } }); return { ok: true }; }
  async toggleRule(user: any, ruleId: string) { this.requireAdmin(user); const r = await this.prisma.notificationRule.findUnique({ where: { id: ruleId } }); if (!r) throw new NotFoundException(); const rule = await this.prisma.notificationRule.update({ where: { id: ruleId }, data: { enabled: !r.enabled } }); return { rule }; }
  async createChannel(user: any, body: any) { this.requireAdmin(user); const channel = await this.prisma.notificationChannel.create({ data: { id: genId("nc"), name: body.name, type: body.type, enabled: body.enabled !== false, config: body.config || {} } }); return { channel }; }
  async updateChannel(user: any, channelId: string, body: any) { this.requireAdmin(user); const channel = await this.prisma.notificationChannel.update({ where: { id: channelId }, data: body }); return { channel }; }
  async deleteChannel(user: any, channelId: string) { this.requireAdmin(user); await this.prisma.notificationChannel.delete({ where: { id: channelId } }); return { ok: true }; }
  async createKey(user: any, body: any) {
    this.requireAdmin(user);
    const secret = String(body.secret || "");
    if (!secret) throw new ForbiddenException("通知 Key 不能为空");
    const type = body.type || "webhook";
    const appId = String(body.appId || "");
    const creatorReceiveId = String(body.creatorReceiveId || "");
    const receiveIdType = String(body.receiveIdType || "open_id");
    const creatorContact = String(body.creatorContact || "");
    const contactType = String(body.contactType || (creatorContact.includes("@") ? "email" : "mobile"));
    if (type === "feishu_app") this.feishu.assertAppCredentials(appId, secret);
    else if ((body.channel || body.channelId) === "feishu" || body.channelId === "nc_feishu" || body.name?.includes("飞书")) this.feishu.assertWebhook(secret);
    const channel = await this.prisma.notificationChannel.upsert({
      where: { id: body.channelId || "nc_feishu" },
      update: { enabled: body.enabled !== false, config: type === "feishu_app" ? { appId, appSecretMasked: maskSecret(secret), creatorReceiveId, receiveIdType, creatorContact, contactType } : { webhookMasked: maskSecret(secret) } },
      create: { id: body.channelId || "nc_feishu", name: "飞书机器人", type: "feishu", enabled: body.enabled !== false, config: type === "feishu_app" ? { appId, appSecretMasked: maskSecret(secret), creatorReceiveId, receiveIdType, creatorContact, contactType } : { webhookMasked: maskSecret(secret) } },
    });
    const key = await this.prisma.notificationKey.create({ data: { id: genId("nk"), name: body.name || (type === "feishu_app" ? "飞书应用凭据" : "飞书机器人 Webhook"), channelId: channel.id, type, secretEncrypted: encryptSecret(secret), secretMasked: maskSecret(secret), enabled: body.enabled !== false } });
    return { key: { id: key.id, name: key.name, channelId: key.channelId, type: key.type, enabled: key.enabled, secretMasked: key.secretMasked } };
  }
  async updateKey(user: any, keyId: string, body: any) {
    this.requireAdmin(user);
    const data: any = { ...body };
    if (body.secret !== undefined) {
      const secret = String(body.secret || "");
      if (!secret) throw new ForbiddenException("通知 Key 不能为空");
      const current = await this.prisma.notificationKey.findUnique({ where: { id: keyId } });
      const type = body.type || current?.type || "webhook";
      const appId = String(body.appId || "");
      const creatorReceiveId = String(body.creatorReceiveId || "");
      const receiveIdType = String(body.receiveIdType || "open_id");
      const creatorContact = String(body.creatorContact || "");
      const contactType = String(body.contactType || (creatorContact.includes("@") ? "email" : "mobile"));
      if (type === "feishu_app") this.feishu.assertAppCredentials(appId, secret);
      else if (current?.channelId === "nc_feishu" || body.name?.includes("飞书")) this.feishu.assertWebhook(secret);
      data.secretEncrypted = encryptSecret(secret);
      data.secretMasked = maskSecret(secret);
      delete data.secret;
      delete data.appId;
      if (current?.channelId) await this.prisma.notificationChannel.update({
        where: { id: current.channelId },
        data: { config: type === "feishu_app" ? { appId, appSecretMasked: maskSecret(secret), creatorReceiveId, receiveIdType, creatorContact, contactType } : { webhookMasked: maskSecret(secret) }, enabled: body.enabled !== false },
      });
    }
    const key = await this.prisma.notificationKey.update({ where: { id: keyId }, data });
    await this.events.record({ type: "admin.notification_key.updated", actor: user, message: `更新通知 Key：${key.name}`, metadata: { keyId }, timeline: false });
    return { key: { id: key.id, name: key.name, channelId: key.channelId, type: key.type, enabled: key.enabled, secretMasked: key.secretMasked } };
  }
  async deleteKey(user: any, keyId: string) { this.requireAdmin(user); await this.prisma.notificationKey.delete({ where: { id: keyId } }); return { ok: true }; }
  async retry(user: any, logId: string) { this.requireAdmin(user); const log = await this.prisma.notificationLog.findUnique({ where: { id: logId } }); if (!log) throw new NotFoundException("通知日志不存在"); const updated = await this.prisma.notificationLog.update({ where: { id: logId }, data: { status: "queued", retryCount: (log.retryCount || 0) + 1 } }); return { log: updated }; }

  private parseRuleConfig(rule: any) {
    const raw = Array.isArray(rule?.targets) ? rule.targets[0] : "";
    if (!raw) return {};
    try { return JSON.parse(raw); } catch { return {}; }
  }

  private normalizeDailyReportConfig(body: any = {}) {
    const creatorContact = String(body.creatorContact || "").trim();
    const contactType = String(body.contactType || (creatorContact.includes("@") ? "email" : "mobile"));
    return {
      sendTime: String(body.sendTime || "18:00"),
      creatorContact,
      contactType: contactType === "email" ? "email" : "mobile",
      enabled: body.enabled !== false,
    };
  }

  private sameDay(date: Date | null | undefined, day: Date) {
    if (!date) return false;
    return date.toISOString().slice(0, 10) === day.toISOString().slice(0, 10);
  }

  private daysLate(end: Date, today: Date) {
    const day = 24 * 60 * 60 * 1000;
    const a = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
    const b = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
    return Math.max(0, Math.round((b - a) / day));
  }

  private async buildDailyReport(user: any) {
    const projectIds = await this.visibleProjectIds(user);
    const visibleIds = [...projectIds];
    const [projects, tasks, progressItems] = await Promise.all([
      this.prisma.project.findMany({ where: { id: { in: visibleIds }, status: { not: "DELETED" as any } }, orderBy: [{ updatedAt: "desc" }, { id: "asc" }] }),
      this.prisma.task.findMany({ where: { projectId: { in: visibleIds }, status: { notIn: ["DELETED", "ARCHIVED"] as any } }, orderBy: [{ currentEnd: "asc" }, { sortOrder: "asc" }, { id: "asc" }] }),
      this.prisma.taskProgress.findMany({ where: { projectId: { in: visibleIds }, status: { not: "DELETED" as any } }, include: { submissions: { where: { deleted: false }, select: { id: true } } } }),
    ]);
    const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);
    const activeProjects = projects.filter(project => project.status !== "DELETED");
    const activeProjectIds = new Set(activeProjects.map(project => project.id));
    const activeTasks = tasks.filter(task => activeProjectIds.has(task.projectId));
    const projectMap = new Map(activeProjects.map(project => [project.id, project]));
    const taskProgressMap = progressItems.reduce((map: Map<string, any[]>, item) => {
      const list = map.get(item.taskId) || [];
      list.push(item);
      map.set(item.taskId, list);
      return map;
    }, new Map<string, any[]>());
    const effectiveProgress = (task: any) => {
      if (task.status === "DONE") return 100;
      const items = taskProgressMap.get(task.id) || [];
      if (!items.length) return 0;
      return Math.round(items.reduce((sum, item) => sum + (item.status === "COMPLETED" ? 100 : Math.max(0, Math.min(100, item.progress || 0))), 0) / items.length);
    };
    const isCurrentToday = (task: any) => task.currentStart.getTime() <= today.getTime() && task.currentEnd.getTime() >= today.getTime();
    const isOverdue = (task: any) => task.currentEnd.getTime() < today.getTime();
    const pendingTasks = activeTasks.filter(task => task.status !== "DONE" && (isCurrentToday(task) || isOverdue(task)));
    const dueToday = activeTasks.filter(task => task.status !== "DONE" && this.sameDay(task.currentEnd, today));
    const overdueTasks = activeTasks.filter(task => task.status !== "DONE" && isOverdue(task));
    const completedToday = activeTasks.filter(task => task.status === "DONE" && (this.sameDay(task.updatedAt, today) || (taskProgressMap.get(task.id) || []).some(item => this.sameDay(item.actualEnd, today))));
    const blockedTasks = activeTasks.filter(task => task.status === "BLOCKED");
    const doneCount = activeTasks.filter(task => task.status === "DONE").length;
    const doingCount = activeTasks.filter(task => task.status === "DOING").length;
    const todoCount = activeTasks.filter(task => task.status === "TODO").length;
    const pendingFiles = progressItems.filter(item => !["COMPLETED", "ABANDONED"].includes(item.status) && item.submissions.length === 0).length;
    const riskProjectIds = new Set<string>();
    activeProjects.filter(project => project.risk !== "low").forEach(project => riskProjectIds.add(project.id));
    blockedTasks.forEach(task => riskProjectIds.add(task.projectId));
    overdueTasks.forEach(task => riskProjectIds.add(task.projectId));
    const overallProgress = activeTasks.length ? Math.round(activeTasks.reduce((sum, task) => sum + effectiveProgress(task), 0) / activeTasks.length) : 0;
    const focusTasks = pendingTasks.slice(0, 5).map(task => ({
      id: task.id,
      title: task.title,
      projectName: projectMap.get(task.projectId)?.name || "",
      status: task.status,
      currentEnd: task.currentEnd.toISOString().slice(0, 10),
      lateDays: this.daysLate(task.currentEnd, today),
    }));
    const riskProjects = [...riskProjectIds].slice(0, 5).map(id => {
      const project = projectMap.get(id);
      const projectTasks = activeTasks.filter(task => task.projectId === id);
      return {
        id,
        name: project?.name || "",
        risk: project?.risk || "low",
        blocked: projectTasks.filter(task => task.status === "BLOCKED").length,
        overdue: projectTasks.filter(task => task.status !== "DONE" && isOverdue(task)).length,
      };
    });
    const report = {
      date: today.toISOString().slice(0, 10),
      projectCount: activeProjects.length,
      taskCount: activeTasks.length,
      doneCount,
      doingCount,
      todoCount,
      blockedCount: blockedTasks.length,
      completedToday: completedToday.length,
      pendingToday: pendingTasks.length,
      dueToday: dueToday.length,
      overdue: overdueTasks.length,
      pendingFiles,
      riskProjects: riskProjectIds.size,
      overallProgress,
      focusTasks,
      riskItems: riskProjects,
    };
    return { report, text: this.formatDailyReportText(report), card: this.formatDailyReportCard(report) };
  }

  private formatDailyReportText(report: any) {
    const date = report.date.replace(/-/g, "/");
    const lines = [
      `**LightTask 日报｜${date}**`,
      "",
      `**今日概览**`,
      `- 项目：${report.projectCount} 个`,
      `- 任务：${report.taskCount} 个`,
      `- 整体进度：${report.overallProgress}%`,
      "",
      `**任务状态**`,
      `- 已完成：${report.doneCount}`,
      `- 推进中：${report.doingCount}`,
      `- 待处理：${report.todoCount}`,
      `- 阻塞：${report.blockedCount}`,
      "",
      `**今日待处理**`,
      `- 需推进：${report.pendingToday} 项`,
      `- 今日到期：${report.dueToday} 项`,
      `- 已逾期：${report.overdue} 项`,
      "",
      `**交付与风险**`,
      `- 今日完成：${report.completedToday} 项`,
      `- 待收集文件：${report.pendingFiles} 个`,
      `- 风险项目：${report.riskProjects} 个`,
    ];
    if (report.focusTasks.length) {
      lines.push("", "**重点跟进**");
      report.focusTasks.forEach((task: any, index: number) => {
        const suffix = task.lateDays > 0 ? `，逾期 ${task.lateDays} 天` : `，截止 ${task.currentEnd}`;
        lines.push(`${index + 1}. **${task.title}**（${task.projectName}${suffix}）`);
      });
    }
    if (report.riskItems.length) {
      lines.push("", "**风险项目**");
      report.riskItems.forEach((project: any, index: number) => {
        lines.push(`${index + 1}. **${project.name}**（阻塞 ${project.blocked}，逾期 ${project.overdue}）`);
      });
    }
    return lines.join("\n");
  }

  private formatDailyReportCard(report: any) {
    const date = report.date.replace(/-/g, "/");
    const focus = report.focusTasks.length
      ? report.focusTasks.map((task: any, index: number) => {
        const suffix = task.lateDays > 0 ? `逾期 ${task.lateDays} 天` : `截止 ${task.currentEnd}`;
        return `${index + 1}. **${task.title}**｜${task.projectName}｜${suffix}`;
      }).join("\n")
      : "今天没有需要重点跟进的任务。";
    const risks = report.riskItems.length
      ? report.riskItems.map((project: any, index: number) => `${index + 1}. **${project.name}**｜阻塞 ${project.blocked}｜逾期 ${project.overdue}`).join("\n")
      : "暂无风险项目。";
    const template = report.overdue > 0 || report.riskProjects > 0 ? "yellow" : report.pendingToday > 0 ? "wathet" : "green";
    return {
      config: { wide_screen_mode: true },
      header: {
        template,
        title: { tag: "plain_text", content: `LightTask 日报｜${date}` },
      },
      elements: [
        {
          tag: "div",
          text: {
            tag: "lark_md",
            content: `**今日概览**\n项目 **${report.projectCount}** 个｜任务 **${report.taskCount}** 个｜整体进度 **${report.overallProgress}%**`,
          },
        },
        {
          tag: "div",
          fields: [
            { is_short: true, text: { tag: "lark_md", content: `**今日待处理**\n${report.pendingToday} 项` } },
            { is_short: true, text: { tag: "lark_md", content: `**推进中**\n${report.doingCount} 项` } },
            { is_short: true, text: { tag: "lark_md", content: `**已完成**\n${report.doneCount} 项` } },
            { is_short: true, text: { tag: "lark_md", content: `**风险项目**\n${report.riskProjects} 个` } },
            { is_short: true, text: { tag: "lark_md", content: `**待收集文件**\n${report.pendingFiles} 个` } },
            { is_short: true, text: { tag: "lark_md", content: `**逾期任务**\n${report.overdue} 项` } },
          ],
        },
        { tag: "hr" },
        { tag: "div", text: { tag: "lark_md", content: `**重点跟进**\n${focus}` } },
        { tag: "hr" },
        { tag: "div", text: { tag: "lark_md", content: `**风险项目**\n${risks}` } },
        {
          tag: "note",
          elements: [
            { tag: "plain_text", content: "日报依据当前任务条、任务进度、提交物和项目风险实时生成。" },
          ],
        },
      ],
    };
  }

  async saveDailyReportRule(user: any, body: any) {
    this.requireAdmin(user);
    const config = this.normalizeDailyReportConfig(body);
    const existing = await this.prisma.notificationRule.findFirst({ where: { event: "daily.report", channel: "feishu" } });
    const data = { event: "daily.report", channel: "feishu", targetMode: "creator", targets: [JSON.stringify(config)], enabled: config.enabled };
    const rule = existing
      ? await this.prisma.notificationRule.update({ where: { id: existing.id }, data })
      : await this.prisma.notificationRule.create({ data: { id: genId("nr"), ...data } });
    return { rule, config };
  }

  async dailyReportPreview(user: any) {
    this.requireAdmin(user);
    return this.buildDailyReport(user);
  }

  private async runDailyReportSchedule() {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    const todayKey = now.toISOString().slice(0, 10);
    const rules = await this.prisma.notificationRule.findMany({ where: { event: "daily.report", channel: "feishu", enabled: true } });
    if (!rules.length) return;
    const systemUser = await this.prisma.user.findFirst({ where: { role: "SUPER_ADMIN", enabled: true }, orderBy: { createdAt: "asc" } });
    if (!systemUser) return;
    for (const rule of rules) {
      const config = this.parseRuleConfig(rule);
      if ((config as any).sendTime !== currentTime) continue;
      const sent = await this.redis.incrementWithTtl(`notification:daily-report:sent:${todayKey}:${rule.id}`, 36 * 60 * 60);
      if (sent !== 1) continue;
      try {
        await this.sendDailyReport(systemUser, config);
      } catch (error: any) {
        this.logger.warn(`Daily report send failed for ${rule.id}: ${error?.message || error}`);
      }
    }
  }

  private async runNotificationSchedules() {
    await this.runDailyReportSchedule();
    await this.runTaskReminderSchedule();
  }

  private defaultReminderConfigs() {
    return [
      { event: "task.near_due", title: "任务临期提醒", enabled: true, leadDays: 1, sendTime: "09:30", template: "blue" },
      { event: "task.due", title: "任务到期提醒", enabled: true, leadDays: 0, sendTime: "10:00", template: "yellow" },
      { event: "task.overdue", title: "任务过期提醒", enabled: true, sendTime: "10:30", repeatDays: 1, template: "red" },
      { event: "project.invite", title: "邀请加入项目", enabled: true, template: "green" },
    ];
  }

  async bootstrapReminderRules(user: any) {
    this.requireAdmin(user);
    const rules = [];
    for (const config of this.defaultReminderConfigs()) {
      const existing = await this.prisma.notificationRule.findFirst({ where: { event: config.event, channel: "feishu" } });
      const data = { event: config.event, channel: "feishu", targetMode: "creator", targets: [JSON.stringify(config)], enabled: config.enabled };
      rules.push(existing
        ? await this.prisma.notificationRule.update({ where: { id: existing.id }, data })
        : await this.prisma.notificationRule.create({ data: { id: genId("nr"), ...data } }));
    }
    return { rules };
  }

  async checkFeishuCallback(user: any) {
    this.requireAdmin(user);
    const challenge = `lt_${Date.now()}`;
    const response = await this.handleFeishuCardCallback({ challenge });
    const ok = response?.challenge === challenge;
    return { ok, callback: this.callbackInfo(), challenge, response };
  }

  private async feishuAppContext() {
    const [channel, key] = await Promise.all([
      this.prisma.notificationChannel.findUnique({ where: { id: "nc_feishu" } }),
      this.prisma.notificationKey.findFirst({ where: { channelId: "nc_feishu", type: "feishu_app", enabled: true }, orderBy: { createdAt: "desc" } }),
    ]);
    const config = channel?.config as any;
    return {
      channel,
      key,
      appId: String(config?.appId || ""),
      creatorContact: String(config?.creatorContact || ""),
      contactType: String(config?.contactType || (String(config?.creatorContact || "").includes("@") ? "email" : "mobile")),
      appSecret: key ? decryptSecret(key.secretEncrypted) : "",
    };
  }

  private dateKey(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  private daysUntil(from: Date, to: Date) {
    const day = 24 * 60 * 60 * 1000;
    const a = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
    const b = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
    return Math.round((b - a) / day);
  }

  private async runTaskReminderSchedule() {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    const today = new Date(`${this.dateKey(now)}T00:00:00Z`);
    const rules = await this.prisma.notificationRule.findMany({
      where: { event: { in: ["task.near_due", "task.due", "task.overdue"] }, channel: "feishu", enabled: true },
    });
    if (!rules.length) return;
    const context = await this.feishuAppContext();
    if (!context.channel || !context.key || !context.appId || !context.creatorContact) return;
    for (const rule of rules) {
      const config: any = { ...(this.defaultReminderConfigs().find(item => item.event === rule.event) || {}), ...this.parseRuleConfig(rule) };
      if (config.sendTime && config.sendTime !== currentTime) continue;
      const tasks = await this.tasksForReminder(rule.event, config, today);
      for (const task of tasks) {
        const snoozed = await this.redis.getJson<any>(`notification:snooze:${task.id}`);
        if (snoozed) continue;
        const sentKey = `notification:${rule.event}:sent:${this.dateKey(today)}:${task.id}`;
        const sent = await this.redis.incrementWithTtl(sentKey, 36 * 60 * 60);
        if (sent !== 1) continue;
        const card = this.formatTaskReminderCard(rule.event, config, task, today);
        const text = this.formatTaskReminderText(rule.event, task, today);
        const result = await this.feishu.sendAppInteractiveToContact(context.appId, context.appSecret, context.creatorContact, context.contactType, card);
        await this.prisma.notificationLog.create({
          data: {
            id: genId("nl"),
            ruleId: rule.id,
            event: rule.event,
            projectId: task.projectId,
            channel: "feishu",
            targetMode: "creator",
            targets: JSON.stringify([{ type: context.contactType, value: context.creatorContact, openId: (result as any).resolvedOpenId || "" }]),
            status: result.ok ? "success" : "failed",
            message: result.ok ? `${config.title}已发送：${task.title}` : `${config.title}发送失败：${result.message || text}`,
          },
        });
      }
    }
  }

  private async tasksForReminder(event: string, config: any, today: Date) {
    const tasks = await this.prisma.task.findMany({
      where: { status: { notIn: ["DONE", "DELETED", "ARCHIVED"] as any } },
      include: { project: true, progressItems: { include: { user: { select: { id: true, name: true, username: true } } } } },
      orderBy: [{ currentEnd: "asc" }, { sortOrder: "asc" }, { id: "asc" }],
      take: 200,
    });
    return tasks.filter(task => {
      const days = this.daysUntil(today, task.currentEnd);
      if (event === "task.near_due") return days > 0 && days <= Number(config.leadDays || 1);
      if (event === "task.due") return days === 0;
      if (event === "task.overdue") return days < 0;
      return false;
    }).slice(0, 20);
  }

  private reminderTone(event: string) {
    if (event === "task.overdue") return { title: "任务已过期", template: "red", action: "处理逾期" };
    if (event === "task.due") return { title: "任务今天到期", template: "yellow", action: "今日完成" };
    return { title: "任务即将到期", template: "blue", action: "提前推进" };
  }

  private formatTaskReminderText(event: string, task: any, today: Date) {
    const tone = this.reminderTone(event);
    const days = this.daysUntil(today, task.currentEnd);
    const due = this.dateKey(task.currentEnd).replace(/-/g, "/");
    const assignees = (task.progressItems || []).map((item: any) => item.user?.name || item.user?.username || item.userId).filter(Boolean).join("、") || "未分配";
    return `**${tone.title}**\n任务：**${task.title}**\n项目：${task.project?.name || ""}\n当前截止：${due}${days < 0 ? `（逾期 ${Math.abs(days)} 天）` : days === 0 ? "（今天）" : `（剩 ${days} 天）`}\n负责人：${assignees}`;
  }

  private formatTaskReminderCard(event: string, config: any, task: any, today: Date) {
    const tone = this.reminderTone(event);
    const days = this.daysUntil(today, task.currentEnd);
    const due = this.dateKey(task.currentEnd).replace(/-/g, "/");
    const assignees = (task.progressItems || []).map((item: any) => item.user?.name || item.user?.username || item.userId).filter(Boolean).join("、") || "未分配";
    const statusText = task.status === "BLOCKED" ? "阻塞" : task.status === "DOING" ? "进行中" : "待处理";
    const deadlineText = days < 0 ? `已逾期 **${Math.abs(days)}** 天` : days === 0 ? "**今天到期**" : `剩余 **${days}** 天`;
    return {
      config: { wide_screen_mode: true },
      header: { template: config.template || tone.template, title: { tag: "plain_text", content: `${tone.title}｜${task.title}` } },
      elements: [
        { tag: "div", text: { tag: "lark_md", content: `**${task.title}**\n${deadlineText}，建议${tone.action}。` } },
        {
          tag: "div",
          fields: [
            { is_short: true, text: { tag: "lark_md", content: `**项目**\n${task.project?.name || "-"}` } },
            { is_short: true, text: { tag: "lark_md", content: `**当前截止**\n${due}` } },
            { is_short: true, text: { tag: "lark_md", content: `**负责人**\n${assignees}` } },
            { is_short: true, text: { tag: "lark_md", content: `**状态**\n${statusText}` } },
          ],
        },
        ...(task.note ? [{ tag: "div", text: { tag: "lark_md", content: `**备注**\n${task.note}` } }] : []),
        {
          tag: "action",
          actions: [
            {
              tag: "button",
              text: { tag: "plain_text", content: "确认完成" },
              type: "primary",
              value: { action: "complete_task", taskId: task.id, source: event },
              confirm: { title: { tag: "plain_text", content: "确认完成任务？" }, text: { tag: "plain_text", content: "确认后任务会标记为已完成，进度更新为 100%。" } },
            },
            {
              tag: "button",
              text: { tag: "plain_text", content: task.status === "BLOCKED" ? "解除阻塞" : "标记推进中" },
              type: "default",
              value: { action: "resume_task", taskId: task.id, source: event },
            },
            {
              tag: "button",
              text: { tag: "plain_text", content: "明天提醒" },
              type: "default",
              value: { action: "snooze_task", taskId: task.id, source: event, days: 1 },
            },
          ],
        },
        { tag: "note", elements: [{ tag: "plain_text", content: "来自 LightTask 自动提醒。按钮操作会回写到后端并记录日志。" }] },
      ],
    };
  }

  async handleFeishuCardCallback(body: any) {
    if (body?.challenge) return { challenge: body.challenge };
    const value = body?.action?.value || body?.event?.action?.value || body?.action || {};
    const action = value.action;
    const taskId = value.taskId;
    if (action === "ack_project_invite") {
      await this.prisma.notificationLog.create({ data: { id: genId("nl"), event: "card.action.ack_project_invite", projectId: value.projectId, channel: "feishu", targetMode: "card", targets: JSON.stringify(value), status: "success", message: "飞书卡片确认收到项目邀请" } });
      return { toast: { type: "success", content: "已确认收到邀请" } };
    }
    if (action === "snooze_project_invite") {
      await this.redis.setJson(`notification:snooze:project-invite:${value.projectId}:${value.userId || "unknown"}`, { at: new Date().toISOString() }, 24 * 60 * 60);
      await this.prisma.notificationLog.create({ data: { id: genId("nl"), event: "card.action.snooze_project_invite", projectId: value.projectId, channel: "feishu", targetMode: "card", targets: JSON.stringify(value), status: "success", message: "飞书卡片稍后查看项目邀请" } });
      return { toast: { type: "success", content: "已设置稍后查看" } };
    }
    if (!action || !taskId) return { toast: { type: "warning", content: "未识别的操作" } };
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) return { toast: { type: "warning", content: "任务不存在" } };
    if (action === "complete_task") {
      await this.prisma.task.update({ where: { id: taskId }, data: { status: "DONE" as any } });
      await this.prisma.taskProgress.updateMany({ where: { taskId }, data: { status: "COMPLETED" as any, progress: 100, actualEnd: new Date() } });
      await this.redis.invalidateBusinessCaches();
      await this.prisma.notificationLog.create({ data: { id: genId("nl"), event: "card.action.complete_task", projectId: task.projectId, channel: "feishu", targetMode: "card", targets: JSON.stringify(value), status: "success", message: `飞书卡片确认完成：${task.title}` } });
      return { toast: { type: "success", content: "任务已标记为完成" } };
    }
    if (action === "resume_task") {
      await this.prisma.task.update({ where: { id: taskId }, data: { status: "DOING" as any } });
      await this.prisma.taskProgress.updateMany({ where: { taskId, status: { not: "COMPLETED" as any } }, data: { status: "DOING" as any, actualStart: new Date() } });
      await this.redis.invalidateBusinessCaches();
      await this.prisma.notificationLog.create({ data: { id: genId("nl"), event: "card.action.resume_task", projectId: task.projectId, channel: "feishu", targetMode: "card", targets: JSON.stringify(value), status: "success", message: `飞书卡片恢复推进：${task.title}` } });
      return { toast: { type: "success", content: "任务已恢复为推进中" } };
    }
    if (action === "snooze_task") {
      await this.redis.setJson(`notification:snooze:${taskId}`, { days: Number(value.days || 1), at: new Date().toISOString() }, 24 * 60 * 60 * Number(value.days || 1));
      await this.prisma.notificationLog.create({ data: { id: genId("nl"), event: "card.action.snooze_task", projectId: task.projectId, channel: "feishu", targetMode: "card", targets: JSON.stringify(value), status: "success", message: `飞书卡片稍后提醒：${task.title}` } });
      return { toast: { type: "success", content: "已设置明天提醒" } };
    }
    return { toast: { type: "warning", content: "暂不支持该操作" } };
  }

  async sendDailyReport(user: any, body: any) {
    this.requireAdmin(user);
    const channel = await this.prisma.notificationChannel.findUnique({ where: { id: "nc_feishu" } });
    const key = await this.prisma.notificationKey.findFirst({ where: { channelId: "nc_feishu", type: "feishu_app", enabled: true }, orderBy: { createdAt: "desc" } });
    const rule = await this.prisma.notificationRule.findFirst({ where: { event: "daily.report", channel: "feishu" } });
    const config = { ...this.parseRuleConfig(rule), ...this.normalizeDailyReportConfig(body) };
    const channelConfig = channel?.config as any;
    const appId = String(channelConfig?.appId || body.appId || "");
    const creatorContact = String(config.creatorContact || channelConfig?.creatorContact || "");
    const contactType = String(config.contactType || channelConfig?.contactType || (creatorContact.includes("@") ? "email" : "mobile"));
    const { report, text, card } = await this.buildDailyReport(user);
    if (!channel || !key || !appId) {
      const log = await this.prisma.notificationLog.create({ data: { id: genId("nl"), ruleId: rule?.id, event: "daily.report", channel: "feishu", targetMode: "creator", targets: "[]", status: "failed", message: "日报发送失败：未配置飞书应用凭据" } });
      throw new ForbiddenException({ message: "请先配置飞书 App ID/App Secret", log });
    }
    if (!creatorContact) {
      const log = await this.prisma.notificationLog.create({ data: { id: genId("nl"), ruleId: rule?.id, event: "daily.report", channel: "feishu", targetMode: "creator", targets: "[]", status: "failed", message: "日报发送失败：未配置创建者手机号或邮箱" } });
      throw new ForbiddenException({ message: "请先配置日报接收人手机号或邮箱", log });
    }
    const result = await this.feishu.sendAppInteractiveToContact(appId, decryptSecret(key.secretEncrypted), creatorContact, contactType, card);
    const log = await this.prisma.notificationLog.create({
      data: {
        id: genId("nl"),
        ruleId: rule?.id,
        event: "daily.report",
        channel: "feishu",
        targetMode: "creator",
        targets: JSON.stringify([{ type: contactType, value: creatorContact, openId: (result as any).resolvedOpenId || "" }]),
        status: result.ok ? "success" : "failed",
        message: result.ok ? `日报已发送：${report.pendingToday} 项今日待处理` : `日报发送失败：${result.message}`,
      },
    });
    if (!result.ok) throw new ForbiddenException({ message: result.message, log, feishu: result.raw });
    await this.saveDailyReportRule(user, { ...config, creatorContact, contactType });
    return { ok: true, message: "日报已发送给创建者", report, text, log };
  }

  async testNotification(user: any, body: any) {
    this.requireAdmin(user);
    const channelType = body.channel || "feishu";
    if (channelType !== "feishu") throw new ForbiddenException("当前仅支持飞书机器人测试");

    const channel = await this.prisma.notificationChannel.upsert({
      where: { id: "nc_feishu" },
      update: { name: "飞书机器人", type: "feishu", enabled: true },
      create: { id: "nc_feishu", name: "飞书机器人", type: "feishu", enabled: true, config: {} },
    });
    const mode = body.mode || "webhook";
    const key = await this.prisma.notificationKey.findFirst({
      where: { channelId: channel.id, type: mode === "app" ? "feishu_app" : "webhook", enabled: true },
      orderBy: { createdAt: "desc" },
    });
    if (!key) {
      const log = await this.prisma.notificationLog.create({
        data: {
          id: genId("nl"),
          event: "notification.test",
          channel: "feishu",
          targetMode: "system",
          targets: "[]",
          status: "failed",
          message: mode === "app" ? "飞书应用测试失败：未配置 App ID/App Secret" : "飞书测试失败：未配置机器人 Webhook",
        },
      });
      throw new ForbiddenException({ message: mode === "app" ? "请先配置飞书 App ID/App Secret" : "请先配置飞书机器人 Webhook", log });
    }

    if (mode === "app") {
      const appSecret = decryptSecret(key.secretEncrypted);
      const channelConfig = channel.config as any;
      const appId = String(channelConfig?.appId || body.appId || "");
      const receiveId = String(body.receiveId || channelConfig?.creatorReceiveId || "");
      const receiveIdType = String(body.receiveIdType || channelConfig?.receiveIdType || "open_id");
      const creatorContact = String(body.creatorContact || channelConfig?.creatorContact || "");
      const contactType = String(body.contactType || channelConfig?.contactType || (creatorContact.includes("@") ? "email" : "mobile"));
      const text = String(body.message || "").trim() || `LightTask 飞书机器人测试消息\n创建者：${user.name || user.username}\n时间：${new Date().toLocaleString("zh-CN", { hour12: false })}`;
      if (!creatorContact && !receiveId) {
        const log = await this.prisma.notificationLog.create({
          data: {
            id: genId("nl"),
            event: "notification.test",
            channel: "feishu",
            targetMode: "creator",
            targets: "[]",
            status: "failed",
            message: "飞书机器人测试发送失败：未配置创建者手机号或邮箱",
          },
        });
        throw new ForbiddenException({ message: "请先配置创建者手机号或邮箱", log });
      }
      const result = creatorContact
        ? await this.feishu.sendAppTextToContact(appId, appSecret, creatorContact, contactType, text)
        : await this.feishu.sendAppText(appId, appSecret, receiveId, receiveIdType, text);
      const log = await this.prisma.notificationLog.create({
        data: {
          id: genId("nl"),
          event: "notification.test",
          channel: "feishu",
          targetMode: "creator",
          targets: JSON.stringify([creatorContact ? { type: contactType, value: creatorContact, openId: (result as any).resolvedOpenId || "" } : { type: receiveIdType, id: receiveId }]),
          status: result.ok ? "success" : "failed",
          message: result.ok ? "飞书机器人测试消息已发送给创建者" : `飞书机器人测试发送失败：${result.message}`,
        },
      });
      if (!result.ok) throw new ForbiddenException({ message: result.message, log, feishu: result.raw });
      return { ok: true, message: "飞书机器人测试消息已发送给创建者", tokenPreview: result.tokenPreview, expire: result.expire, log };
    }

    const webhook = decryptSecret(key.secretEncrypted);
    const text = String(body.message || "").trim() || `LightTask 飞书机器人测试消息\n发送人：${user.name || user.username}\n时间：${new Date().toLocaleString("zh-CN", { hour12: false })}`;
    const result = await this.feishu.sendText(webhook, text);
    const log = await this.prisma.notificationLog.create({
      data: {
        id: genId("nl"),
        event: "notification.test",
        channel: "feishu",
        targetMode: "system",
        targets: "[]",
        status: result.ok ? "success" : "failed",
        message: result.ok ? "飞书测试消息发送成功" : `飞书测试失败：${result.message}`,
      },
    });
    if (!result.ok) throw new ForbiddenException({ message: result.message, log, feishu: result.raw });
    return { ok: true, message: "飞书测试消息发送成功", log };
  }

  // ---- Acceptance ----
  async acceptance(user: any, projectId: string) {
    if (user.role !== "SUPER_ADMIN") {
      const member = await this.prisma.projectMember.findUnique({ where: { projectId_userId: { projectId, userId: user.id } } });
      if (!member) throw new NotFoundException("项目不存在或无权限");
    }
    const items = await this.prisma.acceptanceItem.findMany({ where: { projectId } });
    const reports = await this.prisma.acceptanceReport.findMany({ where: { projectId } });
    return { items, reports };
  }
  async startAcceptance(user: any, projectId: string) { this.requireAdmin(user); await this.prisma.project.update({ where: { id: projectId }, data: { acceptanceStatus: "in_review" } }); await this.events.record({ type: "acceptance.started", actor: user, projectId, message: "发起项目验收", color: "amber" }); return { project: { id: projectId, acceptanceStatus: "in_review" } }; }
  async approveAcceptance(user: any, projectId: string) { this.requireAdmin(user); await this.prisma.project.update({ where: { id: projectId }, data: { acceptanceStatus: "approved" } }); await this.events.record({ type: "acceptance.approved", actor: user, projectId, message: "验收通过", color: "green" }); return { project: { id: projectId, acceptanceStatus: "approved" } }; }
  async createAcceptanceReport(user: any, projectId: string, body: any) {
    this.requireAdmin(user);
    const [project, progressItems, submissions, items] = await Promise.all([
      this.prisma.project.findUnique({ where: { id: projectId } }),
      this.prisma.taskProgress.findMany({ where: { projectId } }),
      this.prisma.taskSubmission.findMany({ where: { projectId, deleted: false } }),
      this.prisma.acceptanceItem.findMany({ where: { projectId } }),
    ]);
    if (!project) throw new NotFoundException("项目不存在");
    const data = {
      project: { id: project.id, name: project.name, acceptanceStatus: project.acceptanceStatus },
      totals: {
        progressItems: progressItems.length,
        completed: progressItems.filter((item) => item.status === "COMPLETED").length,
        delayed: progressItems.filter((item) => item.status === "DELAYED").length,
        blocked: progressItems.filter((item) => item.status === "BLOCKED").length,
        abandoned: progressItems.filter((item) => item.status === "ABANDONED").length,
        submissions: submissions.length,
        acceptanceItems: items.length,
        passedItems: items.filter((item) => item.status === "PASSED").length,
      },
      members: progressItems.reduce((map: Record<string, any>, item) => {
        const current = map[item.userId] || { userId: item.userId, total: 0, completed: 0, delayed: 0, blocked: 0, abandoned: 0, deltaDays: 0, submissions: 0 };
        current.total += 1;
        if (item.status === "COMPLETED") current.completed += 1;
        if (item.status === "DELAYED") current.delayed += 1;
        if (item.status === "BLOCKED") current.blocked += 1;
        if (item.status === "ABANDONED") current.abandoned += 1;
        current.deltaDays += item.deltaDays || 0;
        map[item.userId] = current;
        return map;
      }, {}),
    };
    for (const submission of submissions) {
      const member = (data.members as Record<string, any>)[submission.userId];
      if (member) member.submissions += 1;
    }
    const report = await this.prisma.acceptanceReport.create({
      data: { id: genId("ar"), projectId, generatedBy: user.id, note: body.note || "", data },
    });
    await this.events.record({ type: "acceptance.report_created", actor: user, projectId, message: "生成验收统计报告", color: "blue", metadata: { reportId: report.id } });
    return { report };
  }
  async createAcceptanceItem(user: any, projectId: string, body: any) { this.requireAdmin(user); const item = await this.prisma.acceptanceItem.create({ data: { id: genId("ai"), projectId, title: body.title, status: "PENDING", note: body.note || "" } }); await this.events.record({ type: "acceptance.item.created", actor: user, projectId, message: "创建验收项", color: "blue", metadata: { itemId: item.id } }); return { item }; }
  async updateAcceptanceItem(user: any, itemId: string, body: any) { this.requireAdmin(user); const item = await this.prisma.acceptanceItem.update({ where: { id: itemId }, data: body }); await this.events.record({ type: "acceptance.item.updated", actor: user, projectId: item.projectId, message: "更新验收项", color: "amber", metadata: { itemId } }); return { item }; }
  async deleteAcceptanceItem(user: any, itemId: string) { this.requireAdmin(user); const item = await this.prisma.acceptanceItem.delete({ where: { id: itemId } }); await this.events.record({ type: "acceptance.item.deleted", actor: user, projectId: item.projectId, message: "删除验收项", color: "rose", metadata: { itemId } }); return { ok: true }; }

  // ---- Search helper ----
  async search(user: any, q: string) {
    const query = String(q || "").trim();
    if (query.length < 2) return { projects: [], tasks: [], files: [], users: [] };
    const projectIds = await this.visibleProjectIds(user);
    const projectWhere: any = { id: { in: projectIds }, status: { not: "DELETED" }, OR: [{ name: { contains: query } }, { description: { contains: query } }] };
    const [projects, tasks, files, users] = await Promise.all([
      this.prisma.project.findMany({ where: projectWhere, take: 10 }),
      this.prisma.task.findMany({ where: { projectId: { in: projectIds }, status: { notIn: ["DELETED", "ARCHIVED"] as any }, title: { contains: query } }, take: 10 }),
      this.prisma.projectFile.findMany({ where: { projectId: { in: projectIds }, name: { contains: query }, deleted: false }, take: 10 }),
      user.role === "SUPER_ADMIN"
        ? this.prisma.user.findMany({ where: { OR: [{ name: { contains: query } }, { username: { contains: query } }] }, take: 10 })
        : this.prisma.user.findMany({
          where: {
            memberships: { some: { projectId: { in: projectIds } } },
            OR: [{ name: { contains: query } }, { username: { contains: query } }],
          },
          take: 10,
        }),
    ]);
    return { projects, tasks, files, users: users.map((u) => ({ id: u.id, username: u.username, name: u.name, avatar: u.avatar || "" })) };
  }
}
