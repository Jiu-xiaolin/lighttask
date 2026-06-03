import { Injectable, UnauthorizedException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { randomBytes, createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { cpus, freemem, totalmem, uptime, loadavg } from "node:os";
import bcrypt from "bcryptjs";

const DATA_DIR = join(process.cwd(), "data");
const DATA_FILE = join(DATA_DIR, "state.json");

type User = { id: string; username: string; passwordHash: string; name: string; role: "SUPER_ADMIN" | "MEMBER"; enabled: boolean; avatar: string; signature?: string; theme: string; customWallpaper?: string; customBlur?: number };
type Project = { id: string; name: string; group: string; ownerId: string; status: "ACTIVE" | "ARCHIVED" | "DELETED"; progress: number; risk: string; start: string; baselineEnd: string; currentEnd: string; description?: string; settings: Record<string, unknown>; acceptanceStatus: string };
type Member = { id: string; projectId: string; userId: string; role: string };
type Task = { id: string; projectId: string; title: string; status: string; priority: string; baselineStart: string; baselineEnd: string; currentStart: string; currentEnd: string; dependencyIds: string[]; note?: string };
type Progress = { id: string; taskId: string; projectId: string; userId: string; status: string; planStart: string; planEnd: string; currentEnd: string; actualStart?: string | null; actualEnd?: string | null; deltaDays?: number | null; progress: number; note?: string; nextAction?: string };
type FileItem = { id: string; projectId: string; name: string; type: string; folder: string; content: string; version: number; frozenVersion?: number; ownerId: string; deleted: boolean };

type Session = { id: string; tokenHash: string; userId: string; ip: string; lastActivityAt: string; revoked: boolean; revokedReason?: string | null };

@Injectable()
export class AppService {
  private users: User[] = [];
  private sessions: Session[] = [];
  private ipPolicies: Array<{ userId: string; enabled: boolean }> = [];
  private ipEntries: Array<{ id: string; userId: string; value: string; note?: string; enabled: boolean }> = [];
  private projects: Project[] = [];
  private members: Member[] = [];
  private tasks: Task[] = [];
  private progress: Progress[] = [];
  private files: FileItem[] = [];
  private fileVersions: Array<Record<string, unknown>> = [];
  private submissions: Array<Record<string, any>> = [];
  private acceptanceItems: Array<Record<string, any>> = [];
  private acceptanceReports: Array<Record<string, any>> = [];
  private notificationRules: Array<Record<string, any>> = [];
  private notificationLogs: Array<Record<string, any>> = [];
  private channels: Array<Record<string, any>> = [];
  private keys: Array<Record<string, any>> = [];
  private timeline: Array<Record<string, any>> = [];
  private audit: Array<Record<string, any>> = [];
  private roleTemplates: Array<Record<string, any>> = [];
  private permissionScopes: Array<Record<string, any>> = [];
  private jobs: Array<Record<string, any>> = [];
  private collab: Array<Record<string, any>> = [];
  private ganttViews: Array<Record<string, any>> = [];
  private _dirty = false;
  private _saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    if (existsSync(DATA_FILE)) { this.hydrate(); return; }
    this.seed();
    this.saveData();
  }

  private saveData() {
    try {
      const snapshot = {
        users: this.users, sessions: this.sessions, ipPolicies: this.ipPolicies, ipEntries: this.ipEntries,
        projects: this.projects, members: this.members, tasks: this.tasks, progress: this.progress,
        files: this.files, fileVersions: this.fileVersions, submissions: this.submissions,
        acceptanceItems: this.acceptanceItems, acceptanceReports: this.acceptanceReports,
        notificationRules: this.notificationRules, notificationLogs: this.notificationLogs,
        channels: this.channels, keys: this.keys, timeline: this.timeline, audit: this.audit,
        roleTemplates: this.roleTemplates, permissionScopes: this.permissionScopes,
        jobs: this.jobs, collab: this.collab, ganttViews: this.ganttViews
      };
      writeFileSync(DATA_FILE, JSON.stringify(snapshot, null, 2), "utf-8");
    } catch { /* best-effort persist */ }
  }

  private markDirty() {
    this._dirty = true;
    if (!this._saveTimer) {
      this._saveTimer = setTimeout(() => { this.saveData(); this._dirty = false; this._saveTimer = null; }, 200);
    }
  }

  private hydrate() {
    try {
      const raw = JSON.parse(readFileSync(DATA_FILE, "utf-8"));
      this.users = raw.users || []; this.sessions = raw.sessions || [];
      this.ipPolicies = raw.ipPolicies || []; this.ipEntries = raw.ipEntries || [];
      this.projects = raw.projects || []; this.members = raw.members || [];
      this.tasks = raw.tasks || []; this.progress = raw.progress || [];
      this.files = raw.files || []; this.fileVersions = raw.fileVersions || [];
      this.submissions = raw.submissions || [];
      this.acceptanceItems = raw.acceptanceItems || []; this.acceptanceReports = raw.acceptanceReports || [];
      this.notificationRules = raw.notificationRules || []; this.notificationLogs = raw.notificationLogs || [];
      this.channels = raw.channels || []; this.keys = raw.keys || [];
      this.timeline = raw.timeline || []; this.audit = raw.audit || [];
      this.roleTemplates = raw.roleTemplates || []; this.permissionScopes = raw.permissionScopes || [];
      this.jobs = raw.jobs || []; this.collab = raw.collab || []; this.ganttViews = raw.ganttViews || [];
    } catch { this.seed(); }
  }

  seed() {
    if (this.users.length) return;
    const adminHash = bcrypt.hashSync("admin123", 10);
    const memberHash = bcrypt.hashSync("member123", 10);
    this.users.push(
      { id: "u_admin", username: "admin", passwordHash: adminHash, name: "林栖", role: "SUPER_ADMIN", enabled: true, avatar: "林", signature: "让项目主线清楚，细节有迹可循。", theme: "letter" },
      { id: "u_member", username: "member", passwordHash: memberHash, name: "林树", role: "MEMBER", enabled: true, avatar: "树", signature: "今日任务今日清。", theme: "windbell" }
    );
    this.ipPolicies.push({ userId: "u_admin", enabled: false }, { userId: "u_member", enabled: false });
    this.projects.push(
      { id: "p_alpha", name: "客户交付项目", group: "客户交付", ownerId: "u_admin", status: "ACTIVE", progress: 68, risk: "medium", start: "2026-06-01", baselineEnd: "2026-06-08", currentEnd: "2026-06-09", description: "围绕资料收集、页面设计、验收报告推进。", settings: {}, acceptanceStatus: "pending" },
      { id: "p_study", name: "双人学习计划", group: "学习", ownerId: "u_member", status: "ACTIVE", progress: 42, risk: "low", start: "2026-06-01", baselineEnd: "2026-06-30", currentEnd: "2026-06-29", description: "两个人交错推进学习任务。", settings: {}, acceptanceStatus: "pending" }
    );
    this.members.push({ id: "pm_admin_alpha", projectId: "p_alpha", userId: "u_admin", role: "owner" }, { id: "pm_member_alpha", projectId: "p_alpha", userId: "u_member", role: "editor" }, { id: "pm_member_study", projectId: "p_study", userId: "u_member", role: "owner" });
    this.tasks.push({ id: "t_design", projectId: "p_alpha", title: "需求确认", status: "DOING", priority: "high", baselineStart: "2026-06-01", baselineEnd: "2026-06-04", currentStart: "2026-06-01", currentEnd: "2026-06-04", dependencyIds: [] });
    this.progress.push({ id: "tp_design", taskId: "t_design", projectId: "p_alpha", userId: "u_member", status: "DOING", planStart: "2026-06-01", planEnd: "2026-06-04", currentEnd: "2026-06-04", actualStart: "2026-06-01", actualEnd: null, deltaDays: null, progress: 45, note: "正在确认客户需求" });
    this.files.push({ id: "f_plan", projectId: "p_alpha", name: "项目计划", type: "WORD_DOC", folder: "项目资料", content: "# 项目计划\n\n- 需求确认\n- 资料收集\n- 验收归档", version: 1, ownerId: "u_admin", deleted: false });
    this.acceptanceItems.push({ id: "acc_alpha", projectId: "p_alpha", title: "交付资料齐全", status: "PENDING" });
    this.channels.push({ id: "nc_feishu", name: "飞书机器人", type: "feishu", enabled: true, config: { webhookMasked: "https://open.feishu.cn/***" } });
    this.notificationRules.push({ id: "nr_done", event: "task.progress_completed", channel: "feishu", targetMode: "creator", targets: [], enabled: true });
    this.roleTemplates.push(
      { id: "rt_super_admin", name: "超级管理员", role: "super_admin", builtin: true, permissions: ["progress.visible", "file.visible", "file.download", "submission.accept", "system.manage", "audit.view"] },
      { id: "rt_owner", name: "项目负责人", role: "owner", builtin: true, permissions: ["progress.visible", "file.visible", "file.download", "submission.accept", "project.manage", "task.manage", "file.manage", "acceptance.manage"] },
      { id: "rt_admin", name: "项目管理员", role: "admin", builtin: true, permissions: ["progress.visible", "file.visible", "file.download", "task.manage", "file.manage", "acceptance.manage"] },
      { id: "rt_editor", name: "编辑者", role: "editor", builtin: true, permissions: ["progress.visible", "file.visible", "task.edit", "file.edit"] },
      { id: "rt_commenter", name: "评论者", role: "commenter", builtin: true, permissions: ["progress.visible", "file.visible", "task.comment", "file.comment"] },
      { id: "rt_viewer", name: "只读访客", role: "viewer", builtin: true, permissions: ["progress.visible"] },
      { id: "rt_acceptor", name: "文件验收者", role: "acceptor", builtin: true, permissions: ["progress.visible", "file.visible", "submission.accept"] }
    );
    this.permissionScopes.push(
      { id: "ps_progress", key: "progress.visible", name: "进度可见", description: "成员甘特、快慢天数、当前状态", target: "project", enabled: true, defaultLevel: "member" },
      { id: "ps_file_visible", key: "file.visible", name: "文件可见", description: "项目文件、任务提交物、版本记录", target: "project", enabled: true, defaultLevel: "editor" },
      { id: "ps_file_download", key: "file.download", name: "文件下载", description: "下载、导出、归档包读取", target: "project", enabled: true, defaultLevel: "admin" },
      { id: "ps_submission", key: "submission.accept", name: "提交物验收", description: "标记通过、需修改、驳回", target: "project", enabled: true, defaultLevel: "owner" }
    );
    this.addTimeline("p_alpha", "project.created", this.users[0], "创建项目并邀请成员", "blue");
  }

  id(prefix: string) { return `${prefix}_${randomBytes(6).toString("hex")}`; }
  hash(value: string) { return createHash("sha256").update(value).digest("hex"); }
  today() { return new Date().toISOString().slice(0, 10); }
  publicUser(user: User) { const { passwordHash, ...safe } = user; return safe; }
  publicUserWithExtras(user: User) { const u = this.publicUser(user); return { ...u, customWallpaper: user.customWallpaper || "", customBlur: user.customBlur || 0 }; }
  mask(value = "") { return value.length <= 6 ? "***" : `${value.slice(0, 3)}***${value.slice(-3)}`; }
  addAudit(type: string, actorId: string, message: string) { this.audit.unshift({ id: this.id("audit"), type, actorId, message, createdAt: new Date().toISOString() }); }
  addTimeline(projectId: string, type: string, actor: User, message: string, color = "blue") { this.timeline.unshift({ id: this.id("ev"), projectId, type, actorId: actor.id, actorName: actor.name, message, color, createdAt: new Date().toISOString() }); }
  addNotification(event: string, projectId: string, actor: User, message: string) { for (const rule of this.notificationRules.filter(r => r.enabled && r.event === event)) this.notificationLogs.unshift({ id: this.id("nl"), ruleId: rule.id, event, projectId, channel: rule.channel, targetMode: rule.targetMode, targets: rule.targets, status: "queued", message, createdAt: new Date().toISOString(), retryCount: 0 }); }

  login(body: any, ip: string) {
    const user = this.users.find(u => u.username === body.username && u.enabled);
    if (!user || !bcrypt.compareSync(String(body.password || ""), user.passwordHash)) throw new UnauthorizedException("账号或密码错误");
    if (!this.isIpAllowed(user.id, ip)) throw new ForbiddenException("当前网络不允许访问");
    const token = `lt_${randomBytes(24).toString("hex")}`;
    this.sessions.push({ id: this.id("sess"), tokenHash: this.hash(token), userId: user.id, ip, lastActivityAt: new Date().toISOString(), revoked: false });
    this.addAudit("security.login_succeeded", user.id, `用户 ${user.name} 登录成功`);
    this.markDirty();
    return { token, user: this.publicUserWithExtras(user) };
  }

  auth(token?: string, ip = "127.0.0.1") {
    if (!token) throw new UnauthorizedException("需要登录");
    const raw = token.replace(/^Bearer\s+/i, "");
    const session = this.sessions.find(s => s.tokenHash === this.hash(raw));
    if (!session || session.revoked) throw new UnauthorizedException("登录状态已失效");
    const user = this.users.find(u => u.id === session.userId && u.enabled);
    if (!user) throw new UnauthorizedException("用户不可用");
    if (Date.now() - Date.parse(session.lastActivityAt) > 24 * 60 * 60 * 1000) { session.revoked = true; session.revokedReason = "idle_timeout"; throw new UnauthorizedException("登录状态已超过 24 小时未操作"); }
    if (!this.isIpAllowed(user.id, ip)) { session.revoked = true; session.revokedReason = "ip_not_allowed"; throw new ForbiddenException("当前网络不允许访问"); }
    session.lastActivityAt = new Date().toISOString();
    return { user, session };
  }

  isIpAllowed(userId: string, ip: string) { const policy = this.ipPolicies.find(p => p.userId === userId); return !policy?.enabled || this.ipEntries.some(e => e.userId === userId && e.enabled && e.value === ip); }
  isAdmin(user: User) { return user.role === "SUPER_ADMIN"; }
  visibleProjects(user: User) { if (this.isAdmin(user)) return this.projects.filter(p => p.status !== "DELETED"); const ids = new Set(this.members.filter(m => m.userId === user.id).map(m => m.projectId)); return this.projects.filter(p => ids.has(p.id) && p.status !== "DELETED"); }
  canAccess(user: User, projectId: string) { return this.isAdmin(user) || this.members.some(m => m.userId === user.id && m.projectId === projectId); }
  canManage(user: User, projectId: string) { const project = this.projects.find(p => p.id === projectId); const member = this.members.find(m => m.projectId === projectId && m.userId === user.id); return this.isAdmin(user) || project?.ownerId === user.id || ["owner", "admin"].includes(member?.role || ""); }
  canEdit(user: User, projectId: string) { const member = this.members.find(m => m.projectId === projectId && m.userId === user.id); return this.canManage(user, projectId) || member?.role === "editor"; }
  requireProject(user: User, id: string) { const project = this.projects.find(p => p.id === id && p.status !== "DELETED"); if (!project || !this.canAccess(user, id)) throw new NotFoundException("项目不存在或无权限"); return project; }

  dashboard(user: User) { const projects = this.visibleProjects(user); const projectIds = new Set(projects.map(p => p.id)); const progress = this.progress.filter(p => projectIds.has(p.projectId)); return { metrics: { activeProjects: projects.filter(p => p.status === "ACTIVE").length, todayActions: progress.length, riskProjects: projects.filter(p => p.risk !== "low").length, pendingFiles: this.files.filter(f => projectIds.has(f.projectId) && !f.deleted).length }, gantt: this.tasks.filter(t => projectIds.has(t.projectId)), myProgress: progress.filter(p => p.userId === user.id) }; }
  listProjects(user: User, filter?: string) {
    let projects = this.visibleProjects(user);
    if (filter === "mine") projects = projects.filter(p => p.ownerId === user.id);
    else if (filter === "risk") projects = projects.filter(p => p.risk !== "low");
    else if (filter === "pending_acceptance") projects = projects.filter(p => p.acceptanceStatus === "pending" || p.acceptanceStatus === "in_review");
    else if (filter === "archived") projects = projects.filter(p => p.status === "ARCHIVED");
    else projects = projects.filter(p => p.status === "ACTIVE"); // default: active only
    return { projects: projects.map(p => ({ ...p, memberCount: this.members.filter(m => m.projectId === p.id).length, taskCount: this.tasks.filter(t => t.projectId === p.id && t.status !== "DELETED").length })) };
  }
  projectDetail(user: User, id: string) { const project = this.requireProject(user, id); const timeline = this.timeline.filter(t => t.projectId === id).slice(0, 30); const members = this.members.filter(m => m.projectId === id).map(m => ({ ...m, user: this.publicUser(this.users.find(u => u.id === m.userId)!) })); const stats = { tasks: this.tasks.filter(t => t.projectId === id && t.status !== "DELETED").length, progress: this.progress.filter(p => p.projectId === id).length, files: this.files.filter(f => f.projectId === id && !f.deleted).length, acceptance: this.acceptanceItems.filter(a => a.projectId === id).length }; return { project, members, timeline, stats }; }
  createProject(user: User, body: any) { const project: Project = { id: this.id("p"), name: body.name || "新项目", group: body.group || "默认分组", ownerId: user.id, status: "ACTIVE", progress: 0, risk: "low", start: body.start || this.today(), baselineEnd: body.baselineEnd || this.today(), currentEnd: body.currentEnd || body.baselineEnd || this.today(), description: body.description || "", settings: {}, acceptanceStatus: "pending" }; this.projects.unshift(project); this.members.push({ id: this.id("pm"), projectId: project.id, userId: user.id, role: "owner" }); this.addTimeline(project.id, "project.created", user, `创建项目：${project.name}`); this.markDirty(); return { project }; }
  updateProject(user: User, id: string, body: any) { const project = this.requireProject(user, id); if (!this.canManage(user, id)) throw new ForbiddenException("无项目管理权限"); Object.assign(project, body); this.addTimeline(id, "project.updated", user, `更新项目：${project.name}`); this.markDirty(); return { project }; }
  archiveProject(user: User, id: string) { const project = this.requireProject(user, id); if (!this.canManage(user, id)) throw new ForbiddenException("无项目归档权限"); project.status = "ARCHIVED"; this.addTimeline(id, "project.archived", user, `归档项目：${project.name}`, "purple"); this.markDirty(); return { project }; }
  restoreProject(user: User, id: string) { const project = this.projects.find(p => p.id === id); if (!project || !this.canAccess(user, id)) throw new NotFoundException("项目不存在或无权限"); if (!this.canManage(user, id)) throw new ForbiddenException("无项目恢复权限"); project.status = "ACTIVE"; this.addTimeline(id, "project.restored", user, `恢复项目：${project.name}`, "green"); this.markDirty(); return { project }; }
  settings(user: User, id: string, body: any) { const project = this.requireProject(user, id); if (!this.canManage(user, id)) throw new ForbiddenException("无项目设置权限"); project.settings = { ...project.settings, ...body }; this.markDirty(); return { project }; }
  membersOf(user: User, id: string) { this.requireProject(user, id); return { members: this.members.filter(m => m.projectId === id).map(m => ({ ...m, user: this.publicUser(this.users.find(u => u.id === m.userId)!) })) }; }
  invite(user: User, id: string, body: any) { this.requireProject(user, id); if (!this.canManage(user, id)) throw new ForbiddenException("无邀请成员权限"); const target = this.users.find(u => u.id === body.userId || u.username === body.username); if (!target) throw new NotFoundException("用户不存在"); let member = this.members.find(m => m.projectId === id && m.userId === target.id); if (member) member.role = body.role || member.role; else { member = { id: this.id("pm"), projectId: id, userId: target.id, role: body.role || "editor" }; this.members.push(member); } this.markDirty(); return { member }; }

  tasksOf(user: User, projectId: string) { this.requireProject(user, projectId); return { tasks: this.tasks.filter(t => t.projectId === projectId && t.status !== "DELETED").map(t => ({ ...t, progressItems: this.progress.filter(p => p.taskId === t.id) })) }; }
  createTask(user: User, projectId: string, body: any) { this.requireProject(user, projectId); if (!this.canEdit(user, projectId)) throw new ForbiddenException("无任务创建权限"); const task: Task = { id: this.id("t"), projectId, title: body.title || "未命名任务", status: body.status || "TODO", priority: body.priority || "medium", baselineStart: body.baselineStart || this.today(), baselineEnd: body.baselineEnd || this.today(), currentStart: body.currentStart || body.baselineStart || this.today(), currentEnd: body.currentEnd || body.baselineEnd || this.today(), dependencyIds: body.dependencyIds || [], note: body.note || "" }; this.tasks.unshift(task); const progressItems = (body.assignments || body.progressItems || []).map((a: any) => { const item: Progress = { id: this.id("tp"), taskId: task.id, projectId, userId: a.userId, status: "TODO", planStart: a.planStart || task.baselineStart, planEnd: a.planEnd || task.baselineEnd, currentEnd: a.currentEnd || task.currentEnd, actualStart: null, actualEnd: null, deltaDays: null, progress: 0, note: a.note || "" }; this.progress.push(item); return item; }); this.addTimeline(projectId, "task.created", user, `创建任务：${task.title}`); this.markDirty(); return { task, progressItems, assignments: progressItems }; }
  updateProgress(user: User, id: string, body: any, action = "updated") { const item = this.progress.find(p => p.id === id && p.status !== "DELETED"); if (!item || !this.canAccess(user, item.projectId)) throw new NotFoundException("成员进度不存在或无权限"); if (!(this.isAdmin(user) || item.userId === user.id || this.canManage(user, item.projectId))) throw new ForbiddenException("无成员进度更新权限"); Object.assign(item, body); if (action === "complete") { item.status = "COMPLETED"; item.actualEnd = this.today(); item.deltaDays = Math.round((Date.parse(`${item.actualEnd}T00:00:00Z`) - Date.parse(`${item.planEnd}T00:00:00Z`)) / 86400000); } this.addTimeline(item.projectId, `task.progress_${action}`, user, `成员进度${action}：${item.id}`); this.addNotification(`task.progress_${action}`, item.projectId, user, `成员进度${action}：${item.id}`); this.markDirty(); return { progress: item, assignment: item }; }
  submit(user: User, progressId: string, body: any) { const item = this.progress.find(p => p.id === progressId); if (!item || item.userId !== user.id) throw new ForbiddenException("只能提交自己的任务成果"); const sub = { id: this.id("sub"), projectId: item.projectId, taskId: item.taskId, progressId: item.id, userId: user.id, name: body.name || "未命名提交物", fileType: body.fileType || "attachment", content: body.content || "", status: "SUBMITTED", note: body.note || "", deleted: false, createdAt: new Date().toISOString() }; this.submissions.unshift(sub); this.files.unshift({ id: this.id("f"), projectId: item.projectId, name: sub.name, type: "SUBMISSION", folder: "任务提交", content: sub.content, version: 1, ownerId: user.id, deleted: false }); this.markDirty(); return { submission: sub }; }

  filesOf(user: User, projectId: string) { this.requireProject(user, projectId); return { files: this.files.filter(f => f.projectId === projectId && !f.deleted) }; }
  createFile(user: User, projectId: string, body: any) { this.requireProject(user, projectId); if (!this.canEdit(user, projectId)) throw new ForbiddenException("无文件创建权限"); const file: FileItem = { id: this.id("f"), projectId, name: body.name || "未命名文件", type: body.type || "WORD_DOC", folder: body.folder || "项目资料", content: typeof body.content === "string" ? body.content : JSON.stringify(body.content || ""), version: 1, ownerId: user.id, deleted: false }; this.files.unshift(file); this.fileVersions.unshift({ id: this.id("fv"), fileId: file.id, version: 1, content: file.content, kind: "created" }); this.markDirty(); return { file }; }
  file(user: User, id: string) { const file = this.files.find(f => f.id === id); if (!file || !this.canAccess(user, file.projectId)) throw new NotFoundException("文件不存在或无权限"); return { file, versions: this.fileVersions.filter(v => v.fileId === id) }; }
  updateFile(user: User, id: string, body: any) { const file = this.file(user, id).file; if (!this.canEdit(user, file.projectId)) throw new ForbiddenException("无文件编辑权限"); if (body.content !== undefined) { file.content = typeof body.content === "string" ? body.content : JSON.stringify(body.content); file.version += 1; this.fileVersions.unshift({ id: this.id("fv"), fileId: file.id, version: file.version, content: file.content, kind: body.kind || "updated" }); } Object.assign(file, Object.fromEntries(Object.entries(body).filter(([k]) => !["content", "kind"].includes(k)))); this.markDirty(); return { file }; }
  fileJob(user: User, id: string, type: "import" | "export", body: any) { const file = this.file(user, id).file; if (type === "import") this.updateFile(user, id, { content: body.content || file.content, kind: "imported" }); const job = { id: this.id("job"), type, projectId: file.projectId, fileId: id, status: "completed", requestedBy: user.id, payload: { format: body.format || "markdown", content: file.content }, createdAt: new Date().toISOString(), finishedAt: new Date().toISOString() }; this.jobs.unshift(job); this.markDirty(); return { job, export: type === "export" ? { fileId: id, name: file.name, format: job.payload.format, content: file.content } : undefined, file }; }

  acceptance(user: User, projectId: string) { this.requireProject(user, projectId); return { items: this.acceptanceItems.filter(i => i.projectId === projectId), reports: this.acceptanceReports.filter(r => r.projectId === projectId) }; }
  startAcceptance(user: User, projectId: string) { const project = this.requireProject(user, projectId); if (!this.canManage(user, projectId)) throw new ForbiddenException("无启动验收权限"); project.acceptanceStatus = "in_review"; this.markDirty(); return { project }; }
  approveAcceptance(user: User, projectId: string) { const project = this.requireProject(user, projectId); if (!this.canManage(user, projectId)) throw new ForbiddenException("无验收审批权限"); project.acceptanceStatus = "approved"; const frozenFiles = this.files.filter(f => f.projectId === projectId && !f.deleted).map(f => { f.frozenVersion = f.version; return { id: f.id, version: f.version }; }); this.markDirty(); return { project, frozenFiles }; }
  report(user: User, projectId: string, body: any) { this.requireProject(user, projectId); if (!this.canManage(user, projectId)) throw new ForbiddenException("无验收报告权限"); const report = { id: this.id("ar"), projectId, generatedBy: user.id, note: body.note || "", memberStats: this.members.filter(m => m.projectId === projectId).map(m => ({ userId: m.userId, totalAssignments: this.progress.filter(p => p.projectId === projectId && p.userId === m.userId).length })), createdAt: new Date().toISOString() }; this.acceptanceReports.unshift(report); this.markDirty(); return { report }; }

  admin(user: User) { if (!this.isAdmin(user)) throw new ForbiddenException("需要管理员权限"); }
  health(user: User) {
    this.admin(user);
    const cpuCores = cpus();
    const load = loadavg();
    const cpuUsage = Math.round((load[0] / cpuCores.length) * 100);
    const totalMem = totalmem();
    const freeMem = freemem();
    const usedMem = totalMem - freeMem;
    const memPercent = Math.round((usedMem / totalMem) * 100);
    const up = uptime();
    const activeSessions = this.sessions.filter(s => !s.revoked).length;
    const queuedJobs = this.jobs.filter(j => j.status === "queued").length;
    const completedJobs = this.jobs.filter(j => j.status === "completed").length;
    const totalUsers = this.users.length;
    const enabledUsers = this.users.filter(u => u.enabled).length;
    const totalProjects = this.projects.filter(p => p.status !== "DELETED").length;
    const totalTasks = this.tasks.filter(t => t.status !== "DELETED").length;
    const totalFiles = this.files.filter(f => !f.deleted).length;

    return {
      system: {
        cpu: { model: cpuCores[0]?.model || "Unknown", cores: cpuCores.length, usage: cpuUsage, load1m: Math.round(load[0] * 100) / 100, load5m: Math.round(load[1] * 100) / 100, status: cpuUsage > 80 ? "warn" : cpuUsage > 60 ? "watch" : "ok" },
        memory: { total: totalMem, used: usedMem, free: freeMem, percent: memPercent, totalGB: Math.round(totalMem / 1073741824 * 10) / 10, usedGB: Math.round(usedMem / 1073741824 * 10) / 10, status: memPercent > 80 ? "warn" : memPercent > 60 ? "watch" : "ok" },
        uptime: { seconds: up, formatted: `${Math.floor(up / 86400)}d ${Math.floor((up % 86400) / 3600)}h ${Math.floor((up % 3600) / 60)}m` },
        platform: process.platform,
        nodeVersion: process.version,
        pid: process.pid
      },
      services: {
        postgresql: { status: "simulated", latency: Math.round(Math.random() * 15 + 3), note: "等待 PostgreSQL 部署" },
        redis: { status: "simulated", latency: Math.round(Math.random() * 5 + 1), note: "队列使用内存实现" },
        websocket: { connections: activeSessions, status: "ok" },
        worker: { queued: queuedJobs, completed: completedJobs, status: queuedJobs > 10 ? "busy" : "idle" }
      },
      storage: {
        dataFile: { sizeBytes: existsSync(DATA_FILE) ? Math.round((readFileSync(DATA_FILE).length || 0)) : 0 },
        dataDir: DATA_DIR
      },
      business: {
        users: { total: totalUsers, enabled: enabledUsers },
        projects: totalProjects,
        tasks: totalTasks,
        files: totalFiles,
        sessions: activeSessions
      },
      lowResourceMode: true,
      generatedAt: new Date().toISOString()
    };
  }
  adminUsers(user: User) { this.admin(user); return { users: this.users.map(u => this.publicUser(u)) }; }
  createUser(user: User, body: any) { this.admin(user); const created: User = { id: this.id("u"), username: body.username, passwordHash: bcrypt.hashSync(body.password || "123456", 10), name: body.name || body.username, role: body.role === "SUPER_ADMIN" ? "SUPER_ADMIN" : "MEMBER", enabled: body.enabled !== false, avatar: body.avatar || body.username?.[0] || "U", theme: "letter" }; this.users.push(created); this.markDirty(); return { user: this.publicUser(created) }; }
  notif() { return { rules: this.notificationRules, logs: this.notificationLogs, channels: this.channels, keys: this.keys.map(k => ({ id: k.id, name: k.name, channelId: k.channelId, type: k.type, enabled: k.enabled, secretMasked: k.secretMasked })) }; }
  createRule(user: User, body: any) { this.admin(user); const rule = { id: this.id("nr"), event: body.event, channel: body.channel || "feishu", targetMode: body.targetMode || "creator", targets: body.targets || [], enabled: body.enabled !== false }; this.notificationRules.unshift(rule); this.markDirty(); return { rule }; }
  createChannel(user: User, body: any) { this.admin(user); const channel = { id: this.id("nc"), name: body.name || "未命名渠道", type: body.type || "feishu", enabled: body.enabled !== false, config: body.config || {} }; this.channels.unshift(channel); this.markDirty(); return { channel }; }
  createKey(user: User, body: any) { this.admin(user); const key = { id: this.id("nk"), name: body.name || "未命名密钥", channelId: body.channelId || "", type: body.type || "webhook", secretEncrypted: this.hash(body.secret || ""), secretMasked: this.mask(body.secret || ""), enabled: body.enabled !== false }; this.keys.unshift(key); this.markDirty(); return { key: { id: key.id, name: key.name, channelId: key.channelId, type: key.type, enabled: key.enabled, secretMasked: key.secretMasked } }; }
  retry(user: User, id: string) { this.admin(user); const log = this.notificationLogs.find(l => l.id === id); if (!log) throw new NotFoundException("通知日志不存在"); log.status = "queued"; log.retryCount = (log.retryCount || 0) + 1; this.markDirty(); return { log }; }
  roles(user: User) { this.admin(user); return { roles: this.roleTemplates, scopes: this.permissionScopes, matrix: this.getPermissionMatrix() }; }
  createRole(user: User, body: any) { this.admin(user); const role = { id: this.id("rt"), name: body.name, role: body.role || "custom", builtin: false, permissions: body.permissions || [] }; this.roleTemplates.unshift(role); this.markDirty(); return { role }; }
  copyRoleTemplate(user: User, roleId: string) { this.admin(user); const src = this.roleTemplates.find(r => r.id === roleId); if (!src) throw new NotFoundException("角色模板不存在"); const copy = { ...src, id: this.id("rt"), name: `${src.name} (副本)`, builtin: false }; this.roleTemplates.unshift(copy); this.markDirty(); return { role: copy }; }
  deleteRoleTemplate(user: User, roleId: string) { this.admin(user); const role = this.roleTemplates.find(r => r.id === roleId); if (!role) throw new NotFoundException("角色模板不存在"); if (role.builtin) throw new ForbiddenException("内置角色不可删除，只能复制后修改"); this.roleTemplates = this.roleTemplates.filter(r => r.id !== roleId); this.markDirty(); return { ok: true }; }
  updateRolePermissions(user: User, roleId: string, body: any) { this.admin(user); const role = this.roleTemplates.find(r => r.id === roleId); if (!role) throw new NotFoundException("角色模板不存在"); role.permissions = body.permissions || role.permissions; if (body.name) role.name = body.name; this.addAudit("permission.role_updated", user.id, `更新角色模板：${role.name}`); this.markDirty(); return { role }; }
  createScope(user: User, body: any) { this.admin(user); const scope = { id: this.id("ps"), key: body.key, name: body.name || body.key, description: body.description || "", target: body.target || "project", enabled: body.enabled !== false }; this.permissionScopes.unshift(scope); this.markDirty(); return { scope }; }
  updateScope(user: User, scopeId: string, body: any) { this.admin(user); const scope = this.permissionScopes.find(s => s.id === scopeId); if (!scope) throw new NotFoundException("权限范围不存在"); Object.assign(scope, body); this.addAudit("permission.scope_updated", user.id, `更新权限范围：${scope.name}`); this.markDirty(); return { scope }; }
  deleteScope(user: User, scopeId: string) { this.admin(user); const scope = this.permissionScopes.find(s => s.id === scopeId); if (!scope) throw new NotFoundException("权限范围不存在"); this.permissionScopes = this.permissionScopes.filter(s => s.id !== scopeId); this.markDirty(); return { ok: true }; }
  getPermissionMatrix() { return this.roleTemplates.map(r => ({ roleId: r.id, roleName: r.name, role: r.role, builtin: r.builtin, scopes: this.permissionScopes.map(s => ({ key: s.key, name: s.name, granted: (r.permissions as string[]).includes(s.key) })) })); }
  auditLogs(user: User) { this.admin(user); return { logs: this.audit }; }
  realtime(user: User) { return { status: { onlineUsers: this.sessions.filter(s => !s.revoked).length, activeProjects: this.visibleProjects(user).length, lowResourceMode: true } }; }
  collabEvent(user: User, body: any) { this.requireProject(user, body.projectId); const event = { id: this.id("rt"), projectId: body.projectId, fileId: body.fileId, type: body.type || "patch", actorId: user.id, actorName: user.name, payload: body.payload || {}, createdAt: new Date().toISOString() }; this.collab.unshift(event); this.markDirty(); return { event }; }
  memberGantt(user: User) { const projectIds = new Set(this.visibleProjects(user).map(p => p.id)); return { assignments: this.progress.filter(p => projectIds.has(p.projectId)) }; }
  ganttViewsFor(user: User) { return { views: this.ganttViews.filter(v => v.userId === user.id) }; }
  saveGanttView(user: User, body: any) { const view = { id: body.id || this.id("gv"), userId: user.id, name: body.name || "默认视图", filters: body.filters || {}, columns: body.columns || [], zoom: body.zoom || "week" }; this.ganttViews.unshift(view); this.markDirty(); return { view }; }

  // --- Task CRUD ---
  getTask(user: User, taskId: string) { const task = this.tasks.find(t => t.id === taskId && t.status !== "DELETED"); if (!task || !this.canAccess(user, task.projectId)) throw new NotFoundException("任务不存在或无权限"); return { task: { ...task, progressItems: this.progress.filter(p => p.taskId === task.id), submissions: this.submissions.filter(s => (s as any).taskId === task.id && !s.deleted) } }; }
  updateTask(user: User, taskId: string, body: any) { const task = this.tasks.find(t => t.id === taskId); if (!task || !this.canAccess(user, task.projectId)) throw new NotFoundException("任务不存在或无权限"); if (!this.canEdit(user, task.projectId)) throw new ForbiddenException("无任务编辑权限"); Object.assign(task, body); this.addTimeline(task.projectId, "task.updated", user, `更新任务：${task.title}`); this.markDirty(); return { task }; }
  deleteTask(user: User, taskId: string) { const task = this.tasks.find(t => t.id === taskId); if (!task || !this.canAccess(user, task.projectId)) throw new NotFoundException("任务不存在或无权限"); if (!this.canEdit(user, task.projectId)) throw new ForbiddenException("无任务删除权限"); task.status = "DELETED"; this.addTimeline(task.projectId, "task.deleted", user, `删除任务：${task.title}`); this.markDirty(); return { task }; }
  copyTask(user: User, taskId: string) { const src = this.tasks.find(t => t.id === taskId); if (!src || !this.canAccess(user, src.projectId)) throw new NotFoundException("任务不存在或无权限"); const copy: Task = { ...src, id: this.id("t"), title: `${src.title} (副本)`, status: "TODO", dependencyIds: [...src.dependencyIds] }; this.tasks.unshift(copy); this.addTimeline(copy.projectId, "task.copied", user, `复制任务：${src.title} → ${copy.title}`); this.markDirty(); return { task: copy }; }
  archiveTask(user: User, taskId: string) { const task = this.tasks.find(t => t.id === taskId); if (!task || !this.canAccess(user, task.projectId)) throw new NotFoundException("任务不存在或无权限"); if (!this.canEdit(user, task.projectId)) throw new ForbiddenException("无任务归档权限"); task.status = "ARCHIVED"; this.addTimeline(task.projectId, "task.archived", user, `归档任务：${task.title}`); this.markDirty(); return { task }; }
  restoreTask(user: User, taskId: string) { const task = this.tasks.find(t => t.id === taskId); if (!task || !this.canAccess(user, task.projectId)) throw new NotFoundException("任务不存在或无权限"); if (!this.canEdit(user, task.projectId)) throw new ForbiddenException("无任务恢复权限"); task.status = "TODO"; this.addTimeline(task.projectId, "task.restored", user, `恢复任务：${task.title}`); this.markDirty(); return { task }; }

  // --- User profile ---
  updateProfile(user: User, body: any) { if (body.name !== undefined) user.name = body.name; if (body.signature !== undefined) user.signature = body.signature; if (body.avatar !== undefined) user.avatar = body.avatar; if (body.theme !== undefined) user.theme = body.theme; if (body.customWallpaper !== undefined) user.customWallpaper = body.customWallpaper; if (body.customBlur !== undefined) user.customBlur = body.customBlur; this.markDirty(); return { user: this.publicUser(user) }; }
  changePassword(user: User, body: any) { if (!bcrypt.compareSync(String(body.currentPassword || ""), user.passwordHash)) throw new ForbiddenException("当前密码错误"); user.passwordHash = bcrypt.hashSync(String(body.newPassword || "123456"), 10); this.markDirty(); return { ok: true }; }

  // --- Member management ---
  updateMember(user: User, projectId: string, memberId: string, body: any) { this.requireProject(user, projectId); if (!this.canManage(user, projectId)) throw new ForbiddenException("无成员管理权限"); const member = this.members.find(m => m.id === memberId && m.projectId === projectId); if (!member) throw new NotFoundException("成员不存在"); member.role = body.role || member.role; this.addTimeline(projectId, "member.role_changed", user, `修改成员角色：${member.userId}`); this.markDirty(); return { member }; }
  removeMember(user: User, projectId: string, memberId: string) { this.requireProject(user, projectId); if (!this.canManage(user, projectId)) throw new ForbiddenException("无成员移除权限"); const member = this.members.find(m => m.id === memberId && m.projectId === projectId); if (!member) throw new NotFoundException("成员不存在"); this.members = this.members.filter(m => m.id !== memberId); this.addTimeline(projectId, "member.removed", user, `移除成员：${member.userId}`); this.markDirty(); return { ok: true }; }

  // --- IP whitelist ---
  addIpEntry(user: User, body: any) { this.admin(user); const entry = { id: this.id("ip"), userId: body.userId, value: body.value, note: body.note || "", enabled: body.enabled !== false, createdBy: user.id, createdAt: new Date().toISOString() }; this.ipEntries.unshift(entry); this.markDirty(); return { entry }; }
  removeIpEntry(user: User, entryId: string) { this.admin(user); this.ipEntries = this.ipEntries.filter(e => e.id !== entryId); this.markDirty(); return { ok: true }; }
  toggleIpPolicy(user: User, body: any) { this.admin(user); let policy = this.ipPolicies.find(p => p.userId === body.userId); if (!policy) { policy = { userId: body.userId, enabled: body.enabled !== false }; this.ipPolicies.push(policy); } else { policy.enabled = body.enabled !== false; } this.markDirty(); return { policy }; }
  listIpEntries(user: User, targetUserId?: string) { this.admin(user); return { entries: this.ipEntries.filter(e => !targetUserId || e.userId === targetUserId), policies: this.ipPolicies }; }

  // --- User management (admin) ---
  updateUser(user: User, targetUserId: string, body: any) { this.admin(user); const target = this.users.find(u => u.id === targetUserId); if (!target) throw new NotFoundException("用户不存在"); if (body.name !== undefined) target.name = body.name; if (body.enabled !== undefined) target.enabled = body.enabled; if (body.username !== undefined) target.username = body.username; this.markDirty(); return { user: this.publicUser(target) }; }
  changeUserRole(user: User, targetUserId: string, body: any) { this.admin(user); const target = this.users.find(u => u.id === targetUserId); if (!target) throw new NotFoundException("用户不存在"); const newRole = body.role; if (!newRole || !["SUPER_ADMIN", "MEMBER"].includes(newRole)) throw new ForbiddenException("无效角色"); if (newRole === target.role) return { user: this.publicUser(target) }; if (newRole === "SUPER_ADMIN") { const existing = this.users.find(u => u.id !== targetUserId && u.role === "SUPER_ADMIN" && u.enabled); if (existing) throw new ForbiddenException("只能有一个超级管理员，当前超级管理员：" + existing.name); } if (target.role === "SUPER_ADMIN" && newRole !== "SUPER_ADMIN") { const otherAdmin = this.users.find(u => u.id !== targetUserId && u.role === "SUPER_ADMIN" && u.enabled); if (!otherAdmin) throw new ForbiddenException("至少需要保留一个超级管理员"); } target.role = newRole; this.addAudit("admin.role_changed", user.id, `修改用户 ${target.name} 角色为 ${newRole}`); this.markDirty(); return { user: this.publicUser(target) }; }
  resetUserPassword(user: User, targetUserId: string, body: any) { this.admin(user); const target = this.users.find(u => u.id === targetUserId); if (!target) throw new NotFoundException("用户不存在"); target.passwordHash = bcrypt.hashSync(String(body.password || "123456"), 10); this.markDirty(); return { ok: true }; }
  userSessions(user: User, targetUserId: string) { this.admin(user); return { sessions: this.sessions.filter(s => s.userId === targetUserId).map(s => ({ id: s.id, userId: s.userId, ip: s.ip, lastActivityAt: s.lastActivityAt, revoked: s.revoked, revokedReason: s.revokedReason })) }; }
  revokeSession(user: User, sessionId: string) { this.admin(user); const session = this.sessions.find(s => s.id === sessionId); if (!session) throw new NotFoundException("会话不存在"); session.revoked = true; session.revokedReason = "admin_revoked"; this.markDirty(); return { ok: true }; }
  userProjects(user: User, targetUserId: string) { this.admin(user); const memberProjects = this.members.filter(m => m.userId === targetUserId).map(m => { const p = this.projects.find(pr => pr.id === m.projectId); return { memberId: m.id, projectId: m.projectId, projectName: p?.name || "未知项目", group: p?.group || "", role: m.role }; }); return { projects: memberProjects, allProjects: this.projects.filter(p => p.status !== "DELETED").map(p => ({ id: p.id, name: p.name, group: p.group })) }; }
  assignProject(user: User, targetUserId: string, body: any) { this.admin(user); const target = this.users.find(u => u.id === targetUserId); if (!target) throw new NotFoundException("用户不存在"); const projectId = body.projectId; const role = body.role || "editor"; const existing = this.members.find(m => m.projectId === projectId && m.userId === targetUserId); if (existing) { existing.role = role; this.markDirty(); return { member: existing }; } const member = { id: this.id("pm"), projectId, userId: targetUserId, role }; this.members.push(member); this.addTimeline(projectId, "member.invited", user, `分配用户 ${target.name} 到项目`, "green"); this.markDirty(); return { member }; }
  removeProject(user: User, targetUserId: string, projectId: string) { this.admin(user); this.members = this.members.filter(m => !(m.projectId === projectId && m.userId === targetUserId)); this.markDirty(); return { ok: true }; }

  // --- Acceptance items CRUD ---
  createAcceptanceItem(user: User, projectId: string, body: any) { this.requireProject(user, projectId); if (!this.canManage(user, projectId)) throw new ForbiddenException("无验收管理权限"); const item = { id: this.id("acc"), projectId, title: body.title || "未命名验收项", status: body.status || "PENDING", note: body.note || "" }; this.acceptanceItems.unshift(item); this.markDirty(); return { item }; }
  updateAcceptanceItem(user: User, itemId: string, body: any) { const item = this.acceptanceItems.find(i => i.id === itemId); if (!item) throw new NotFoundException("验收项不存在"); if (!this.canManage(user, item.projectId)) throw new ForbiddenException("无验收管理权限"); Object.assign(item, body); this.markDirty(); return { item }; }
  deleteAcceptanceItem(user: User, itemId: string) { const item = this.acceptanceItems.find(i => i.id === itemId); if (!item) throw new NotFoundException("验收项不存在"); if (!this.canManage(user, item.projectId)) throw new ForbiddenException("无验收管理权限"); this.acceptanceItems = this.acceptanceItems.filter(i => i.id !== itemId); this.markDirty(); return { ok: true }; }

  // --- Notification management ---
  updateRule(user: User, ruleId: string, body: any) { this.admin(user); const rule = this.notificationRules.find(r => r.id === ruleId); if (!rule) throw new NotFoundException("通知规则不存在"); Object.assign(rule, body); this.markDirty(); return { rule }; }
  deleteRule(user: User, ruleId: string) { this.admin(user); this.notificationRules = this.notificationRules.filter(r => r.id !== ruleId); this.markDirty(); return { ok: true }; }
  toggleRule(user: User, ruleId: string) { this.admin(user); const rule = this.notificationRules.find(r => r.id === ruleId); if (!rule) throw new NotFoundException("通知规则不存在"); rule.enabled = !rule.enabled; this.markDirty(); return { rule }; }
  updateChannel(user: User, channelId: string, body: any) { this.admin(user); const channel = this.channels.find(c => c.id === channelId); if (!channel) throw new NotFoundException("渠道不存在"); Object.assign(channel, body); this.markDirty(); return { channel }; }
  deleteChannel(user: User, channelId: string) { this.admin(user); this.channels = this.channels.filter(c => c.id !== channelId); this.markDirty(); return { ok: true }; }
  updateKey(user: User, keyId: string, body: any) { this.admin(user); const key = this.keys.find(k => k.id === keyId); if (!key) throw new NotFoundException("通知 Key 不存在"); if (body.secret) { key.secretEncrypted = this.hash(body.secret); key.secretMasked = this.mask(body.secret); } if (body.name !== undefined) key.name = body.name; if (body.enabled !== undefined) key.enabled = body.enabled; this.markDirty(); return { key: { id: key.id, name: key.name, channelId: key.channelId, type: key.type, enabled: key.enabled, secretMasked: key.secretMasked } }; }
  deleteKey(user: User, keyId: string) { this.admin(user); this.keys = this.keys.filter(k => k.id !== keyId); this.markDirty(); return { ok: true }; }
  testNotification(user: User, body: any) { this.admin(user); const log = { id: this.id("nl"), ruleId: body.ruleId, event: body.event || "test", projectId: "", channel: body.channel || "feishu", targetMode: "creator", targets: [], status: "sent", message: body.message || "测试消息", retryCount: 0, createdAt: new Date().toISOString() }; this.notificationLogs.unshift(log); this.markDirty(); return { log }; }

  // --- Search ---
  search(user: User, q: string) { const query = (q || "").toLowerCase(); const projectIds = new Set(this.visibleProjects(user).map(p => p.id)); return { projects: this.projects.filter(p => projectIds.has(p.id) && (p.name.toLowerCase().includes(query) || p.group.toLowerCase().includes(query))).slice(0, 10), tasks: this.tasks.filter(t => projectIds.has(t.projectId) && t.title.toLowerCase().includes(query)).slice(0, 20), files: this.files.filter(f => projectIds.has(f.projectId) && !f.deleted && f.name.toLowerCase().includes(query)).slice(0, 10), members: this.users.filter(u => u.name.toLowerCase().includes(query) || u.username.toLowerCase().includes(query)).slice(0, 10).map(u => this.publicUser(u)) }; }
}
