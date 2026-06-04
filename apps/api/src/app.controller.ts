import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Put, Query, Req, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname } from "node:path";
import { AppService } from "./app.service.js";

@Controller()
export class AppController {
  constructor(private readonly app: AppService) {}

  private ip(req: any) {
    const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
    return String(req.headers["x-test-ip"] || req.headers["x-real-ip"] || forwarded || req.socket?.remoteAddress || "127.0.0.1").replace(/^::ffff:/, "");
  }

  private current(authorization: string | undefined, req: any) {
    return this.app.auth(authorization, this.ip(req)).user;
  }

  @Post("auth/login")
  login(@Body() body: any, @Req() req: any) {
    return this.app.login(body, this.ip(req));
  }

  @Get("dashboard")
  dashboard(@Headers("authorization") auth: string, @Req() req: any) {
    return this.app.dashboard(this.current(auth, req));
  }

  @Get("dashboard/member-gantt")
  memberGantt(@Headers("authorization") auth: string, @Req() req: any) {
    return this.app.memberGantt(this.current(auth, req));
  }

  @Get("dashboard/gantt/views")
  ganttViews(@Headers("authorization") auth: string, @Req() req: any) {
    return this.app.ganttViewsFor(this.current(auth, req));
  }

  @Patch("dashboard/gantt/views")
  saveGanttView(@Headers("authorization") auth: string, @Req() req: any, @Body() body: any) {
    return this.app.saveGanttView(this.current(auth, req), body);
  }

  @Get("projects")
  projects(@Headers("authorization") auth: string, @Req() req: any, @Query("filter") filter?: string, @Query("group") group?: string) {
    return this.app.listProjects(this.current(auth, req), filter, group);
  }

  @Post("projects")
  createProject(@Headers("authorization") auth: string, @Req() req: any, @Body() body: any) {
    return this.app.createProject(this.current(auth, req), body);
  }

  @Get("projects/:projectId")
  project(@Headers("authorization") auth: string, @Req() req: any, @Param("projectId") projectId: string) {
    return this.app.projectDetail(this.current(auth, req), projectId);
  }

  @Patch("projects/:projectId")
  updateProject(@Headers("authorization") auth: string, @Req() req: any, @Param("projectId") projectId: string, @Body() body: any) {
    return this.app.updateProject(this.current(auth, req), projectId, body);
  }

  @Post("projects/:projectId/archive")
  archiveProject(@Headers("authorization") auth: string, @Req() req: any, @Param("projectId") projectId: string) {
    return this.app.archiveProject(this.current(auth, req), projectId);
  }

  @Post("projects/:projectId/restore")
  restoreProject(@Headers("authorization") auth: string, @Req() req: any, @Param("projectId") projectId: string) {
    return this.app.restoreProject(this.current(auth, req), projectId);
  }

  @Patch("projects/:projectId/settings")
  settings(@Headers("authorization") auth: string, @Req() req: any, @Param("projectId") projectId: string, @Body() body: any) {
    return this.app.settings(this.current(auth, req), projectId, body);
  }

  @Get("projects/:projectId/members")
  members(@Headers("authorization") auth: string, @Req() req: any, @Param("projectId") projectId: string) {
    return this.app.membersOf(this.current(auth, req), projectId);
  }

  @Post("projects/:projectId/members")
  invite(@Headers("authorization") auth: string, @Req() req: any, @Param("projectId") projectId: string, @Body() body: any) {
    return this.app.invite(this.current(auth, req), projectId, body);
  }

  @Get("projects/:projectId/tasks")
  tasks(@Headers("authorization") auth: string, @Req() req: any, @Param("projectId") projectId: string) {
    return this.app.tasksOf(this.current(auth, req), projectId);
  }

  @Post("projects/:projectId/tasks")
  createTask(@Headers("authorization") auth: string, @Req() req: any, @Param("projectId") projectId: string, @Body() body: any) {
    return this.app.createTask(this.current(auth, req), projectId, body);
  }

  @Patch("task-progress/:progressId")
  updateProgress(@Headers("authorization") auth: string, @Req() req: any, @Param("progressId") progressId: string, @Body() body: any) {
    return this.app.updateProgress(this.current(auth, req), progressId, body);
  }

