import { Injectable, ForbiddenException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import { genId, today, deltaDays } from "../../common/utils/index.js";
import { EventService } from "../../common/events/event.service.js";
import { RedisService } from "../../redis/redis.service.js";

@Injectable()
export class TaskService {
  constructor(private prisma: PrismaService, private events: EventService, private redis: RedisService) {}

  private memberKey(userId: string, projectId: string) {
    return `access:member:${userId}:${projectId}`;
  }

  private editKey(userId: string, projectId: string) {
    return `access:edit:${userId}:${projectId}`;
  }

  async checkAccess(user: any, projectId: string) {
    if (user.role === "SUPER_ADMIN") return;
    const cacheKey = this.memberKey(user.id, projectId);
    const cached = await this.redis.getJson<any>(cacheKey);
    if (cached && typeof cached === "object") return cached;
    const m = await this.prisma.projectMember.findUnique({ where: { projectId_userId: { projectId, userId: user.id } } });
    if (!m) throw new NotFoundException("项目不存在或无权限");
    await this.redis.setJson(cacheKey, { id: m.id, projectId: m.projectId, userId: m.userId, role: m.role }, 60);
    return m;
  }

  async canEdit(user: any, projectId: string) {
    if (user.role === "SUPER_ADMIN") return true;
    const cacheKey = this.editKey(user.id, projectId);
    const cached = await this.redis.getJson<boolean>(cacheKey);
    if (typeof cached === "boolean") return cached;
    const m = await this.checkAccess(user, projectId);
    const canEdit = !!m && (m.role === "owner" || m.role === "admin" || m.role === "editor");
    await this.redis.setJson(cacheKey, canEdit, 60);
    return canEdit;
  }

  async tasksOf(user: any, projectId: string) {
    await this.checkAccess(user, projectId);
    const tasks = await this.prisma.task.findMany({
      where: { projectId, status: { not: "DELETED" as any } },
      include: { progressItems: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    });
    return { tasks };
  }

  async createTask(user: any, projectId: string, body: any) {
    if (!(await this.canEdit(user, projectId))) throw new ForbiddenException("无任务创建权限");
    const lastTask = await this.prisma.task.findFirst({
      where: { projectId },
      orderBy: [{ sortOrder: "desc" }, { createdAt: "desc" }],
      select: { sortOrder: true },
    });
    const task = await this.prisma.task.create({
      data: {
        id: genId("t"), projectId,
        title: body.title || "未命名任务",
        status: body.status || "TODO",
        priority: body.priority || "medium",
        sortOrder: Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : (lastTask?.sortOrder ?? 0) + 1,
        baselineStart: new Date(`${body.baselineStart || today()}T00:00:00Z`),
        baselineEnd: new Date(`${body.baselineEnd || today()}T00:00:00Z`),
        currentStart: new Date(`${body.currentStart || body.baselineStart || today()}T00:00:00Z`),
        currentEnd: new Date(`${body.currentEnd || body.baselineEnd || today()}T00:00:00Z`),
        dependencyIds: body.dependencyIds || [],
        note: body.note || "",
      },
    });

    const progressItems = [];
    for (const a of body.assignments || body.progressItems || []) {
      const item = await this.prisma.taskProgress.create({
        data: {
          id: genId("tp"), taskId: task.id, projectId, userId: a.userId,
          planStart: new Date(`${a.planStart || body.baselineStart || today()}T00:00:00Z`),
          planEnd: new Date(`${a.planEnd || body.baselineEnd || today()}T00:00:00Z`),
          currentEnd: new Date(`${a.currentEnd || body.currentEnd || today()}T00:00:00Z`),
        },
      });
      progressItems.push(item);
    }

    await this.events.record({ type: "task.created", actor: user, projectId, message: `创建任务：${task.title}`, color: "blue", metadata: { taskId: task.id, assignmentCount: progressItems.length } });
    return { task, progressItems, assignments: progressItems };
  }

  async getTask(user: any, taskId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException("任务不存在");
    await this.checkAccess(user, task.projectId);
    const progressItems = await this.prisma.taskProgress.findMany({ where: { taskId } });
    return { task, progressItems };
  }

  async updateTask(user: any, taskId: string, body: any) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException("任务不存在");
    if (!(await this.canEdit(user, task.projectId))) throw new ForbiddenException("无任务编辑权限");
    // Convert string date fields to Date objects for Prisma
    const data: any = { ...body };
    const dateFields = ["baselineStart", "baselineEnd", "currentStart", "currentEnd"];
    for (const f of dateFields) {
      if (typeof data[f] === "string") data[f] = new Date(`${data[f]}T00:00:00Z`);
    }
    const updated = await this.prisma.task.update({ where: { id: taskId }, data });
    if (typeof body?.status === "string") {
      const progressPatchByStatus: Record<string, any> = {
        DONE: { status: "COMPLETED" as any, progress: 100, actualEnd: new Date(`${today()}T00:00:00Z`) },
        TODO: { status: "TODO" as any, progress: 0, actualStart: null, actualEnd: null },
        DOING: { status: "DOING" as any, actualStart: new Date(`${today()}T00:00:00Z`) },
        BLOCKED: { status: "BLOCKED" as any },
      };
      const progressPatch = progressPatchByStatus[body.status];
      if (progressPatch) {
        await this.prisma.taskProgress.updateMany({ where: { taskId }, data: progressPatch });
      }
    }
    await this.events.record({ type: "task.updated", actor: user, projectId: task.projectId, message: `更新任务：${updated.title}`, color: "amber", metadata: { taskId, fields: Object.keys(body || {}) } });
    return { task: updated };
  }

  async deleteTask(user: any, taskId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException("任务不存在");
    if (!(await this.canEdit(user, task.projectId))) throw new ForbiddenException("无任务删除权限");
    await this.prisma.task.update({ where: { id: taskId }, data: { status: "DELETED" as any } });
    await this.events.record({ type: "task.deleted", actor: user, projectId: task.projectId, message: `删除任务：${task.title}`, color: "rose", metadata: { taskId } });
    return { ok: true };
  }

  async copyTask(user: any, taskId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException("任务不存在");
    if (!(await this.canEdit(user, task.projectId))) throw new ForbiddenException("无任务复制权限");
    const lastTask = await this.prisma.task.findFirst({
      where: { projectId: task.projectId },
      orderBy: [{ sortOrder: "desc" }, { createdAt: "desc" }],
      select: { sortOrder: true },
    });
    const copy = await this.prisma.task.create({
      data: {
        id: genId("t"), projectId: task.projectId,
        title: `${task.title} (副本)`, priority: task.priority,
        sortOrder: (lastTask?.sortOrder ?? task.sortOrder ?? 0) + 1,
        baselineStart: task.baselineStart, baselineEnd: task.baselineEnd,
        currentStart: task.currentStart, currentEnd: task.currentEnd,
        dependencyIds: task.dependencyIds, note: task.note,
      },
    });
    await this.events.record({ type: "task.copied", actor: user, projectId: task.projectId, message: `复制任务：${task.title}`, color: "blue", metadata: { sourceTaskId: taskId, taskId: copy.id } });
    return { task: copy };
  }

  async archiveTask(user: any, taskId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task || !(await this.canEdit(user, task.projectId))) throw new ForbiddenException("无权限");
    await this.prisma.task.update({ where: { id: taskId }, data: { status: "ARCHIVED" as any } });
    await this.events.record({ type: "task.archived", actor: user, projectId: task.projectId, message: `归档任务：${task.title}`, color: "amber", metadata: { taskId } });
    return { ok: true };
  }

  async restoreTask(user: any, taskId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task || !(await this.canEdit(user, task.projectId))) throw new ForbiddenException("无权限");
    await this.prisma.task.update({ where: { id: taskId }, data: { status: "TODO" as any } });
    await this.events.record({ type: "task.restored", actor: user, projectId: task.projectId, message: `恢复任务：${task.title}`, color: "green", metadata: { taskId } });
    return { ok: true };
  }

  // ---- Progress ----
  async updateProgress(user: any, progressId: string, body: any, action = "updated") {
    const item = await this.prisma.taskProgress.findUnique({ where: { id: progressId } });
    if (!item) throw new NotFoundException("成员进度不存在");
    const member: any = user.role === "SUPER_ADMIN" ? { role: "admin" } : await this.checkAccess(user, item.projectId);
    if (!member) throw new NotFoundException("项目不存在或无权限");
    const canManage = member.role === "owner" || member.role === "admin" || user.role === "SUPER_ADMIN";
    if (!(item.userId === user.id || canManage)) throw new ForbiddenException("无成员进度更新权限");

    const updateData: any = { ...body };
    for (const field of ["planStart", "planEnd", "currentEnd", "actualStart", "actualEnd"]) {
      if (typeof updateData[field] === "string") updateData[field] = new Date(`${updateData[field]}T00:00:00Z`);
    }
    if (action === "complete") {
      updateData.status = "COMPLETED";
      updateData.actualEnd = new Date(`${today()}T00:00:00Z`);
      updateData.deltaDays = deltaDays(item.planEnd.toISOString().slice(0, 10), today());
      updateData.progress = 100;
    } else if (action === "delay") {
      updateData.status = "DELAYED";
      if (body.currentEnd) updateData.currentEnd = new Date(`${body.currentEnd}T00:00:00Z`);
      updateData.deltaDays = deltaDays(item.planEnd.toISOString().slice(0, 10), body.currentEnd || today());
    } else if (action === "block") {
      updateData.status = "BLOCKED";
    } else if (action === "abandon") {
      updateData.status = "ABANDONED";
    } else if (action === "start" || action === "resume") {
      updateData.status = "DOING";
      updateData.actualStart = item.actualStart || new Date(`${today()}T00:00:00Z`);
    }

    const updated = await this.prisma.taskProgress.update({ where: { id: progressId }, data: updateData });
    await this.events.record({ type: `task.progress.${action}`, actor: user, projectId: item.projectId, message: `更新成员进度：${action}`, color: action === "complete" ? "green" : action === "block" ? "rose" : "amber", metadata: { progressId, taskId: item.taskId, targetUserId: item.userId } });
    return { progress: updated, assignment: updated };
  }

  async submit(user: any, progressId: string, body: any) {
    const item = await this.prisma.taskProgress.findUnique({ where: { id: progressId } });
    if (!item || item.userId !== user.id) throw new ForbiddenException("只能提交自己的任务成果");
    const submission = await this.prisma.taskSubmission.create({
      data: {
        id: genId("sub"), projectId: item.projectId, taskId: item.taskId, progressId, userId: user.id,
        name: body.name || "未命名提交物", fileType: body.fileType || "attachment",
        content: body.content || "", note: body.note || "",
      },
    });
    await this.events.record({ type: "task.submission.created", actor: user, projectId: item.projectId, message: `提交任务成果：${submission.name}`, color: "blue", metadata: { submissionId: submission.id, progressId, taskId: item.taskId } });
    return { submission };
  }

  async getTaskFull(user: any, taskId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException("任务不存在");
    await this.checkAccess(user, task.projectId);
    const [progressItems, submissions] = await Promise.all([
      this.prisma.taskProgress.findMany({ where: { taskId } }),
      this.prisma.taskSubmission.findMany({ where: { taskId }, orderBy: { createdAt: "desc" } }),
    ]);
    return { task, progressItems, submissions };
  }
}
