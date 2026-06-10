var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Injectable, ForbiddenException, NotFoundException } from "@nestjs/common";
import { readFileSync, existsSync } from "node:fs";
import { cpus, freemem, totalmem, uptime, loadavg } from "node:os";
import { join } from "node:path";
import bcrypt from "bcryptjs";
import { PrismaService } from "../../prisma/prisma.service.js";
import { genId, maskSecret, encryptSecret } from "../../common/utils/index.js";
import { EventService } from "../../common/events/event.service.js";
const DATA_FILE = join(process.cwd(), "data", "state.json");
let AdminService = class AdminService {
    prisma;
    events;
    constructor(prisma, events) {
        this.prisma = prisma;
        this.events = events;
    }
    requireAdmin(user) { if (user.role !== "SUPER_ADMIN")
        throw new ForbiddenException("需要管理员权限"); }
    async visibleProjectIds(user) {
        if (user.role === "SUPER_ADMIN") {
            const projects = await this.prisma.project.findMany({ where: { status: { not: "DELETED" } }, select: { id: true } });
            return projects.map((p) => p.id);
        }
        const members = await this.prisma.projectMember.findMany({ where: { userId: user.id }, select: { projectId: true } });
        return members.map((m) => m.projectId);
    }
    // ---- Health ----
    health(user) {
        this.requireAdmin(user);
        const cpuCores = cpus();
        const load = loadavg();
        const cpuUsage = Math.round((load[0] / cpuCores.length) * 100);
        const totalMem = totalmem();
        const freeMem = freemem();
        const usedMem = totalMem - freeMem;
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
    async adminUsers(user) { this.requireAdmin(user); const users = await this.prisma.user.findMany(); return { users: users.map(u => ({ id: u.id, username: u.username, name: u.name, role: u.role, enabled: u.enabled, avatar: u.avatar || "", signature: u.signature || "", theme: u.theme || "letter" })) }; }
    async createUser(user, body) {
        this.requireAdmin(user);
        const created = await this.prisma.user.create({ data: { id: genId("u"), username: body.username, passwordHash: bcrypt.hashSync(body.password || "123456", 10), name: body.name || body.username, role: body.role === "SUPER_ADMIN" ? "SUPER_ADMIN" : "MEMBER", enabled: body.enabled !== false, avatar: body.avatar || body.username?.[0] || "U" } });
        await this.events.record({ type: "admin.user.created", actor: user, message: `创建用户：${created.username}`, metadata: { userId: created.id, role: created.role }, timeline: false });
        return { user: { id: created.id, username: created.username, name: created.name, role: created.role, enabled: created.enabled } };
    }
    async updateUser(user, userId, body) {
        this.requireAdmin(user);
        const data = {};
        for (const key of ["name", "enabled", "avatar", "signature", "theme", "cardBackground", "themeConfig"]) {
            if (body[key] !== undefined)
                data[key] = body[key];
        }
        const updated = await this.prisma.user.update({ where: { id: userId }, data });
        await this.events.record({ type: "admin.user.updated", actor: user, message: `更新用户：${updated.username}`, metadata: { userId, fields: Object.keys(data) }, timeline: false });
        return { user: updated };
    }
    async resetUserPassword(user, userId, body) { this.requireAdmin(user); await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: bcrypt.hashSync(body.password || "123456", 10) } }); await this.events.record({ type: "admin.user.password_reset", actor: user, message: "重置用户密码", metadata: { userId }, timeline: false }); return { ok: true }; }
    async userSessions(user, userId) { this.requireAdmin(user); const sessions = await this.prisma.session.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }); return { sessions }; }
    async revokeSession(user, sessionId) { this.requireAdmin(user); await this.prisma.session.update({ where: { id: sessionId }, data: { revoked: true, revokedReason: "admin_revoked" } }); await this.events.record({ type: "admin.session.revoked", actor: user, message: "吊销登录会话", metadata: { sessionId }, timeline: false }); return { ok: true }; }
    async changeUserRole(user, userId, body) {
        this.requireAdmin(user);
        if (body.role !== "SUPER_ADMIN") {
            const admins = await this.prisma.user.count({ where: { role: "SUPER_ADMIN", enabled: true } });
            if (admins <= 1) {
                const target = await this.prisma.user.findUnique({ where: { id: userId } });
                if (target?.role === "SUPER_ADMIN")
                    throw new ForbiddenException("不能移除最后一个超级管理员");
            }
        }
        const updated = await this.prisma.user.update({ where: { id: userId }, data: { role: body.role } });
        await this.events.record({ type: "admin.user.role_changed", actor: user, message: `调整用户角色：${updated.username}`, metadata: { userId, role: body.role }, timeline: false });
        return { user: updated };
    }
    async userProjects(user, userId) { this.requireAdmin(user); const members = await this.prisma.projectMember.findMany({ where: { userId }, include: { project: true } }); return { members }; }
    async assignProject(user, userId, body) { this.requireAdmin(user); const m = await this.prisma.projectMember.create({ data: { id: genId("pm"), projectId: body.projectId, userId, role: body.role || "editor" } }); await this.events.record({ type: "admin.project.assigned", actor: user, projectId: body.projectId, message: "分配用户到项目", metadata: { userId, role: m.role } }); return { member: m }; }
    async removeProject(user, userId, projectId) { this.requireAdmin(user); await this.prisma.projectMember.deleteMany({ where: { userId, projectId } }); await this.events.record({ type: "admin.project.unassigned", actor: user, projectId, message: "移除用户项目权限", metadata: { userId } }); return { ok: true }; }
    // ---- IP Whitelist ----
    async listIpEntries(user, userId) { this.requireAdmin(user); const where = {}; if (userId)
        where.userId = userId; const entries = await this.prisma.userIpWhitelistEntry.findMany({ where }); return { entries }; }
    async addIpEntry(user, body) { this.requireAdmin(user); const entry = await this.prisma.userIpWhitelistEntry.create({ data: { id: genId("ip"), userId: body.userId, value: body.value, note: body.note || "", enabled: true, createdBy: user.id } }); await this.events.record({ type: "admin.ip_whitelist.added", actor: user, message: "新增 IP 白名单", metadata: { userId: body.userId, value: body.value }, timeline: false }); return { entry }; }
    async removeIpEntry(user, entryId) { this.requireAdmin(user); await this.prisma.userIpWhitelistEntry.delete({ where: { id: entryId } }); await this.events.record({ type: "admin.ip_whitelist.removed", actor: user, message: "删除 IP 白名单", metadata: { entryId }, timeline: false }); return { ok: true }; }
    async toggleIpPolicy(user, body) { this.requireAdmin(user); const policy = await this.prisma.userIpPolicy.upsert({ where: { userId: body.userId }, update: { enabled: body.enabled }, create: { id: genId("ipp"), userId: body.userId, enabled: body.enabled } }); await this.events.record({ type: "admin.ip_policy.updated", actor: user, message: `${body.enabled ? "开启" : "关闭"}用户 IP 白名单`, metadata: { userId: body.userId, enabled: body.enabled }, timeline: false }); return { policy }; }
    // ---- Permissions ----
    async roles(user) { this.requireAdmin(user); const [roles, scopes] = await Promise.all([this.prisma.roleTemplate.findMany(), this.prisma.permissionScope.findMany()]); const matrix = roles.map(r => ({ roleId: r.id, roleName: r.name, role: r.role, builtin: r.builtin, scopes: scopes.map(s => ({ key: s.key, name: s.name, granted: r.permissions.includes(s.key) })) })); return { roles, scopes, matrix }; }
    async createRole(user, body) { this.requireAdmin(user); const role = await this.prisma.roleTemplate.create({ data: { id: genId("rt"), name: body.name, role: body.role || "custom", builtin: false, permissions: body.permissions || [] } }); await this.events.record({ type: "admin.role.created", actor: user, message: `创建角色模板：${role.name}`, metadata: { roleId: role.id }, timeline: false }); return { role }; }
    async copyRoleTemplate(user, roleId) { this.requireAdmin(user); const src = await this.prisma.roleTemplate.findUnique({ where: { id: roleId } }); if (!src)
        throw new NotFoundException("角色模板不存在"); const copy = await this.prisma.roleTemplate.create({ data: { id: genId("rt"), name: `${src.name} (副本)`, role: src.role, builtin: false, permissions: src.permissions } }); return { role: copy }; }
    async deleteRoleTemplate(user, roleId) { this.requireAdmin(user); const role = await this.prisma.roleTemplate.findUnique({ where: { id: roleId } }); if (!role)
        throw new NotFoundException("角色模板不存在"); if (role.builtin)
        throw new ForbiddenException("内置角色不可删除"); await this.prisma.roleTemplate.delete({ where: { id: roleId } }); return { ok: true }; }
    async updateRolePermissions(user, roleId, body) { this.requireAdmin(user); const role = await this.prisma.roleTemplate.update({ where: { id: roleId }, data: { permissions: body.permissions, ...(body.name ? { name: body.name } : {}) } }); await this.events.record({ type: "admin.role.updated", actor: user, message: `更新角色权限：${role.name}`, metadata: { roleId, permissionCount: role.permissions.length }, timeline: false }); return { role }; }
    async createScope(user, body) { this.requireAdmin(user); const scope = await this.prisma.permissionScope.create({ data: { id: genId("ps"), key: body.key, name: body.name, target: body.target || "project", enabled: body.enabled !== false } }); return { scope }; }
    async updateScope(user, scopeId, body) { this.requireAdmin(user); const scope = await this.prisma.permissionScope.update({ where: { id: scopeId }, data: body }); return { scope }; }
    async deleteScope(user, scopeId) { this.requireAdmin(user); await this.prisma.permissionScope.delete({ where: { id: scopeId } }); return { ok: true }; }
    async permissionMatrix(user) { this.requireAdmin(user); return this.roles(user); }
    // ---- Audit ----
    async auditLogs(user, query = {}) { this.requireAdmin(user); const where = {}; if (query.type)
        where.type = query.type; if (query.actorId)
        where.actorId = query.actorId; const [logs, total] = await Promise.all([this.prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, take: Math.min(100, Number(query.pageSize || 50)), skip: (Math.max(1, Number(query.page || 1)) - 1) * Number(query.pageSize || 50) }), this.prisma.auditLog.count({ where })]); return { logs, total, page: Number(query.page || 1), pageSize: Number(query.pageSize || 50) }; }
    // ---- Notifications ----
    async notif(user) { this.requireAdmin(user); const [rules, logs, channels, keys] = await Promise.all([this.prisma.notificationRule.findMany(), this.prisma.notificationLog.findMany({ take: 500, orderBy: { createdAt: "desc" } }), this.prisma.notificationChannel.findMany(), this.prisma.notificationKey.findMany()]); return { rules, logs, channels, keys: keys.map(k => ({ id: k.id, name: k.name, channelId: k.channelId, type: k.type, enabled: k.enabled, secretMasked: k.secretMasked })) }; }
    async createRule(user, body) { this.requireAdmin(user); const rule = await this.prisma.notificationRule.create({ data: { id: genId("nr"), event: body.event, channel: body.channel || "feishu", targetMode: body.targetMode || "creator", targets: body.targets || [], enabled: body.enabled !== false } }); return { rule }; }
    async updateRule(user, ruleId, body) { this.requireAdmin(user); const rule = await this.prisma.notificationRule.update({ where: { id: ruleId }, data: body }); return { rule }; }
    async deleteRule(user, ruleId) { this.requireAdmin(user); await this.prisma.notificationRule.delete({ where: { id: ruleId } }); return { ok: true }; }
    async toggleRule(user, ruleId) { this.requireAdmin(user); const r = await this.prisma.notificationRule.findUnique({ where: { id: ruleId } }); if (!r)
        throw new NotFoundException(); const rule = await this.prisma.notificationRule.update({ where: { id: ruleId }, data: { enabled: !r.enabled } }); return { rule }; }
    async createChannel(user, body) { this.requireAdmin(user); const channel = await this.prisma.notificationChannel.create({ data: { id: genId("nc"), name: body.name, type: body.type, enabled: body.enabled !== false, config: body.config || {} } }); return { channel }; }
    async updateChannel(user, channelId, body) { this.requireAdmin(user); const channel = await this.prisma.notificationChannel.update({ where: { id: channelId }, data: body }); return { channel }; }
    async deleteChannel(user, channelId) { this.requireAdmin(user); await this.prisma.notificationChannel.delete({ where: { id: channelId } }); return { ok: true }; }
    async createKey(user, body) { this.requireAdmin(user); const secret = String(body.secret || ""); if (!secret)
        throw new ForbiddenException("通知 Key 不能为空"); const key = await this.prisma.notificationKey.create({ data: { id: genId("nk"), name: body.name || "未命名密钥", channelId: body.channelId || "", type: body.type || "webhook", secretEncrypted: encryptSecret(secret), secretMasked: maskSecret(secret), enabled: body.enabled !== false } }); return { key: { id: key.id, name: key.name, channelId: key.channelId, type: key.type, enabled: key.enabled, secretMasked: key.secretMasked } }; }
    async updateKey(user, keyId, body) {
        this.requireAdmin(user);
        const data = { ...body };
        if (body.secret !== undefined) {
            const secret = String(body.secret || "");
            if (!secret)
                throw new ForbiddenException("通知 Key 不能为空");
            data.secretEncrypted = encryptSecret(secret);
            data.secretMasked = maskSecret(secret);
            delete data.secret;
        }
        const key = await this.prisma.notificationKey.update({ where: { id: keyId }, data });
        await this.events.record({ type: "admin.notification_key.updated", actor: user, message: `更新通知 Key：${key.name}`, metadata: { keyId }, timeline: false });
        return { key: { id: key.id, name: key.name, channelId: key.channelId, type: key.type, enabled: key.enabled, secretMasked: key.secretMasked } };
    }
    async deleteKey(user, keyId) { this.requireAdmin(user); await this.prisma.notificationKey.delete({ where: { id: keyId } }); return { ok: true }; }
    async retry(user, logId) { this.requireAdmin(user); const log = await this.prisma.notificationLog.findUnique({ where: { id: logId } }); if (!log)
        throw new NotFoundException("通知日志不存在"); const updated = await this.prisma.notificationLog.update({ where: { id: logId }, data: { status: "queued", retryCount: (log.retryCount || 0) + 1 } }); return { log: updated }; }
    async testNotification(user, body) { this.requireAdmin(user); return { ok: true, message: "测试发送已排队" }; }
    // ---- Acceptance ----
    async acceptance(user, projectId) {
        if (user.role !== "SUPER_ADMIN") {
            const member = await this.prisma.projectMember.findUnique({ where: { projectId_userId: { projectId, userId: user.id } } });
            if (!member)
                throw new NotFoundException("项目不存在或无权限");
        }
        const items = await this.prisma.acceptanceItem.findMany({ where: { projectId } });
        const reports = await this.prisma.acceptanceReport.findMany({ where: { projectId } });
        return { items, reports };
    }
    async startAcceptance(user, projectId) { this.requireAdmin(user); await this.prisma.project.update({ where: { id: projectId }, data: { acceptanceStatus: "in_review" } }); await this.events.record({ type: "acceptance.started", actor: user, projectId, message: "发起项目验收", color: "amber" }); return { project: { id: projectId, acceptanceStatus: "in_review" } }; }
    async approveAcceptance(user, projectId) { this.requireAdmin(user); await this.prisma.project.update({ where: { id: projectId }, data: { acceptanceStatus: "approved" } }); await this.events.record({ type: "acceptance.approved", actor: user, projectId, message: "验收通过", color: "green" }); return { project: { id: projectId, acceptanceStatus: "approved" } }; }
    async createAcceptanceReport(user, projectId, body) {
        this.requireAdmin(user);
        const [project, progressItems, submissions, items] = await Promise.all([
            this.prisma.project.findUnique({ where: { id: projectId } }),
            this.prisma.taskProgress.findMany({ where: { projectId } }),
            this.prisma.taskSubmission.findMany({ where: { projectId, deleted: false } }),
            this.prisma.acceptanceItem.findMany({ where: { projectId } }),
        ]);
        if (!project)
            throw new NotFoundException("项目不存在");
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
            members: progressItems.reduce((map, item) => {
                const current = map[item.userId] || { userId: item.userId, total: 0, completed: 0, delayed: 0, blocked: 0, abandoned: 0, deltaDays: 0, submissions: 0 };
                current.total += 1;
                if (item.status === "COMPLETED")
                    current.completed += 1;
                if (item.status === "DELAYED")
                    current.delayed += 1;
                if (item.status === "BLOCKED")
                    current.blocked += 1;
                if (item.status === "ABANDONED")
                    current.abandoned += 1;
                current.deltaDays += item.deltaDays || 0;
                map[item.userId] = current;
                return map;
            }, {}),
        };
        for (const submission of submissions) {
            const member = data.members[submission.userId];
            if (member)
                member.submissions += 1;
        }
        const report = await this.prisma.acceptanceReport.create({
            data: { id: genId("ar"), projectId, generatedBy: user.id, note: body.note || "", data },
        });
        await this.events.record({ type: "acceptance.report_created", actor: user, projectId, message: "生成验收统计报告", color: "blue", metadata: { reportId: report.id } });
        return { report };
    }
    async createAcceptanceItem(user, projectId, body) { this.requireAdmin(user); const item = await this.prisma.acceptanceItem.create({ data: { id: genId("ai"), projectId, title: body.title, status: "PENDING", note: body.note || "" } }); return { item }; }
    async updateAcceptanceItem(user, itemId, body) { this.requireAdmin(user); const item = await this.prisma.acceptanceItem.update({ where: { id: itemId }, data: body }); return { item }; }
    async deleteAcceptanceItem(user, itemId) { this.requireAdmin(user); await this.prisma.acceptanceItem.delete({ where: { id: itemId } }); return { ok: true }; }
    // ---- Search helper ----
    async search(user, q) {
        const query = String(q || "").trim();
        if (query.length < 2)
            return { projects: [], tasks: [], files: [], users: [] };
        const projectIds = await this.visibleProjectIds(user);
        const projectWhere = { id: { in: projectIds }, status: { not: "DELETED" }, OR: [{ name: { contains: query } }, { description: { contains: query } }] };
        const [projects, tasks, files, users] = await Promise.all([
            this.prisma.project.findMany({ where: projectWhere, take: 10 }),
            this.prisma.task.findMany({ where: { projectId: { in: projectIds }, status: { notIn: ["DELETED", "ARCHIVED"] }, title: { contains: query } }, take: 10 }),
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
};
AdminService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaService, EventService])
], AdminService);
export { AdminService };
//# sourceMappingURL=admin.service.js.map