  @Post("task-progress/:progressId/:action")
  progressAction(@Headers("authorization") auth: string, @Req() req: any, @Param("progressId") progressId: string, @Param("action") action: string, @Body() body: any) {
    const patchByAction: Record<string, any> = {
      complete: { progress: 100 },
      delay: { status: "DELAYED", note: body?.note || "延期" },
      block: { status: "BLOCKED", note: body?.note || "阻塞" },
      abandon: { status: "ABANDONED", note: body?.note || "放弃" },
      rest: { status: "TODO", nextAction: "rest" },
      continue: { status: "DOING", nextAction: "continue" },
      remind: { nextAction: "remind_creator" }
    };
    return this.app.updateProgress(this.current(auth, req), progressId, { ...patchByAction[action], ...body }, action);
  }

  @Post("task-progress/:progressId/submissions")
  submit(@Headers("authorization") auth: string, @Req() req: any, @Param("progressId") progressId: string, @Body() body: any) {
    return this.app.submit(this.current(auth, req), progressId, body);
  }

  @Get("projects/:projectId/files")
  files(@Headers("authorization") auth: string, @Req() req: any, @Param("projectId") projectId: string) {
    return this.app.filesOf(this.current(auth, req), projectId);
  }

  @Post("projects/:projectId/files")
  createFile(@Headers("authorization") auth: string, @Req() req: any, @Param("projectId") projectId: string, @Body() body: any) {
    return this.app.createFile(this.current(auth, req), projectId, body);
  }

  @Get("project-files/:fileId")
  file(@Headers("authorization") auth: string, @Req() req: any, @Param("fileId") fileId: string) {
    return this.app.file(this.current(auth, req), fileId);
  }

  @Patch("project-files/:fileId")
  updateFile(@Headers("authorization") auth: string, @Req() req: any, @Param("fileId") fileId: string, @Body() body: any) {
    return this.app.updateFile(this.current(auth, req), fileId, body);
  }

  @Post("project-files/:fileId/import")
  importFile(@Headers("authorization") auth: string, @Req() req: any, @Param("fileId") fileId: string, @Body() body: any) {
    return this.app.fileJob(this.current(auth, req), fileId, "import", body);
  }

  @Post("project-files/:fileId/export")
  exportFile(@Headers("authorization") auth: string, @Req() req: any, @Param("fileId") fileId: string, @Body() body: any) {
    return this.app.fileJob(this.current(auth, req), fileId, "export", body);
  }

  @Get("projects/:projectId/acceptance")
  acceptance(@Headers("authorization") auth: string, @Req() req: any, @Param("projectId") projectId: string) {
    return this.app.acceptance(this.current(auth, req), projectId);
  }

  @Post("projects/:projectId/acceptance/start")
  startAcceptance(@Headers("authorization") auth: string, @Req() req: any, @Param("projectId") projectId: string) {
    return this.app.startAcceptance(this.current(auth, req), projectId);
  }

  @Post("projects/:projectId/acceptance/approve")
  approveAcceptance(@Headers("authorization") auth: string, @Req() req: any, @Param("projectId") projectId: string) {
    return this.app.approveAcceptance(this.current(auth, req), projectId);
  }

  @Post("projects/:projectId/acceptance/report")
  acceptanceReport(@Headers("authorization") auth: string, @Req() req: any, @Param("projectId") projectId: string, @Body() body: any) {
    return this.app.report(this.current(auth, req), projectId, body);
  }

  @Get("admin/health")
  health(@Headers("authorization") auth: string, @Req() req: any) {
    return this.app.health(this.current(auth, req));
  }

  @Get("admin/users")
  adminUsers(@Headers("authorization") auth: string, @Req() req: any) {
    return this.app.adminUsers(this.current(auth, req));
  }

  @Post("admin/users")
  createUser(@Headers("authorization") auth: string, @Req() req: any, @Body() body: any) {
    return this.app.createUser(this.current(auth, req), body);
  }

  @Get("admin/notifications")
  notifications(@Headers("authorization") auth: string, @Req() req: any) {
    const user = this.current(auth, req);
    this.app.admin(user);
    return this.app.notif();
  }

  @Post("admin/notification-rules")
  createRule(@Headers("authorization") auth: string, @Req() req: any, @Body() body: any) {
    return this.app.createRule(this.current(auth, req), body);
  }

  @Post("admin/notification-channels")
  createChannel(@Headers("authorization") auth: string, @Req() req: any, @Body() body: any) {
    return this.app.createChannel(this.current(auth, req), body);
  }

