import { Injectable, ForbiddenException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import { genId, today } from "../../common/utils/index.js";
import { decryptSecret } from "../../common/utils/index.js";
import { Prisma } from "@prisma/client";
import { EventService } from "../../common/events/event.service.js";
import { RedisService } from "../../redis/redis.service.js";
import { FeishuBotService } from "../admin/feishu-bot.service.js";

@Injectable()
export class ProjectService {
  constructor(private prisma: PrismaService, private events: EventService, private redis: RedisService, private feishu: FeishuBotService) {}

  private memberKey(userId: string, projectId: string) {
    return `access:member:${userId}:${projectId}`;
  }

  private manageKey(userId: string, projectId: string) {
    return `access:manage:${userId}:${projectId}`;
  }

  private async invalidateProjectAccess(projectId: string, userId?: string) {
    await Promise.all([
      this.redis.delPattern("access:visible-projects:*"),
      this.redis.delPattern(`access:edit:*:${projectId}`),
      this.redis.delPattern(`access:scope:*:${projectId}:*`),
      userId ? this.redis.del(this.memberKey(userId, projectId)) : this.redis.delPattern(`access:member:*:${projectId}`),
      userId ? this.redis.del(this.manageKey(userId, projectId)) : this.redis.delPattern(`access:manage:*:${projectId}`),
    ]);
  }

  private visibleProjectsWhere(user: any): any {
    const base: any = { status: { not: "DELETED" } };
    if (user.role !== "SUPER_ADMIN") base.members = { some: { userId: user.id } };
    return base as Prisma.ProjectWhereInput;
  }

  async memberOf(user: any, projectId: string) {
    if (user.role === "SUPER_ADMIN") return true;
    const cacheKey = this.memberKey(user.id, projectId);
    const cached = await this.redis.getJson<boolean | { role?: string }>(cacheKey);
    if (typeof cached === "boolean") return cached;
    if (cached && typeof cached === "object") return true;
    const m = await this.prisma.projectMember.findUnique({ where: { projectId_userId: { projectId, userId: user.id } } });
    const isMember = !!m;
    await this.redis.setJson(cacheKey, isMember, 60);
    return isMember;
  }

  async requireProject(user: any, id: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project || project.status === "DELETED") throw new NotFoundException("项目不存在");
    if (!(await this.memberOf(user, id))) throw new NotFoundException("项目不存在或无权限");
    return project;
  }

  async canManage(user: any, projectId: string) {
    if (user.role === "SUPER_ADMIN") return true;
    const cacheKey = this.manageKey(user.id, projectId);
    const cached = await this.redis.getJson<boolean>(cacheKey);
    if (typeof cached === "boolean") return cached;
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (project?.ownerId === user.id) {
      await this.redis.setJson(cacheKey, true, 60);
      return true;
    }
    const member = await this.prisma.projectMember.findUnique({ where: { projectId_userId: { projectId, userId: user.id } } });
    const canManage = member?.role === "owner" || member?.role === "admin";
    await this.redis.setJson(cacheKey, !!canManage, 60);
    return canManage;
  }

  // ---- Projects ----
  async listProjects(user: any, filter?: string, group?: string) {
    const where: any = this.visibleProjectsWhere(user);
    if (group) where.group = group;
    else if (filter === "mine") where.ownerId = user.id;
    else if (filter === "risk") where.risk = { not: "low" };
    else if (filter === "pending_acceptance") where.acceptanceStatus = { in: ["pending", "in_review"] };
    else if (filter === "archived") where.status = "ARCHIVED";
    else where.status = "ACTIVE";

    const projects = await this.prisma.project.findMany({
      where: where as any,
      include: { members: true, tasks: { where: { status: { notIn: ["DELETED", "ARCHIVED"] as any } } } },
      orderBy: { updatedAt: "desc" },
    });

    return {
      projects: projects.map((p) => ({
        id: p.id, name: p.name, group: p.group, ownerId: p.ownerId, status: p.status,
        progress: p.tasks.length ? Math.round(p.tasks.filter((t) => t.status === "DONE").length / p.tasks.length * 100) : 0,
        risk: p.risk, currentEnd: p.currentEnd.toISOString().slice(0, 10), description: p.description,
        acceptanceStatus: p.acceptanceStatus,
        memberCount: p.members.length, taskCount: p.tasks.length,
        completedTaskCount: p.tasks.filter((t) => t.status === "DONE").length,
      })),
    };
  }

  async projectDetail(user: any, id: string) {
    const project = await this.requireProject(user, id);
    const [members, tasks, files, timeline] = await Promise.all([
      this.prisma.projectMember.findMany({ where: { projectId: id }, include: { user: { select: { id: true, username: true, name: true, role: true, avatar: true } } } }),
      this.prisma.task.findMany({
        where: { projectId: id, status: { notIn: ["DELETED", "ARCHIVED"] as any } },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
      }),
      this.prisma.projectFile.count({ where: { projectId: id, deleted: false } }),
      this.prisma.timelineEvent.findMany({ where: { projectId: id }, orderBy: { createdAt: "desc" }, take: 30 }),
    ]);

    const completedTasks = tasks.filter((t) => t.status === "DONE").length;
    const progress = tasks.length ? Math.round(completedTasks / tasks.length * 100) : 0;

    return {
      project: { ...project, progress, currentEnd: project.currentEnd.toISOString().slice(0, 10), baselineEnd: project.baselineEnd.toISOString().slice(0, 10), start: project.start.toISOString().slice(0, 10) },
      members,
      stats: { tasks: tasks.length, completedTasks, progressPercent: progress, files, acceptance: 0 },
      timeline: timeline.map((t) => ({ ...t, createdAt: t.createdAt.toISOString() })),
    };
  }

  async createProject(user: any, body: any) {
    const project = await this.prisma.project.create({
      data: {
        id: genId("p"),
        name: body.name || "新项目",
        group: body.group || "默认分组",
        ownerId: user.id,
        start: new Date(body.start || today() + "T00:00:00Z"),
        baselineEnd: new Date(body.baselineEnd || today() + "T00:00:00Z"),
        currentEnd: new Date(body.currentEnd || body.baselineEnd || today() + "T00:00:00Z"),
        description: body.description || "",
      },
    });

    await this.prisma.projectMember.create({ data: { id: genId("pm"), projectId: project.id, userId: user.id, role: "owner" } });
    await this.invalidateProjectAccess(project.id, user.id);
    await this.events.record({ type: "project.created", actor: user, projectId: project.id, message: `创建项目：${project.name}`, color: "blue", metadata: { projectId: project.id } });

    return { project: { ...project, currentEnd: project.currentEnd.toISOString().slice(0, 10), baselineEnd: project.baselineEnd.toISOString().slice(0, 10), start: project.start.toISOString().slice(0, 10) } };
  }

  async updateProject(user: any, id: string, body: any) {
    await this.requireProject(user, id);
    if (!(await this.canManage(user, id))) throw new ForbiddenException("无项目管理权限");
    const project = await this.prisma.project.update({ where: { id }, data: body });
    await this.invalidateProjectAccess(id);
    await this.events.record({ type: "project.updated", actor: user, projectId: id, message: `更新项目：${project.name}`, color: "amber", metadata: { fields: Object.keys(body || {}) } });
    return { project: { ...project, currentEnd: project.currentEnd.toISOString().slice(0, 10), baselineEnd: project.baselineEnd.toISOString().slice(0, 10), start: project.start.toISOString().slice(0, 10) } };
  }

  async archiveProject(user: any, id: string) {
    await this.requireProject(user, id);
    if (!(await this.canManage(user, id))) throw new ForbiddenException("无项目归档权限");
    await this.prisma.project.update({ where: { id }, data: { status: "ARCHIVED" } });
    await this.invalidateProjectAccess(id);
    await this.events.record({ type: "project.archived", actor: user, projectId: id, message: "归档项目", color: "amber" });
    return { project: { id, status: "ARCHIVED" } };
  }

  async restoreProject(user: any, id: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException("项目不存在");
    if (!(await this.canManage(user, id))) throw new ForbiddenException("无项目恢复权限");
    await this.prisma.project.update({ where: { id }, data: { status: "ACTIVE" } });
    await this.invalidateProjectAccess(id);
    await this.events.record({ type: "project.restored", actor: user, projectId: id, message: "恢复项目", color: "green" });
    return { project: { id, status: "ACTIVE" } };
  }

  async deleteProject(user: any, id: string) {
    await this.requireProject(user, id);
    if (!(await this.canManage(user, id))) throw new ForbiddenException("无项目删除权限");
    await this.prisma.project.update({ where: { id }, data: { status: "DELETED" as any } });
    await this.invalidateProjectAccess(id);
    await this.events.record({ type: "project.deleted", actor: user, projectId: id, message: "删除项目", color: "rose" });
    return { ok: true };
  }

  // ---- Members ----
  async membersOf(user: any, projectId: string) {
    await this.requireProject(user, projectId);
    const members = await this.prisma.projectMember.findMany({
      where: { projectId },
      include: { user: { select: { id: true, username: true, name: true, role: true, avatar: true, signature: true } } },
    });
    return { members };
  }

  async invite(user: any, projectId: string, body: any) {
    const project = await this.requireProject(user, projectId);
    if (!(await this.canManage(user, projectId))) throw new ForbiddenException("无邀请权限");
    const target = await this.prisma.user.findFirst({ where: { OR: [{ id: body.userId }, { username: body.username }] } });
    if (!target) throw new NotFoundException("用户不存在");

    const existing = await this.prisma.projectMember.findUnique({ where: { projectId_userId: { projectId, userId: target.id } } });
    if (existing) {
      await this.prisma.projectMember.update({ where: { id: existing.id }, data: { role: body.role || existing.role } });
      await this.invalidateProjectAccess(projectId, target.id);
      await this.events.record({ type: "project.member.updated", actor: user, projectId, message: `更新成员角色：${target.name}`, color: "amber", metadata: { targetUserId: target.id, role: body.role || existing.role } });
      return { member: { ...existing, role: body.role || existing.role } };
    }

    const member = await this.prisma.projectMember.create({ data: { id: genId("pm"), projectId, userId: target.id, role: body.role || "editor" } });
    await this.invalidateProjectAccess(projectId, target.id);
    await this.events.record({ type: "project.member.added", actor: user, projectId, message: `邀请成员：${target.name}`, color: "blue", metadata: { targetUserId: target.id, role: member.role } });
    this.sendProjectInviteNotification(project, target, user, member.role).catch(() => undefined);
    return { member };
  }

  private async sendProjectInviteNotification(project: any, target: any, actor: any, role: string) {
    const [channel, key] = await Promise.all([
      this.prisma.notificationChannel.findUnique({ where: { id: "nc_feishu" } }),
      this.prisma.notificationKey.findFirst({ where: { channelId: "nc_feishu", type: "feishu_app", enabled: true }, orderBy: { createdAt: "desc" } }),
    ]);
    const config = channel?.config as any;
    const appId = String(config?.appId || "");
    const contact = String(config?.creatorContact || "");
    const contactType = String(config?.contactType || (contact.includes("@") ? "email" : "mobile"));
    if (!channel || !key || !appId || !contact) return;
    const card = {
      config: { wide_screen_mode: true },
      header: { template: "green", title: { tag: "plain_text", content: `邀请加入项目｜${project.name}` } },
      elements: [
        { tag: "div", text: { tag: "lark_md", content: `**${actor.name || actor.username}** 邀请 **${target.name || target.username}** 加入项目。` } },
        {
          tag: "div",
          fields: [
            { is_short: true, text: { tag: "lark_md", content: `**项目**\n${project.name}` } },
            { is_short: true, text: { tag: "lark_md", content: `**角色**\n${role}` } },
            { is_short: true, text: { tag: "lark_md", content: `**分组**\n${project.group}` } },
            { is_short: true, text: { tag: "lark_md", content: `**当前截止**\n${project.currentEnd.toISOString().slice(0, 10)}` } },
          ],
        },
        {
          tag: "action",
          actions: [
            { tag: "button", text: { tag: "plain_text", content: "确认收到" }, type: "primary", value: { action: "ack_project_invite", projectId: project.id, userId: target.id } },
            { tag: "button", text: { tag: "plain_text", content: "稍后查看" }, type: "default", value: { action: "snooze_project_invite", projectId: project.id, userId: target.id } },
          ],
        },
        { tag: "note", elements: [{ tag: "plain_text", content: "邀请已写入 LightTask 项目成员列表。" }] },
      ],
    };
    const result = await this.feishu.sendAppInteractiveToContact(appId, decryptSecret(key.secretEncrypted), contact, contactType, card);
    await this.prisma.notificationLog.create({
      data: {
        id: genId("nl"),
        event: "project.invite",
        projectId: project.id,
        channel: "feishu",
        targetMode: "creator",
        targets: JSON.stringify([{ type: contactType, value: contact, openId: (result as any).resolvedOpenId || "" }]),
        status: result.ok ? "success" : "failed",
        message: result.ok ? `项目邀请已发送：${project.name}` : `项目邀请发送失败：${result.message}`,
      },
    });
  }

  async updateMember(user: any, projectId: string, memberId: string, body: any) {
    if (!(await this.canManage(user, projectId))) throw new ForbiddenException("无成员管理权限");
    const member = await this.prisma.projectMember.update({ where: { id: memberId }, data: { role: body.role } });
    await this.invalidateProjectAccess(projectId, member.userId);
    await this.events.record({ type: "project.member.updated", actor: user, projectId, message: "更新成员权限", color: "amber", metadata: { memberId, role: body.role } });
    return { member };
  }

  async removeMember(user: any, projectId: string, memberId: string) {
    if (!(await this.canManage(user, projectId))) throw new ForbiddenException("无成员管理权限");
    const member = await this.prisma.projectMember.delete({ where: { id: memberId } });
    await this.invalidateProjectAccess(projectId, member.userId);
    await this.events.record({ type: "project.member.removed", actor: user, projectId, message: "移除项目成员", color: "rose", metadata: { memberId } });
    return { ok: true };
  }

  // ---- Project groups ----
  async projectGroups(user: any) {
    const projects = await this.prisma.project.findMany({ where: this.visibleProjectsWhere(user), select: { group: true } });
    const map = new Map<string, number>();
    for (const p of projects) map.set(p.group, (map.get(p.group) || 0) + 1);
    return { groups: Array.from(map.entries()).map(([name, count]) => ({ name, count })) };
  }
}
