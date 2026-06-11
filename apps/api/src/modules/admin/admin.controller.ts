import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { AdminService } from "./admin.service.js";
import { AuthGuard } from "../../common/guards/auth.guard.js";
import { CurrentUser, Public } from "../../common/decorators/index.js";

@Controller()
@UseGuards(AuthGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  // Health
  @Get("admin/health") health(@CurrentUser() u: any) { return this.admin.health(u); }

  // Users
  @Get("admin/users") adminUsers(@CurrentUser() u: any) { return this.admin.adminUsers(u); }
  @Post("admin/users") createUser(@CurrentUser() u: any, @Body() b: any) { return this.admin.createUser(u, b); }
  @Patch("admin/users/:userId") updateUser(@CurrentUser() u: any, @Param("userId") id: string, @Body() b: any) { return this.admin.updateUser(u, id, b); }
  @Post("admin/users/:userId/reset-password") resetUserPassword(@CurrentUser() u: any, @Param("userId") id: string, @Body() b: any) { return this.admin.resetUserPassword(u, id, b); }
  @Get("admin/users/:userId/sessions") userSessions(@CurrentUser() u: any, @Param("userId") id: string) { return this.admin.userSessions(u, id); }
  @Post("admin/sessions/:sessionId/revoke") revokeSession(@CurrentUser() u: any, @Param("sessionId") id: string) { return this.admin.revokeSession(u, id); }
  @Patch("admin/users/:userId/role") changeUserRole(@CurrentUser() u: any, @Param("userId") id: string, @Body() b: any) { return this.admin.changeUserRole(u, id, b); }
  @Get("admin/users/:userId/projects") userProjects(@CurrentUser() u: any, @Param("userId") id: string) { return this.admin.userProjects(u, id); }
  @Post("admin/users/:userId/projects") assignProject(@CurrentUser() u: any, @Param("userId") id: string, @Body() b: any) { return this.admin.assignProject(u, id, b); }
  @Delete("admin/users/:userId/projects/:projectId") removeProject(@CurrentUser() u: any, @Param("userId") uid: string, @Param("projectId") pid: string) { return this.admin.removeProject(u, uid, pid); }

  // IP Whitelist
  @Get("admin/ip-whitelist") listIpEntries(@CurrentUser() u: any, @Query("userId") uid?: string) { return this.admin.listIpEntries(u, uid); }
  @Post("admin/ip-whitelist") addIpEntry(@CurrentUser() u: any, @Body() b: any) { return this.admin.addIpEntry(u, b); }
  @Delete("admin/ip-whitelist/:entryId") removeIpEntry(@CurrentUser() u: any, @Param("entryId") id: string) { return this.admin.removeIpEntry(u, id); }
  @Patch("admin/ip-policy") toggleIpPolicy(@CurrentUser() u: any, @Body() b: any) { return this.admin.toggleIpPolicy(u, b); }

  // Permissions
  @Get("admin/roles") roles(@CurrentUser() u: any) { return this.admin.roles(u); }
  @Post("admin/role-templates") createRole(@CurrentUser() u: any, @Body() b: any) { return this.admin.createRole(u, b); }
  @Post("admin/role-templates/:roleId/copy") copyRole(@CurrentUser() u: any, @Param("roleId") id: string) { return this.admin.copyRoleTemplate(u, id); }
  @Delete("admin/role-templates/:roleId") deleteRole(@CurrentUser() u: any, @Param("roleId") id: string) { return this.admin.deleteRoleTemplate(u, id); }
  @Patch("admin/role-templates/:roleId") updateRole(@CurrentUser() u: any, @Param("roleId") id: string, @Body() b: any) { return this.admin.updateRolePermissions(u, id, b); }
  @Post("admin/permission-scopes") createScope(@CurrentUser() u: any, @Body() b: any) { return this.admin.createScope(u, b); }
  @Patch("admin/permission-scopes/:scopeId") updateScope(@CurrentUser() u: any, @Param("scopeId") id: string, @Body() b: any) { return this.admin.updateScope(u, id, b); }
  @Delete("admin/permission-scopes/:scopeId") deleteScope(@CurrentUser() u: any, @Param("scopeId") id: string) { return this.admin.deleteScope(u, id); }
  @Get("admin/permission-matrix") permissionMatrix(@CurrentUser() u: any) { return this.admin.permissionMatrix(u); }

  // Audit
  @Get("admin/audit-logs") auditLogs(@CurrentUser() u: any, @Query() q: any) { return this.admin.auditLogs(u, q); }

  // Notifications
  @Get("admin/notifications") notif(@CurrentUser() u: any) { return this.admin.notif(u); }
  @Post("admin/notification-rules") createRule(@CurrentUser() u: any, @Body() b: any) { return this.admin.createRule(u, b); }
  @Patch("admin/notification-rules/:ruleId") updateRule(@CurrentUser() u: any, @Param("ruleId") id: string, @Body() b: any) { return this.admin.updateRule(u, id, b); }
  @Delete("admin/notification-rules/:ruleId") deleteRule(@CurrentUser() u: any, @Param("ruleId") id: string) { return this.admin.deleteRule(u, id); }
  @Post("admin/notification-rules/:ruleId/toggle") toggleRule(@CurrentUser() u: any, @Param("ruleId") id: string) { return this.admin.toggleRule(u, id); }
  @Post("admin/notification-channels") createChannel(@CurrentUser() u: any, @Body() b: any) { return this.admin.createChannel(u, b); }
  @Patch("admin/notification-channels/:channelId") updateChannel(@CurrentUser() u: any, @Param("channelId") id: string, @Body() b: any) { return this.admin.updateChannel(u, id, b); }
  @Delete("admin/notification-channels/:channelId") deleteChannel(@CurrentUser() u: any, @Param("channelId") id: string) { return this.admin.deleteChannel(u, id); }
  @Post("admin/notification-keys") createKey(@CurrentUser() u: any, @Body() b: any) { return this.admin.createKey(u, b); }
  @Patch("admin/notification-keys/:keyId") updateKey(@CurrentUser() u: any, @Param("keyId") id: string, @Body() b: any) { return this.admin.updateKey(u, id, b); }
  @Delete("admin/notification-keys/:keyId") deleteKey(@CurrentUser() u: any, @Param("keyId") id: string) { return this.admin.deleteKey(u, id); }
  @Post("notification-logs/:logId/retry") retryNotification(@CurrentUser() u: any, @Param("logId") id: string) { return this.admin.retry(u, id); }
  @Post("admin/notification-test") testNotification(@CurrentUser() u: any, @Body() b: any) { return this.admin.testNotification(u, b); }
  @Post("admin/notification-daily-report") saveDailyReport(@CurrentUser() u: any, @Body() b: any) { return this.admin.saveDailyReportRule(u, b); }
  @Get("admin/notification-daily-report/preview") dailyReportPreview(@CurrentUser() u: any) { return this.admin.dailyReportPreview(u); }
  @Post("admin/notification-daily-report/send") sendDailyReport(@CurrentUser() u: any, @Body() b: any) { return this.admin.sendDailyReport(u, b); }
  @Post("admin/notification-reminders/bootstrap") bootstrapReminderRules(@CurrentUser() u: any) { return this.admin.bootstrapReminderRules(u); }
  @Post("admin/notification-callback/check") checkFeishuCallback(@CurrentUser() u: any) { return this.admin.checkFeishuCallback(u); }
  @Public()
  @Post("feishu/card-callback") feishuCardCallback(@Body() b: any) { return this.admin.handleFeishuCardCallback(b); }

  // Acceptance
  @Get("projects/:projectId/acceptance") acceptance(@CurrentUser() u: any, @Param("projectId") pid: string) { return this.admin.acceptance(u, pid); }
  @Post("projects/:projectId/acceptance/start") startAcceptance(@CurrentUser() u: any, @Param("projectId") pid: string) { return this.admin.startAcceptance(u, pid); }
  @Post("projects/:projectId/acceptance/approve") approveAcceptance(@CurrentUser() u: any, @Param("projectId") pid: string) { return this.admin.approveAcceptance(u, pid); }
  @Post("projects/:projectId/acceptance/report") acceptanceReport(@CurrentUser() u: any, @Param("projectId") pid: string, @Body() b: any) { return this.admin.createAcceptanceReport(u, pid, b); }
  @Post("projects/:projectId/acceptance-items") createAcceptanceItem(@CurrentUser() u: any, @Param("projectId") pid: string, @Body() b: any) { return this.admin.createAcceptanceItem(u, pid, b); }
  @Patch("acceptance-items/:itemId") updateAcceptanceItem(@CurrentUser() u: any, @Param("itemId") id: string, @Body() b: any) { return this.admin.updateAcceptanceItem(u, id, b); }
  @Delete("acceptance-items/:itemId") deleteAcceptanceItem(@CurrentUser() u: any, @Param("itemId") id: string) { return this.admin.deleteAcceptanceItem(u, id); }

  // Settings (leftover from project routes)
  @Patch("projects/:projectId/settings") settings(@CurrentUser() u: any, @Param("projectId") pid: string, @Body() b: any) { this.admin.requireAdmin(u); return { project: { id: pid, settings: b } }; }

  // Search
  @Get("search") search(@CurrentUser() u: any, @Query("q") q = "") { return this.admin.search(u, q); }

  // Realtime
  @Get("realtime/status") realtime(@CurrentUser() u: any) { return { status: { onlineUsers: 1, activeProjects: 0, lowResourceMode: true } }; }
  @Post("collaboration/events") collabEvent(@CurrentUser() u: any, @Body() b: any) { return { event: b }; }
}