  @Post("admin/notification-keys")
  createKey(@Headers("authorization") auth: string, @Req() req: any, @Body() body: any) {
    return this.app.createKey(this.current(auth, req), body);
  }

  @Post("notification-logs/:logId/retry")
  retryNotification(@Headers("authorization") auth: string, @Req() req: any, @Param("logId") logId: string) {
    return this.app.retry(this.current(auth, req), logId);
  }

  @Get("admin/roles")
  roles(@Headers("authorization") auth: string, @Req() req: any) {
    return this.app.roles(this.current(auth, req));
  }

  @Post("admin/role-templates")
  createRole(@Headers("authorization") auth: string, @Req() req: any, @Body() body: any) {
    return this.app.createRole(this.current(auth, req), body);
  }

  @Post("admin/permission-scopes")
  createScope(@Headers("authorization") auth: string, @Req() req: any, @Body() body: any) {
    return this.app.createScope(this.current(auth, req), body);
  }
  @Patch("admin/permission-scopes/:scopeId")
  updateScope(@Headers("authorization") auth: string, @Req() req: any, @Param("scopeId") scopeId: string, @Body() body: any) {
    return this.app.updateScope(this.current(auth, req), scopeId, body);
  }
  @Delete("admin/permission-scopes/:scopeId")
  deleteScope(@Headers("authorization") auth: string, @Req() req: any, @Param("scopeId") scopeId: string) {
    return this.app.deleteScope(this.current(auth, req), scopeId);
  }
  @Post("admin/role-templates/:roleId/copy")
  copyRole(@Headers("authorization") auth: string, @Req() req: any, @Param("roleId") roleId: string) {
    return this.app.copyRoleTemplate(this.current(auth, req), roleId);
  }
  @Delete("admin/role-templates/:roleId")
  deleteRole(@Headers("authorization") auth: string, @Req() req: any, @Param("roleId") roleId: string) {
    return this.app.deleteRoleTemplate(this.current(auth, req), roleId);
  }
  @Patch("admin/role-templates/:roleId")
  updateRole(@Headers("authorization") auth: string, @Req() req: any, @Param("roleId") roleId: string, @Body() body: any) {
    return this.app.updateRolePermissions(this.current(auth, req), roleId, body);
  }
  @Get("admin/permission-matrix")
  permissionMatrix(@Headers("authorization") auth: string, @Req() req: any) {
    this.app.admin(this.current(auth, req));
    return { matrix: this.app.getPermissionMatrix() };
  }

  @Get("admin/audit-logs")
  auditLogs(@Headers("authorization") auth: string, @Req() req: any) {
    return this.app.auditLogs(this.current(auth, req));
  }

  @Get("realtime/status")
  realtime(@Headers("authorization") auth: string, @Req() req: any) {
    return this.app.realtime(this.current(auth, req));
  }

  @Post("collaboration/events")
  collabEvent(@Headers("authorization") auth: string, @Req() req: any, @Body() body: any) {
    return this.app.collabEvent(this.current(auth, req), body);
  }

  // --- Task CRUD ---
  @Get("tasks/:taskId")
  getTask(@Headers("authorization") auth: string, @Req() req: any, @Param("taskId") taskId: string) {
    return this.app.getTask(this.current(auth, req), taskId);
  }
  @Patch("tasks/:taskId")
  updateTask(@Headers("authorization") auth: string, @Req() req: any, @Param("taskId") taskId: string, @Body() body: any) {
    return this.app.updateTask(this.current(auth, req), taskId, body);
  }
  @Delete("tasks/:taskId")
  deleteTask(@Headers("authorization") auth: string, @Req() req: any, @Param("taskId") taskId: string) {
    return this.app.deleteTask(this.current(auth, req), taskId);
  }
  @Post("tasks/:taskId/copy")
  copyTask(@Headers("authorization") auth: string, @Req() req: any, @Param("taskId") taskId: string) {
    return this.app.copyTask(this.current(auth, req), taskId);
  }
  @Post("tasks/:taskId/archive")
  archiveTask(@Headers("authorization") auth: string, @Req() req: any, @Param("taskId") taskId: string) {
    return this.app.archiveTask(this.current(auth, req), taskId);
  }
  @Post("tasks/:taskId/restore")
  restoreTask(@Headers("authorization") auth: string, @Req() req: any, @Param("taskId") taskId: string) {
    return this.app.restoreTask(this.current(auth, req), taskId);
  }

