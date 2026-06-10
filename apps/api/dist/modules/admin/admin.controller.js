var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { AdminService } from "./admin.service.js";
import { AuthGuard } from "../../common/guards/auth.guard.js";
import { CurrentUser } from "../../common/decorators/index.js";
let AdminController = class AdminController {
    admin;
    constructor(admin) {
        this.admin = admin;
    }
    // Health
    health(u) { return this.admin.health(u); }
    // Users
    adminUsers(u) { return this.admin.adminUsers(u); }
    createUser(u, b) { return this.admin.createUser(u, b); }
    updateUser(u, id, b) { return this.admin.updateUser(u, id, b); }
    resetUserPassword(u, id, b) { return this.admin.resetUserPassword(u, id, b); }
    userSessions(u, id) { return this.admin.userSessions(u, id); }
    revokeSession(u, id) { return this.admin.revokeSession(u, id); }
    changeUserRole(u, id, b) { return this.admin.changeUserRole(u, id, b); }
    userProjects(u, id) { return this.admin.userProjects(u, id); }
    assignProject(u, id, b) { return this.admin.assignProject(u, id, b); }
    removeProject(u, uid, pid) { return this.admin.removeProject(u, uid, pid); }
    // IP Whitelist
    listIpEntries(u, uid) { return this.admin.listIpEntries(u, uid); }
    addIpEntry(u, b) { return this.admin.addIpEntry(u, b); }
    removeIpEntry(u, id) { return this.admin.removeIpEntry(u, id); }
    toggleIpPolicy(u, b) { return this.admin.toggleIpPolicy(u, b); }
    // Permissions
    roles(u) { return this.admin.roles(u); }
    createRole(u, b) { return this.admin.createRole(u, b); }
    copyRole(u, id) { return this.admin.copyRoleTemplate(u, id); }
    deleteRole(u, id) { return this.admin.deleteRoleTemplate(u, id); }
    updateRole(u, id, b) { return this.admin.updateRolePermissions(u, id, b); }
    createScope(u, b) { return this.admin.createScope(u, b); }
    updateScope(u, id, b) { return this.admin.updateScope(u, id, b); }
    deleteScope(u, id) { return this.admin.deleteScope(u, id); }
    permissionMatrix(u) { return this.admin.permissionMatrix(u); }
    // Audit
    auditLogs(u, q) { return this.admin.auditLogs(u, q); }
    // Notifications
    notif(u) { return this.admin.notif(u); }
    createRule(u, b) { return this.admin.createRule(u, b); }
    updateRule(u, id, b) { return this.admin.updateRule(u, id, b); }
    deleteRule(u, id) { return this.admin.deleteRule(u, id); }
    toggleRule(u, id) { return this.admin.toggleRule(u, id); }
    createChannel(u, b) { return this.admin.createChannel(u, b); }
    updateChannel(u, id, b) { return this.admin.updateChannel(u, id, b); }
    deleteChannel(u, id) { return this.admin.deleteChannel(u, id); }
    createKey(u, b) { return this.admin.createKey(u, b); }
    updateKey(u, id, b) { return this.admin.updateKey(u, id, b); }
    deleteKey(u, id) { return this.admin.deleteKey(u, id); }
    retryNotification(u, id) { return this.admin.retry(u, id); }
    testNotification(u, b) { return this.admin.testNotification(u, b); }
    // Acceptance
    acceptance(u, pid) { return this.admin.acceptance(u, pid); }
    startAcceptance(u, pid) { return this.admin.startAcceptance(u, pid); }
    approveAcceptance(u, pid) { return this.admin.approveAcceptance(u, pid); }
    acceptanceReport(u, pid, b) { return this.admin.createAcceptanceReport(u, pid, b); }
    createAcceptanceItem(u, pid, b) { return this.admin.createAcceptanceItem(u, pid, b); }
    updateAcceptanceItem(u, id, b) { return this.admin.updateAcceptanceItem(u, id, b); }
    deleteAcceptanceItem(u, id) { return this.admin.deleteAcceptanceItem(u, id); }
    // Settings (leftover from project routes)
    settings(u, pid, b) { this.admin.requireAdmin(u); return { project: { id: pid, settings: b } }; }
    // Search
    search(u, q = "") { return this.admin.search(u, q); }
    // Realtime
    realtime(u) { return { status: { onlineUsers: 1, activeProjects: 0, lowResourceMode: true } }; }
    collabEvent(u, b) { return { event: b }; }
};
__decorate([
    Get("admin/health"),
    __param(0, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "health", null);
__decorate([
    Get("admin/users"),
    __param(0, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "adminUsers", null);
__decorate([
    Post("admin/users"),
    __param(0, CurrentUser()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "createUser", null);
__decorate([
    Patch("admin/users/:userId"),
    __param(0, CurrentUser()),
    __param(1, Param("userId")),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "updateUser", null);
__decorate([
    Post("admin/users/:userId/reset-password"),
    __param(0, CurrentUser()),
    __param(1, Param("userId")),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "resetUserPassword", null);
__decorate([
    Get("admin/users/:userId/sessions"),
    __param(0, CurrentUser()),
    __param(1, Param("userId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "userSessions", null);
__decorate([
    Post("admin/sessions/:sessionId/revoke"),
    __param(0, CurrentUser()),
    __param(1, Param("sessionId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "revokeSession", null);
__decorate([
    Patch("admin/users/:userId/role"),
    __param(0, CurrentUser()),
    __param(1, Param("userId")),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "changeUserRole", null);
__decorate([
    Get("admin/users/:userId/projects"),
    __param(0, CurrentUser()),
    __param(1, Param("userId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "userProjects", null);
__decorate([
    Post("admin/users/:userId/projects"),
    __param(0, CurrentUser()),
    __param(1, Param("userId")),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "assignProject", null);
__decorate([
    Delete("admin/users/:userId/projects/:projectId"),
    __param(0, CurrentUser()),
    __param(1, Param("userId")),
    __param(2, Param("projectId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "removeProject", null);
__decorate([
    Get("admin/ip-whitelist"),
    __param(0, CurrentUser()),
    __param(1, Query("userId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "listIpEntries", null);
__decorate([
    Post("admin/ip-whitelist"),
    __param(0, CurrentUser()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "addIpEntry", null);
__decorate([
    Delete("admin/ip-whitelist/:entryId"),
    __param(0, CurrentUser()),
    __param(1, Param("entryId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "removeIpEntry", null);
__decorate([
    Patch("admin/ip-policy"),
    __param(0, CurrentUser()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "toggleIpPolicy", null);
__decorate([
    Get("admin/roles"),
    __param(0, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "roles", null);
__decorate([
    Post("admin/role-templates"),
    __param(0, CurrentUser()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "createRole", null);
__decorate([
    Post("admin/role-templates/:roleId/copy"),
    __param(0, CurrentUser()),
    __param(1, Param("roleId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "copyRole", null);
__decorate([
    Delete("admin/role-templates/:roleId"),
    __param(0, CurrentUser()),
    __param(1, Param("roleId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "deleteRole", null);
__decorate([
    Patch("admin/role-templates/:roleId"),
    __param(0, CurrentUser()),
    __param(1, Param("roleId")),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "updateRole", null);
__decorate([
    Post("admin/permission-scopes"),
    __param(0, CurrentUser()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "createScope", null);
__decorate([
    Patch("admin/permission-scopes/:scopeId"),
    __param(0, CurrentUser()),
    __param(1, Param("scopeId")),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "updateScope", null);
__decorate([
    Delete("admin/permission-scopes/:scopeId"),
    __param(0, CurrentUser()),
    __param(1, Param("scopeId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "deleteScope", null);
__decorate([
    Get("admin/permission-matrix"),
    __param(0, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "permissionMatrix", null);
__decorate([
    Get("admin/audit-logs"),
    __param(0, CurrentUser()),
    __param(1, Query()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "auditLogs", null);
__decorate([
    Get("admin/notifications"),
    __param(0, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "notif", null);
__decorate([
    Post("admin/notification-rules"),
    __param(0, CurrentUser()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "createRule", null);
__decorate([
    Patch("admin/notification-rules/:ruleId"),
    __param(0, CurrentUser()),
    __param(1, Param("ruleId")),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "updateRule", null);
__decorate([
    Delete("admin/notification-rules/:ruleId"),
    __param(0, CurrentUser()),
    __param(1, Param("ruleId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "deleteRule", null);
__decorate([
    Post("admin/notification-rules/:ruleId/toggle"),
    __param(0, CurrentUser()),
    __param(1, Param("ruleId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "toggleRule", null);
__decorate([
    Post("admin/notification-channels"),
    __param(0, CurrentUser()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "createChannel", null);
__decorate([
    Patch("admin/notification-channels/:channelId"),
    __param(0, CurrentUser()),
    __param(1, Param("channelId")),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "updateChannel", null);
__decorate([
    Delete("admin/notification-channels/:channelId"),
    __param(0, CurrentUser()),
    __param(1, Param("channelId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "deleteChannel", null);
__decorate([
    Post("admin/notification-keys"),
    __param(0, CurrentUser()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "createKey", null);
__decorate([
    Patch("admin/notification-keys/:keyId"),
    __param(0, CurrentUser()),
    __param(1, Param("keyId")),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "updateKey", null);
__decorate([
    Delete("admin/notification-keys/:keyId"),
    __param(0, CurrentUser()),
    __param(1, Param("keyId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "deleteKey", null);
__decorate([
    Post("notification-logs/:logId/retry"),
    __param(0, CurrentUser()),
    __param(1, Param("logId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "retryNotification", null);
__decorate([
    Post("admin/notification-test"),
    __param(0, CurrentUser()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "testNotification", null);
__decorate([
    Get("projects/:projectId/acceptance"),
    __param(0, CurrentUser()),
    __param(1, Param("projectId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "acceptance", null);
__decorate([
    Post("projects/:projectId/acceptance/start"),
    __param(0, CurrentUser()),
    __param(1, Param("projectId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "startAcceptance", null);
__decorate([
    Post("projects/:projectId/acceptance/approve"),
    __param(0, CurrentUser()),
    __param(1, Param("projectId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "approveAcceptance", null);
__decorate([
    Post("projects/:projectId/acceptance/report"),
    __param(0, CurrentUser()),
    __param(1, Param("projectId")),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "acceptanceReport", null);
__decorate([
    Post("projects/:projectId/acceptance-items"),
    __param(0, CurrentUser()),
    __param(1, Param("projectId")),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "createAcceptanceItem", null);
__decorate([
    Patch("acceptance-items/:itemId"),
    __param(0, CurrentUser()),
    __param(1, Param("itemId")),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "updateAcceptanceItem", null);
__decorate([
    Delete("acceptance-items/:itemId"),
    __param(0, CurrentUser()),
    __param(1, Param("itemId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "deleteAcceptanceItem", null);
__decorate([
    Patch("projects/:projectId/settings"),
    __param(0, CurrentUser()),
    __param(1, Param("projectId")),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "settings", null);
__decorate([
    Get("search"),
    __param(0, CurrentUser()),
    __param(1, Query("q")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "search", null);
__decorate([
    Get("realtime/status"),
    __param(0, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "realtime", null);
__decorate([
    Post("collaboration/events"),
    __param(0, CurrentUser()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "collabEvent", null);
AdminController = __decorate([
    Controller(),
    UseGuards(AuthGuard),
    __metadata("design:paramtypes", [AdminService])
], AdminController);
export { AdminController };
//# sourceMappingURL=admin.controller.js.map