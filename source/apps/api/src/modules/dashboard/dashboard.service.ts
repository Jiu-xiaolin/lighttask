import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Observable } from "rxjs";
import { PrismaService } from "../../prisma/prisma.service.js";
import { today as todayStr } from "../../common/utils/index.js";
import { RedisService } from "../../redis/redis.service.js";

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService, private redis: RedisService) {}

  private dashboardStatsKey(userId: string) {
    return `dashboard:stats:${userId}`;
  }

  private dashboardGanttKey(userId: string) {
    return `dashboard:gantt:${userId}`;
  }

  private visibleProjectIdsKey(userId: string, role: string) {
    return `access:visible-projects:${role}:${userId}`;
  }

  private editProjectKey(userId: string, projectId: string) {
    return `access:edit:${userId}:${projectId}`;
  }

  private async invalidateDashboardCaches(projectIds: string[] = []) {
    await Promise.all([
      this.redis.invalidateBusinessCaches(),
      ...projectIds.map(projectId => this.redis.delPattern(`access:edit:*:${projectId}`)),
    ]);
  }

  private async visibleProjectIds(user: any): Promise<Set<string>> {
    const cacheKey = this.visibleProjectIdsKey(user.id, user.role);
    const cached = await this.redis.getJson<string[]>(cacheKey);
    if (cached) return new Set(cached);

    if (user.role === "SUPER_ADMIN") {
      const projects = await this.prisma.project.findMany({ where: { status: { not: "DELETED" as any } }, select: { id: true } });
      const ids = projects.map(p => p.id);
      await this.redis.setJson(cacheKey, ids, 30);
      return new Set(ids);
    }
    const members = await this.prisma.projectMember.findMany({ where: { userId: user.id } });
    const ids = members.map(m => m.projectId);
    await this.redis.setJson(cacheKey, ids, 60);
    return new Set(ids);
  }

  private async canEditProject(user: any, projectId: string) {
    if (user.role === "SUPER_ADMIN") return true;
    const cacheKey = this.editProjectKey(user.id, projectId);
    const cached = await this.redis.getJson<boolean>(cacheKey);
    if (typeof cached === "boolean") return cached;
    const member = await this.prisma.projectMember.findUnique({ where: { projectId_userId: { projectId, userId: user.id } } });
    const canEdit = !!member && ["owner", "admin", "editor"].includes(member.role);
    await this.redis.setJson(cacheKey, canEdit, 60);
    return canEdit;
  }

  private toDate(value: any) {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return new Date(`${parsed.toISOString().slice(0, 10)}T00:00:00Z`);
  }

  private linkIds(link: any) {
    return {
      from: link?.from || link?.source || link?.sourceId,
      to: link?.to || link?.target || link?.targetId,
      type: link?.type || "FS",
    };
  }

  private normalizeProgress(value: any) {
    const progress = Math.round(Number(value));
    if (!Number.isFinite(progress)) return null;
    return this.clamp(progress, 0, 100);
  }

  private daysBetween(from: Date, to: Date) {
    const day = 24 * 60 * 60 * 1000;
    const a = new Date(`${from.toISOString().slice(0, 10)}T00:00:00Z`).getTime();
    const b = new Date(`${to.toISOString().slice(0, 10)}T00:00:00Z`).getTime();
    return Math.round((b - a) / day);
  }

  private clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
  }

  private taskActualProgress(task: any, progressItems: any[]) {
    if (task.status === "DONE") return 1;
    const activeItems = progressItems.filter(item => item.taskId === task.id && item.status !== "ABANDONED");
    if (activeItems.length) {
      const progress = activeItems.reduce((sum, item) => {
        if (item.status === "COMPLETED") return sum + 100;
        return sum + this.clamp(item.progress || 0, 0, 100);
      }, 0) / activeItems.length;
      return this.clamp(progress / 100, 0, 1);
    }
    if (task.status === "DOING") return 0.35;
    if (task.status === "BLOCKED") return 0.15;
    return 0;
  }

  private currentTaskActionState(task: any, today: Date) {
    const activeToday = task.currentStart.getTime() <= today.getTime() && task.currentEnd.getTime() >= today.getTime();
    const overdue = task.currentEnd.getTime() < today.getTime();
    return { activeToday, overdue, shouldHandleToday: task.status !== "DONE" && (activeToday || overdue) };
  }

  private portfolioProgressDeviation(projects: any[], tasks: any[], progressItems: any[], today: Date) {
    const activeProjectIds = new Set(projects.filter(p => p.status !== "DELETED").map(p => p.id));
    const activeTasks = tasks.filter(task => activeProjectIds.has(task.projectId));
    const factors = activeTasks.map(task => {
      const plannedDays = Math.max(1, this.daysBetween(task.baselineStart, task.baselineEnd) + 1);
      const elapsedDays = this.clamp(this.daysBetween(task.baselineStart, today) + 1, 0, plannedDays);
      const expectedProgress = task.status === "DONE" ? 1 : this.clamp(elapsedDays / plannedDays, 0, 1);
      const actualProgress = this.taskActualProgress(task, progressItems);
      const scheduleShiftDays = Math.max(0, this.daysBetween(task.baselineEnd, task.currentEnd));
      const statusPenalty = task.status === "BLOCKED" ? Math.min(plannedDays * 0.18, 2) : 0;
      const workWeight = plannedDays * (task.priority === "high" ? 1.18 : task.priority === "low" ? 0.86 : 1);
      return {
        expectedWork: expectedProgress * workWeight,
        actualWork: actualProgress * workWeight,
        totalWork: workWeight,
        plannedDays,
        scheduleShiftDays,
        statusPenalty,
      };
    }).filter(factor => factor.totalWork > 0);

    if (!factors.length) {
      return {
        days: 0,
        expectedProgress: 0,
        actualProgress: 0,
        progressGap: 0,
        projectCount: projects.length,
        taskCount: 0,
        status: "ON_TRACK",
      };
    }

    const totalWork = factors.reduce((sum, factor) => sum + factor.totalWork, 0);
    const expectedWork = factors.reduce((sum, factor) => sum + factor.expectedWork, 0);
    const actualWork = factors.reduce((sum, factor) => sum + factor.actualWork, 0);
    const plannedWorkDays = factors.reduce((sum, factor) => sum + factor.plannedDays * factor.totalWork, 0) / totalWork;
    const scheduleShiftDays = factors.reduce((sum, factor) => sum + factor.scheduleShiftDays * factor.totalWork, 0) / totalWork;
    const statusPenalty = factors.reduce((sum, factor) => sum + factor.statusPenalty * factor.totalWork, 0) / totalWork;
    const progressGap = (expectedWork - actualWork) / totalWork;
    const rawDays = progressGap * plannedWorkDays + scheduleShiftDays * 0.18 + statusPenalty;
    const days = Math.abs(rawDays) < 0.35 ? 0 : Math.round(this.clamp(rawDays, -plannedWorkDays, Math.max(plannedWorkDays, 30)));

    return {
      days,
      expectedProgress: Math.round((expectedWork / totalWork) * 100),
      actualProgress: Math.round((actualWork / totalWork) * 100),
      progressGap: Math.round(progressGap * 100),
      projectCount: activeProjectIds.size,
      taskCount: activeTasks.length,
      status: days > 0 ? "LAGGING" : days < 0 ? "AHEAD" : "ON_TRACK",
    };
  }

  async dashboardStats(user: any) {
    const cacheKey = this.dashboardStatsKey(user.id);
    const cached = await this.redis.getJson<any>(cacheKey);
    if (cached) return cached;

    const projectIds = await this.visibleProjectIds(user);
    const visibleIds = [...projectIds];
    if (!visibleIds.length) {
      const emptyStats = {
        metrics: { todayActions: 0, myDeltaDays: 0, myCompletion: 0, pendingFiles: 0, riskProjects: 0, activeProjects: 0, progressDeviation: { days: 0, expectedProgress: 0, actualProgress: 0, progressGap: 0, projectCount: 0, taskCount: 0, status: "ON_TRACK" } },
        statusCounts: { total: 0, todo: 0, doing: 0, done: 0, blocked: 0 },
        pendingActions: [],
        riskItems: [],
        myProgress: [],
      };
      await this.redis.setJson(cacheKey, emptyStats, 15);
      return emptyStats;
    }

    const [projects, tasks, progressItems] = await Promise.all([
      this.prisma.project.findMany({
        where: { id: { in: visibleIds }, status: { not: "DELETED" as any } },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      }),
      this.prisma.task.findMany({
        where: { projectId: { in: visibleIds }, status: { notIn: ["DELETED", "ARCHIVED"] as any } },
        orderBy: [{ projectId: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
      }),
      this.prisma.taskProgress.findMany({
        where: { projectId: { in: visibleIds }, status: { not: "DELETED" as any } },
        include: { submissions: { where: { deleted: false }, select: { id: true } } },
      }),
    ]);

    const projectMap = new Map(projects.map(p => [p.id, p]));
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const today = new Date(`${todayStr()}T00:00:00Z`);
    const activeTasks = tasks.filter(t => projectMap.has(t.projectId));
    const statusCounts = {
      total: activeTasks.length,
      todo: activeTasks.filter(t => t.status === "TODO").length,
      doing: activeTasks.filter(t => t.status === "DOING").length,
      done: activeTasks.filter(t => t.status === "DONE").length,
      blocked: activeTasks.filter(t => t.status === "BLOCKED").length,
    };

    const pendingTaskIds = new Set<string>();
    const pendingActions: any[] = [];
    for (const task of activeTasks) {
      const { overdue, shouldHandleToday } = this.currentTaskActionState(task, today);
      if (!shouldHandleToday) continue;
      pendingTaskIds.add(task.id);
      const project = projectMap.get(task.projectId);
      pendingActions.push({
        taskId: task.id,
        projectId: task.projectId,
        title: task.title,
        projectName: project?.name || "",
        status: task.status,
        action: task.status === "BLOCKED" ? "解除阻塞" : overdue ? "处理逾期" : "今日推进",
      });
    }

    for (const item of progressItems) {
      if (item.status !== "BLOCKED" && item.status !== "DELAYED") continue;
      if (pendingTaskIds.has(item.taskId)) continue;
      const task = taskMap.get(item.taskId);
      if (!task) continue;
      const { overdue, shouldHandleToday } = this.currentTaskActionState(task, today);
      if (!shouldHandleToday) continue;
      const project = projectMap.get(item.projectId);
      pendingTaskIds.add(item.taskId);
      pendingActions.push({
        taskId: item.taskId,
        projectId: item.projectId,
        title: task?.title || "成员进度",
        projectName: project?.name || "",
        status: item.status,
        action: item.status === "BLOCKED" ? "解除阻塞" : overdue ? "处理逾期" : "今日推进",
      });
    }

    const progressDeviation = this.portfolioProgressDeviation(projects, activeTasks, progressItems, today);
    const myDeltaDays = progressDeviation.days;
    const myProgressItems = progressItems.filter(p => p.userId === user.id);
    const myCompletion = activeTasks.length ? Math.round((statusCounts.done / activeTasks.length) * 100) : 0;
    const pendingFiles = progressItems.filter(p => !["COMPLETED", "ABANDONED"].includes(p.status) && p.submissions.length === 0).length;

    const riskProjectIds = new Set<string>();
    projects.filter(p => p.risk !== "low").forEach(p => riskProjectIds.add(p.id));
    activeTasks
      .filter(t => t.status === "BLOCKED" || (t.status !== "DONE" && t.currentEnd.getTime() > t.baselineEnd.getTime()))
      .forEach(t => riskProjectIds.add(t.projectId));
    const riskItems = [...riskProjectIds].map(id => {
      const project = projectMap.get(id);
      const projectTasks = activeTasks.filter(t => t.projectId === id);
      const done = projectTasks.filter(t => t.status === "DONE").length;
      return {
        id,
        name: project?.name || "",
        risk: project?.risk || "medium",
        ownerId: project?.ownerId,
        status: project?.status,
        progress: projectTasks.length ? Math.round((done / projectTasks.length) * 100) : project?.progress || 0,
      };
    });

    const stats = {
      metrics: {
        todayActions: pendingTaskIds.size,
        myDeltaDays,
        myCompletion,
        pendingFiles,
        riskProjects: riskProjectIds.size,
        activeProjects: projects.filter(p => p.status === "ACTIVE" as any).length,
        progressDeviation,
      },
      statusCounts,
      pendingActions: pendingActions.slice(0, 20),
      riskItems: riskItems.slice(0, 10),
      myProgress: myProgressItems.slice(0, 20),
    };
    await this.redis.setJson(cacheKey, stats, 15);
    return stats;
  }

  async dashboard(user: any) {
    return this.dashboardStats(user);
  }

  async dashboardFull(user: any) {
    const projectIds = await this.visibleProjectIds(user);
    const projects = await this.prisma.project.findMany({
      where: { id: { in: [...projectIds] } },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
    const tasks = await this.prisma.task.findMany({
      where: { projectId: { in: [...projectIds] }, status: { notIn: ["DELETED", "ARCHIVED"] as any } },
      orderBy: [{ projectId: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    });
    const stats = await this.dashboardStats(user);

    return {
      ...stats,
      projects: projects.map(p => ({ id: p.id, name: p.name, group: p.group, status: p.status, risk: p.risk, progress: tasks.filter(t => t.projectId === p.id && t.status === "DONE").length, totalTasks: tasks.filter(t => t.projectId === p.id).length })),
    };
  }

  async ganttV2(user: any) {
    const cacheKey = this.dashboardGanttKey(user.id);
    const cached = await this.redis.getJson<any>(cacheKey);
    if (cached) return cached;

    const projectIds = await this.visibleProjectIds(user);
    const projects = await this.prisma.project.findMany({
      where: { id: { in: [...projectIds] } },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
    const tasks = await this.prisma.task.findMany({
      where: { projectId: { in: [...projectIds] }, status: { notIn: ["DELETED", "ARCHIVED"] as any } },
      orderBy: [{ projectId: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    });
    const progressItems = await this.prisma.taskProgress.findMany({ where: { projectId: { in: [...projectIds] } } });
    const users = await this.prisma.user.findMany({ select: { id: true, name: true } });
    const userMap = new Map(users.map(u => [u.id, u.name]));

    const ensureDuration = (s: string, e: string) => {
      if (!s) return { start: todayStr(), end: todayStr() };
      if (!e || e === s) { const d = new Date((e || s) + "T00:00:00Z"); d.setDate(d.getDate() + 1); return { start: s, end: d.toISOString().slice(0, 10) }; }
      return { start: s, end: e };
    };

    const baselines: any[] = [];
    const links: any[] = [];

    const data = projects.map(project => {
      const projectTasks = tasks.filter(t => t.projectId === project.id);
      const children = projectTasks.map(t => {
        const ts = t.currentStart.toISOString().slice(0, 10);
        const te = t.currentEnd.toISOString().slice(0, 10);
        const se = ensureDuration(ts, te);
        const taskProgress = progressItems.filter(p => p.taskId === t.id);
        const pct = taskProgress.length ? Math.round(taskProgress.reduce((s, p) => s + (p.progress || 0), 0) / taskProgress.length) : 0;
        const assignee = taskProgress.length ? userMap.get(taskProgress[0].userId) || "" : "";

        if (t.baselineStart && t.baselineEnd) {
          const bs = t.baselineStart.toISOString().slice(0, 10);
          const be = t.baselineEnd.toISOString().slice(0, 10);
          if (bs !== ts || be !== te) {
            baselines.push({ id: `bl_${t.id}`, taskId: t.id, name: "原计划", startTime: bs, endTime: be });
          }
        }

        (t.dependencyIds || []).forEach((depId: string) => {
          if (tasks.find(dt => dt.id === depId)) links.push({ id: `ln_${depId}_${t.id}`, from: depId, to: t.id, type: "FS" });
        });

        return { id: t.id, name: t.title, startTime: se.start, endTime: se.end, progress: pct, type: "task", status: t.status, priority: t.priority, assignee, note: t.note || "" };
      });
      const summaryProgress = children.length
        ? Math.round(children.reduce((sum, child) => {
          const progress = child.status === "DONE" ? 100 : this.clamp(child.progress || 0, 0, 100);
          return sum + progress;
        }, 0) / children.length)
        : 0;

      let summaryStart = project.start.toISOString().slice(0, 10);
      let summaryEnd = project.currentEnd.toISOString().slice(0, 10);
      if (children.length) {
        const starts = children.map(c => c.startTime).sort();
        const ends = children.map(c => c.endTime).sort();
        summaryStart = starts[0];
        summaryEnd = ends[ends.length - 1];
      }

      return { id: project.id, name: project.name, startTime: summaryStart, endTime: ensureDuration(summaryStart, summaryEnd).end, progress: summaryProgress, type: "summary", expanded: children.length > 0, children };
    });

    const payload = { data, baselines, links };
    await this.redis.setJson(cacheKey, payload, 20);
    return payload;
  }

  async syncGantt(user: any, body: any) {
    const moves = Array.isArray(body?.moves) ? body.moves : [];
    const links = Array.isArray(body?.links) ? body.links : [];
    const progresses = Array.isArray(body?.progresses) ? body.progresses : [];
    const touchedTaskIds = new Set<string>();

    for (const move of moves) {
      const taskId = move?.id || move?.taskId || move?.row?.id;
      if (!taskId) continue;
      const task = await this.prisma.task.findUnique({ where: { id: taskId } });
      if (!task) throw new NotFoundException("任务不存在");
      if (!(await this.canEditProject(user, task.projectId))) throw new ForbiddenException("无甘特图编辑权限");
      const currentStart = this.toDate(move.currentStart || move.startTime || move.row?.startTime);
      const currentEnd = this.toDate(move.currentEnd || move.endTime || move.row?.endTime);
      if (!currentStart || !currentEnd) continue;
      await this.prisma.task.update({
        where: { id: taskId },
        data: { currentStart, currentEnd },
      });
      touchedTaskIds.add(taskId);
    }

    for (const entry of links) {
      const action = entry?.action || "upsert";
      const { from, to } = this.linkIds(entry);
      if (!from || !to || from === to) continue;
      const [sourceTask, targetTask] = await Promise.all([
        this.prisma.task.findUnique({ where: { id: from } }),
        this.prisma.task.findUnique({ where: { id: to } }),
      ]);
      if (!sourceTask || !targetTask) throw new NotFoundException("依赖任务不存在");
      if (sourceTask.projectId !== targetTask.projectId) throw new ForbiddenException("暂不支持跨项目依赖");
      if (!(await this.canEditProject(user, targetTask.projectId))) throw new ForbiddenException("无甘特图编辑权限");
      const deps = new Set(targetTask.dependencyIds || []);
      if (action === "delete" || action === "remove") deps.delete(from);
      else deps.add(from);
      await this.prisma.task.update({
        where: { id: to },
        data: { dependencyIds: [...deps] },
      });
      touchedTaskIds.add(to);
    }

    for (const entry of progresses) {
      const taskId = entry?.id || entry?.taskId || entry?.row?.id;
      const progress = this.normalizeProgress(entry?.progress ?? entry?.row?.progress);
      if (!taskId || progress === null) continue;
      const task = await this.prisma.task.findUnique({ where: { id: taskId } });
      if (!task) throw new NotFoundException("任务不存在");
      if (!(await this.canEditProject(user, task.projectId))) throw new ForbiddenException("无甘特图编辑权限");
      const existing = await this.prisma.taskProgress.findMany({ where: { taskId } });
      if (existing.length) {
        await this.prisma.taskProgress.updateMany({
          where: { taskId },
          data: {
            progress,
            status: progress >= 100 ? "COMPLETED" as any : progress > 0 ? "DOING" as any : "TODO" as any,
            actualStart: progress > 0 ? new Date() : undefined,
            actualEnd: progress >= 100 ? new Date() : undefined,
          },
        });
      } else {
        await this.prisma.taskProgress.create({
          data: {
            id: `tp_${Date.now()}_${Math.round(Math.random() * 1e6)}`,
            taskId,
            projectId: task.projectId,
            userId: user.id,
            planStart: task.baselineStart,
            planEnd: task.baselineEnd,
            currentEnd: task.currentEnd,
            progress,
            status: progress >= 100 ? "COMPLETED" as any : progress > 0 ? "DOING" as any : "TODO" as any,
            actualStart: progress > 0 ? new Date() : null,
            actualEnd: progress >= 100 ? new Date() : null,
          },
        });
      }
      const nextTaskStatus = progress >= 100 ? "DONE" as any : progress > 0 && task.status === "TODO" ? "DOING" as any : task.status;
      if (nextTaskStatus !== task.status) {
        await this.prisma.task.update({ where: { id: taskId }, data: { status: nextTaskStatus } });
      }
      touchedTaskIds.add(taskId);
    }

    if (touchedTaskIds.size) {
      const tasks = await this.prisma.task.findMany({ where: { id: { in: [...touchedTaskIds] } }, select: { projectId: true } });
      const projectIds = [...new Set(tasks.map(t => t.projectId))];
      for (const projectId of projectIds) {
        const projectTasks = await this.prisma.task.findMany({
          where: { projectId, status: { notIn: ["DELETED", "ARCHIVED"] as any } },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
        });
        if (!projectTasks.length) continue;
        const ends = projectTasks.map(t => t.currentEnd).sort((a, b) => a.getTime() - b.getTime());
        const done = projectTasks.filter(t => t.status === "DONE").length;
        await this.prisma.project.update({
          where: { id: projectId },
          data: {
            currentEnd: ends[ends.length - 1],
            progress: Math.round((done / projectTasks.length) * 100),
          },
        });
      }
      await this.invalidateDashboardCaches(projectIds);
      await this.redis.publish("lighttask:events", { type: "gantt.updated", taskIds: [...touchedTaskIds], at: new Date().toISOString() });
    }

    return {
      ok: true,
      updatedTaskIds: [...touchedTaskIds],
      updatedLinks: links.map((link: any) => {
        const ids = this.linkIds(link);
        return { action: link?.action || "upsert", ...ids };
      }),
      updatedProgresses: progresses.map((entry: any) => ({
        id: entry?.id || entry?.taskId || entry?.row?.id,
        progress: this.normalizeProgress(entry?.progress ?? entry?.row?.progress),
      })).filter((entry: any) => entry.id && entry.progress !== null),
    };
  }

  async memberGantt(user: any) {
    const projectIds = await this.visibleProjectIds(user);
    const assignments = await this.prisma.taskProgress.findMany({ where: { projectId: { in: [...projectIds] } } });
    return { assignments };
  }

  events(user: any) {
    return new Observable((subscriber) => {
      let closed = false;
      let unsubscribe: null | (() => Promise<void>) = null;
      const heartbeat = setInterval(() => {
        subscriber.next({ type: "message", data: { type: "heartbeat", at: new Date().toISOString() } });
      }, 25_000);

      subscriber.next({ type: "message", data: { type: "connected", userId: user.id, at: new Date().toISOString() } });
      this.redis.subscribe("lighttask:events", (payload) => {
        if (closed) return;
        subscriber.next({ type: "message", data: payload });
      }).then((cleanup) => {
        unsubscribe = cleanup;
      }).catch((error) => subscriber.error(error));

      return () => {
        closed = true;
        clearInterval(heartbeat);
        unsubscribe?.().catch(() => undefined);
      };
    });
  }
}