  // --- User profile ---
  @Patch("profile")
  updateProfile(@Headers("authorization") auth: string, @Req() req: any, @Body() body: any) {
    return this.app.updateProfile(this.current(auth, req), body);
  }
  @Patch("profile/password")
  changePassword(@Headers("authorization") auth: string, @Req() req: any, @Body() body: any) {
    return this.app.changePassword(this.current(auth, req), body);
  }

  // --- Member management ---
  @Patch("projects/:projectId/members/:memberId")
  updateMember(@Headers("authorization") auth: string, @Req() req: any, @Param("projectId") projectId: string, @Param("memberId") memberId: string, @Body() body: any) {
    return this.app.updateMember(this.current(auth, req), projectId, memberId, body);
  }
  @Delete("projects/:projectId/members/:memberId")
  removeMember(@Headers("authorization") auth: string, @Req() req: any, @Param("projectId") projectId: string, @Param("memberId") memberId: string) {
    return this.app.removeMember(this.current(auth, req), projectId, memberId);
  }

  // --- IP whitelist ---
  @Get("admin/ip-whitelist")
  listIpEntries(@Headers("authorization") auth: string, @Req() req: any, @Query("userId") userId?: string) {
    return this.app.listIpEntries(this.current(auth, req), userId);
  }
  @Post("admin/ip-whitelist")
  addIpEntry(@Headers("authorization") auth: string, @Req() req: any, @Body() body: any) {
    return this.app.addIpEntry(this.current(auth, req), body);
  }
  @Delete("admin/ip-whitelist/:entryId")
  removeIpEntry(@Headers("authorization") auth: string, @Req() req: any, @Param("entryId") entryId: string) {
    return this.app.removeIpEntry(this.current(auth, req), entryId);
  }
  @Patch("admin/ip-policy")
  toggleIpPolicy(@Headers("authorization") auth: string, @Req() req: any, @Body() body: any) {
    return this.app.toggleIpPolicy(this.current(auth, req), body);
  }

  // --- User management (admin) ---
  @Patch("admin/users/:userId")
  updateUser(@Headers("authorization") auth: string, @Req() req: any, @Param("userId") userId: string, @Body() body: any) {
    return this.app.updateUser(this.current(auth, req), userId, body);
  }
  @Post("admin/users/:userId/reset-password")
  resetUserPassword(@Headers("authorization") auth: string, @Req() req: any, @Param("userId") userId: string, @Body() body: any) {
    return this.app.resetUserPassword(this.current(auth, req), userId, body);
  }
  @Get("admin/users/:userId/sessions")
  userSessions(@Headers("authorization") auth: string, @Req() req: any, @Param("userId") userId: string) {
    return this.app.userSessions(this.current(auth, req), userId);
  }
  @Post("admin/sessions/:sessionId/revoke")
  revokeSession(@Headers("authorization") auth: string, @Req() req: any, @Param("sessionId") sessionId: string) {
    return this.app.revokeSession(this.current(auth, req), sessionId);
  }
  @Patch("admin/users/:userId/role")
  changeUserRole(@Headers("authorization") auth: string, @Req() req: any, @Param("userId") userId: string, @Body() body: any) {
    return this.app.changeUserRole(this.current(auth, req), userId, body);
  }
  @Get("admin/users/:userId/projects")
  userProjects(@Headers("authorization") auth: string, @Req() req: any, @Param("userId") userId: string) {
    return this.app.userProjects(this.current(auth, req), userId);
  }
  @Post("admin/users/:userId/projects")
  assignProject(@Headers("authorization") auth: string, @Req() req: any, @Param("userId") userId: string, @Body() body: any) {
    return this.app.assignProject(this.current(auth, req), userId, body);
  }
  @Delete("admin/users/:userId/projects/:projectId")
  removeProject(@Headers("authorization") auth: string, @Req() req: any, @Param("userId") userId: string, @Param("projectId") projectId: string) {
    return this.app.removeProject(this.current(auth, req), userId, projectId);
  }

