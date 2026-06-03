import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export function createInitialData(now = new Date("2026-06-02T08:00:00Z")) {
  const today = toDateOnly(now);
  return {
    users: [
      {
        id: "u_admin",
        username: "admin",
        password: "admin123",
        name: "林栖",
        role: "super_admin",
        enabled: true,
        signature: "让项目主线清楚，细节有迹可循。",
        avatar: "林",
        theme: "letter"
      },
      {
        id: "u_member",
        username: "member",
        password: "member123",
        name: "林树",
        role: "member",
        enabled: true,
        signature: "今日任务今日清。",
        avatar: "树",
        theme: "windbell"
      }
    ],
    sessions: [],
    userIpPolicies: [
      { userId: "u_admin", enabled: false, updatedBy: "system", updatedAt: today },
      { userId: "u_member", enabled: false, updatedBy: "system", updatedAt: today }
    ],
    userIpWhitelistEntries: [],
    projects: [
      {
        id: "p_alpha",
        name: "客户交付项目",
        group: "客户交付",
        ownerId: "u_admin",
        status: "active",
        progress: 68,
        risk: "medium",
        start: "2026-06-01",
        baselineEnd: "2026-06-08",
        currentEnd: "2026-06-09",
        description: "围绕资料收集、页面设计、验收报告推进。"
      },
      {
        id: "p_study",
        name: "双人学习计划",
        group: "学习",
        ownerId: "u_member",
        status: "active",
        progress: 42,
        risk: "low",
        start: "2026-06-01",
        baselineEnd: "2026-06-30",
        currentEnd: "2026-06-29",
        description: "两个人交错推进学习任务，并追踪每日、每周、每月进度。"
      }
    ],
    projectMembers: [
      { id: "pm_admin_alpha", projectId: "p_alpha", userId: "u_admin", role: "owner" },
      { id: "pm_member_alpha", projectId: "p_alpha", userId: "u_member", role: "editor" },
      { id: "pm_admin_study", projectId: "p_study", userId: "u_admin", role: "viewer" },
      { id: "pm_member_study", projectId: "p_study", userId: "u_member", role: "owner" }
    ],
    tasks: [
      {
        id: "t_design",
        projectId: "p_alpha",
        title: "需求确认",
        status: "doing",
        priority: "high",
        baselineStart: "2026-06-01",
        baselineEnd: "2026-06-04",
        currentStart: "2026-06-01",
        currentEnd: "2026-06-04",
        dependencyIds: []
      },
      {
        id: "t_files",
        projectId: "p_alpha",
        title: "资料收集",
        status: "todo",
        priority: "medium",
        baselineStart: "2026-06-03",
        baselineEnd: "2026-06-07",
        currentStart: "2026-06-03",
        currentEnd: "2026-06-08",
        dependencyIds: ["t_design"]
      },
      {
        id: "t_weekly",
        projectId: "p_study",
        title: "本周章节复盘",
        status: "doing",
        priority: "medium",
        baselineStart: "2026-06-01",
        baselineEnd: "2026-06-07",
        currentStart: "2026-06-01",
        currentEnd: "2026-06-06",
        dependencyIds: []
      }
    ],
    taskAssignments: [
      {
        id: "ta_design",
        taskId: "t_design",
        projectId: "p_alpha",
        userId: "u_member",
        status: "doing",
        planStart: "2026-06-01",
        planEnd: "2026-06-04",
        currentEnd: "2026-06-04",
        actualStart: "2026-06-01",
        actualEnd: null,
        deltaDays: null,
        note: "正在确认客户需求"
      },
      {
        id: "ta_files",
        taskId: "t_files",
        projectId: "p_alpha",
        userId: "u_admin",
        status: "todo",
        planStart: "2026-06-03",
        planEnd: "2026-06-07",
        currentEnd: "2026-06-08",
        actualStart: null,
        actualEnd: null,
        deltaDays: null,
        note: "等待需求确认后整理"
      },
      {
        id: "ta_weekly",
        taskId: "t_weekly",
        projectId: "p_study",
        userId: "u_member",
        status: "doing",
        planStart: "2026-06-01",
        planEnd: "2026-06-07",
        currentEnd: "2026-06-06",
        actualStart: "2026-06-01",
        actualEnd: null,
        deltaDays: -1,
        note: "预计提前一天完成"
      }
    ],
    projectFiles: [
      {
        id: "f_plan",
        projectId: "p_alpha",
        name: "项目计划",
        type: "word_doc",
        content: "# 项目计划\n\n- 需求确认\n- 资料收集\n- 验收归档",
        version: 1,
        ownerId: "u_admin",
        deleted: false,
        updatedAt: today
      },
      {
        id: "f_sheet",
        projectId: "p_alpha",
        name: "成员提交表",
        type: "sheet",
        content: JSON.stringify([
          ["成员", "任务", "状态"],
          ["林树", "需求确认", "进行中"]
        ]),
        version: 1,
        ownerId: "u_admin",
        deleted: false,
        updatedAt: today
      }
    ],
    notificationRules: [
      {
        id: "nr_done_creator",
        event: "task.assignment_completed",
        channel: "feishu",
        targetMode: "creator",
        targets: [],
        enabled: true
      }
    ],
    notificationLogs: [],
    timelineEvents: [
      {
        id: "ev_seed",
        projectId: "p_alpha",
        type: "project.created",
        actorId: "u_admin",
        actorName: "林栖",
        message: "创建项目并邀请成员",
        color: "blue",
        createdAt: "2026-06-01T09:00:00.000Z"
      }
    ],
    auditLogs: [],
    acceptanceItems: [
      { id: "acc_alpha", projectId: "p_alpha", title: "交付资料齐全", status: "pending" }
    ]
  };
}

export class JsonStore {
  constructor(dataDir, now = () => new Date()) {
    this.dataDir = dataDir;
    this.filePath = path.join(dataDir, "db.json");
    this.now = now;
    this.data = null;
  }

  async load() {
    await mkdir(this.dataDir, { recursive: true });
    try {
      const raw = await readFile(this.filePath, "utf8");
      this.data = JSON.parse(raw);
    } catch {
      this.data = createInitialData(this.now());
      await this.save();
    }
    return this.data;
  }

  async save() {
    await mkdir(this.dataDir, { recursive: true });
    await writeFile(this.filePath, JSON.stringify(this.data, null, 2), "utf8");
  }

  nextId(prefix) {
    return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
  }
}

export function toDateOnly(value) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
}

export function daysBetween(start, end) {
  const startDate = Date.parse(`${start}T00:00:00Z`);
  const endDate = Date.parse(`${end}T00:00:00Z`);
  return Math.round((endDate - startDate) / 86400000);
}
