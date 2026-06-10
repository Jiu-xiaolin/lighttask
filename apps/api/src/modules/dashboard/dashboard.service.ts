import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import { today as todayStr } from "../../common/utils/index.js";

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  private async visibleProjectIds(user: any): Promise<Set<string>> {
    if (user.role === "SUPER_ADMIN") {
      const projects = await this.prisma.project.findMany({ where: { status: { not: "DELETED" as any } }, select: { id: true } });
      return new Set(projects.map(p => p.id));
    }
    const members = await this.prisma.projectMember.findMany({ where: { userId: user.id } });
    return new Set(members.map(m => m.projectId));
  }

  private async canEditProject(user: any, projectId: string) {
    if (user.role === "SUPER_ADMIN") return true;
    const member = await this.prisma.projectMember.findUnique({ where: { projectId_userId: { projectId, userId: user.id } } });
    return !!member && ["owner", "admin", "editor"].includes(member.role);
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

  private daysBetween(from: Date, to: Date) {
    const day = 24 * 60 * 60 * 1000;
    const a = new Date(`${from.toISOString().slice(0, 10)}T00:00:00Z`).getTime();
    const b = new Date(`${to.toISOString().slice(0, 10)}T00:00:00Z`).getTime();
    return Math.round((b - a) / day);
  }

  async dashboardStats(user: any) {
    const projectIds = await this.visibleProjectIds(user);
    const visibleIds = [...projectIds];
    if (!visibleIds.length) {
      return {
        metrics: { todayActions: 0, myDeltaDays: 0, myCompletion: 0, pendingFiles: 0, riskProjects: 0, activeProjects: 0 },
        statusCounts: { total: 0, todo: 0, doing: 0, done: 0, blocked: 0 },
        pendingActions: [],
        riskItems: [],
        myProgress: [],
      };
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
      const activeToday = task.currentStart.getTime() <= today.getTime() && task.currentEnd.getTime() >= today.getTime();
      const overdue = task.currentEnd.getTime() < today.getTime();
      const needsAction = task.status !== "DONE" && (activeToday || overdue || task.status === "BLOCKED");
      if (!needsAction) continue;
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
      const project = projectMap.get(item.projectId);
      pendingTaskIds.add(item.taskId);
      pendingActions.push({
        taskId: item.taskId,
        projectId: item.projectId,
        title: task?.title || "成员进度",
        projectName: project?.name || "",
        status: item.status,
        action: item.status === "BLOCKED" ? "解除阻塞" : "处理延期",
      });
    }

    const taskDeltas = activeTasks
      .filter(t => t.status !== "DONE")
      .map(t => this.daysBetween(t.baselineEnd, t.currentEnd));
    const positiveDelta = taskDeltas.filter(d => d > 0);
    const negativeDelta = taskDeltas.filter(d => d < 0);
    const myDeltaDays = positiveDelta.length ? Math.max(...positiveDelta) : negativeDelta.length ? Math.min(...negativeDelta) : 0;
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

    return {
      metrics: {
        todayActions: pendingTaskIds.size,
        myDeltaDays,
        myCompletion,
        pendingFiles,
        riskProjects: riskProjectIds.size,
        activeProjects: projects.filter(p => p.status === "ACTIVE" as any).length,
      },
      statusCounts,
      pendingActions: pendingActions.slice(0, 20),
      riskItems: riskItems.slice(0, 10),
      myProgress: myProgressItems.slice(0, 20),
    };
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

      let summaryStart = project.start.toISOString().slice(0, 10);
      let summaryEnd = project.currentEnd.toISOString().slice(0, 10);
      if (children.length) {
        const starts = children.map(c => c.startTime).sort();
        const ends = children.map(c => c.endTime).sort();
        summaryStart = starts[0];
        summaryEnd = ends[ends.length - 1];
      }

      return { id: project.id, name: project.name, startTime: summaryStart, endTime: ensureDuration(summaryStart, summaryEnd).end, progress: 0, type: "summary", expanded: children.length > 0, children };
    });

    return { data, baselines, links };
  }

  async syncGantt(user: any, body: any) {
    const moves = Array.isArray(body?.moves) ? body.moves : [];
    const links = Array.isArray(body?.links) ? body.links : [];
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
    }

    return {
      ok: true,
      updatedTaskIds: [...touchedTaskIds],
      updatedLinks: links.map((link: any) => {
        const ids = this.linkIds(link);
        return { action: link?.action || "upsert", ...ids };
      }),
    };
  }

  async memberGantt(user: any) {
    const projectIds = await this.visibleProjectIds(user);
    const assignments = await this.prisma.taskProgress.findMany({ where: { projectId: { in: [...projectIds] } } });
    return { assignments };
  }
}