  // --- Acceptance items CRUD ---
  @Post("projects/:projectId/acceptance-items")
  createAcceptanceItem(@Headers("authorization") auth: string, @Req() req: any, @Param("projectId") projectId: string, @Body() body: any) {
    return this.app.createAcceptanceItem(this.current(auth, req), projectId, body);
  }
  @Patch("acceptance-items/:itemId")
  updateAcceptanceItem(@Headers("authorization") auth: string, @Req() req: any, @Param("itemId") itemId: string, @Body() body: any) {
    return this.app.updateAcceptanceItem(this.current(auth, req), itemId, body);
  }
  @Delete("acceptance-items/:itemId")
  deleteAcceptanceItem(@Headers("authorization") auth: string, @Req() req: any, @Param("itemId") itemId: string) {
    return this.app.deleteAcceptanceItem(this.current(auth, req), itemId);
  }

  // --- Notification management ---
  @Patch("admin/notification-rules/:ruleId")
  updateRule(@Headers("authorization") auth: string, @Req() req: any, @Param("ruleId") ruleId: string, @Body() body: any) {
    return this.app.updateRule(this.current(auth, req), ruleId, body);
  }
  @Delete("admin/notification-rules/:ruleId")
  deleteRule(@Headers("authorization") auth: string, @Req() req: any, @Param("ruleId") ruleId: string) {
    return this.app.deleteRule(this.current(auth, req), ruleId);
  }
  @Post("admin/notification-rules/:ruleId/toggle")
  toggleRule(@Headers("authorization") auth: string, @Req() req: any, @Param("ruleId") ruleId: string) {
    return this.app.toggleRule(this.current(auth, req), ruleId);
  }
  @Patch("admin/notification-channels/:channelId")
  updateChannel(@Headers("authorization") auth: string, @Req() req: any, @Param("channelId") channelId: string, @Body() body: any) {
    return this.app.updateChannel(this.current(auth, req), channelId, body);
  }
  @Delete("admin/notification-channels/:channelId")
  deleteChannel(@Headers("authorization") auth: string, @Req() req: any, @Param("channelId") channelId: string) {
    return this.app.deleteChannel(this.current(auth, req), channelId);
  }
  @Patch("admin/notification-keys/:keyId")
  updateKey(@Headers("authorization") auth: string, @Req() req: any, @Param("keyId") keyId: string, @Body() body: any) {
    return this.app.updateKey(this.current(auth, req), keyId, body);
  }
  @Delete("admin/notification-keys/:keyId")
  deleteKey(@Headers("authorization") auth: string, @Req() req: any, @Param("keyId") keyId: string) {
    return this.app.deleteKey(this.current(auth, req), keyId);
  }
  @Post("admin/notification-test")
  testNotification(@Headers("authorization") auth: string, @Req() req: any, @Body() body: any) {
    return this.app.testNotification(this.current(auth, req), body);
  }

  // --- Search ---
  @Get("project-groups")
  projectGroups(@Headers("authorization") auth: string, @Req() req: any) {
    return this.app.projectGroups(this.current(auth, req));
  }

  @Get("dashboard-full")
  dashboardFull(@Headers("authorization") auth: string, @Req() req: any) {
    return this.app.dashboardFull(this.current(auth, req));
  }

  @Get("tasks/:taskId/full")
  getTaskFull(@Headers("authorization") auth: string, @Req() req: any, @Param("taskId") taskId: string) {
    return this.app.getTaskFull(this.current(auth, req), taskId);
  }

  @Get("projects/:projectId/file-collection")
  fileCollection(@Headers("authorization") auth: string, @Req() req: any, @Param("projectId") projectId: string) {
    return this.app.fileCollection(this.current(auth, req), projectId);
  }

  @Get("search")
  search(@Headers("authorization") auth: string, @Req() req: any, @Query("q") q = "") {
    return this.app.search(this.current(auth, req), q);
  }

  @Post("profile/avatar")
  @UseInterceptors(FileInterceptor("file", {
    storage: diskStorage({
      destination: "./uploads/avatars",
      filename: (_req, file, cb) => {
        const name = `avatar_${Date.now()}_${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`;
        cb(null, name);
      }
    }),
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (!file.mimetype.match(/^image\/(jpeg|png|gif|webp)$/)) {
        cb(new Error("仅支持 jpg/png/gif/webp 图片"), false);
      } else {
        cb(null, true);
      }
    }
  }))
  uploadAvatar(@Headers("authorization") auth: string, @Req() req: any, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new (require("@nestjs/common").BadRequestException)("请选择图片文件");
    const url = `/uploads/avatars/${file.filename}`;
    this.app.updateProfile(this.current(auth, req), { avatar: url });
    return { url, filename: file.filename, size: file.size };
  }
}
