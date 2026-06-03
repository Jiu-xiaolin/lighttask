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
import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query, Req, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname } from "node:path";
import { AppService } from "./app.service.js";
let AppController = class AppController {
    app;
    constructor(app) {
        this.app = app;
    }
    ip(req) {
        const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
        return String(req.headers["x-test-ip"] || req.headers["x-real-ip"] || forwarded || req.socket?.remoteAddress || "127.0.0.1").replace(/^::ffff:/, "");
    }
    current(authorization, req) {
        return this.app.auth(authorization, this.ip(req)).user;
    }
    login(body, req) {
        return this.app.login(body, this.ip(req));
    }
    dashboard(auth, req) {
        return this.app.dashboard(this.current(auth, req));
    }
    memberGantt(auth, req) {
        return this.app.memberGantt(this.current(auth, req));
    }
    ganttViews(auth, req) {
        return this.app.ganttViewsFor(this.current(auth, req));
    }
    saveGanttView(auth, req, body) {
        return this.app.saveGanttView(this.current(auth, req), body);
    }
    projects(auth, req) {
        return this.app.listProjects(this.current(auth, req));
    }
    createProject(auth, req, body) {
        return this.app.createProject(this.current(auth, req), body);
    }
    project(auth, req, projectId) {
        return this.app.projectDetail(this.current(auth, req), projectId);
    }
    updateProject(auth, req, projectId, body) {
        return this.app.updateProject(this.current(auth, req), projectId, body);
    }
    archiveProject(auth, req, projectId) {
        return this.app.archiveProject(this.current(auth, req), projectId);
    }
    restoreProject(auth, req, projectId) {
        return this.app.restoreProject(this.current(auth, req), projectId);
    }
    settings(auth, req, projectId, body) {
        return this.app.settings(this.current(auth, req), projectId, body);
    }
    members(auth, req, projectId) {
        return this.app.membersOf(this.current(auth, req), projectId);
    }
    invite(auth, req, projectId, body) {
        return this.app.invite(this.current(auth, req), projectId, body);
    }
    tasks(auth, req, projectId) {
        return this.app.tasksOf(this.current(auth, req), projectId);
    }
    createTask(auth, req, projectId, body) {
        return this.app.createTask(this.current(auth, req), projectId, body);
    }
    updateProgress(auth, req, progressId, body) {
        return this.app.updateProgress(this.current(auth, req), progressId, body);
    }
    progressAction(auth, req, progressId, action, body) {
        const patchByAction = {
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
    submit(auth, req, progressId, body) {
        return this.app.submit(this.current(auth, req), progressId, body);
    }
    files(auth, req, projectId) {
        return this.app.filesOf(this.current(auth, req), projectId);
    }
    createFile(auth, req, projectId, body) {
        return this.app.createFile(this.current(auth, req), projectId, body);
    }
    file(auth, req, fileId) {
        return this.app.file(this.current(auth, req), fileId);
    }
    updateFile(auth, req, fileId, body) {
        return this.app.updateFile(this.current(auth, req), fileId, body);
    }
    importFile(auth, req, fileId, body) {
        return this.app.fileJob(this.current(auth, req), fileId, "import", body);
    }
    exportFile(auth, req, fileId, body) {
        return this.app.fileJob(this.current(auth, req), fileId, "export", body);
    }
    acceptance(auth, req, projectId) {
        return this.app.acceptance(this.current(auth, req), projectId);
    }
    startAcceptance(auth, req, projectId) {
        return this.app.startAcceptance(this.current(auth, req), projectId);
    }
    approveAcceptance(auth, req, projectId) {
        return this.app.approveAcceptance(this.current(auth, req), projectId);
    }
    acceptanceReport(auth, req, projectId, body) {
        return this.app.report(this.current(auth, req), projectId, body);
    }
    health(auth, req) {
        return this.app.health(this.current(auth, req));
    }
    adminUsers(auth, req) {
        return this.app.adminUsers(this.current(auth, req));
    }
    createUser(auth, req, body) {
        return this.app.createUser(this.current(auth, req), body);
    }
    notifications(auth, req) {
        const user = this.current(auth, req);
        this.app.admin(user);
        return this.app.notif();
    }
    createRule(auth, req, body) {
        return this.app.createRule(this.current(auth, req), body);
    }
    createChannel(auth, req, body) {
        return this.app.createChannel(this.current(auth, req), body);
    }
    createKey(auth, req, body) {
        return this.app.createKey(this.current(auth, req), body);
    }
    retryNotification(auth, req, logId) {
        return this.app.retry(this.current(auth, req), logId);
    }
    roles(auth, req) {
        return this.app.roles(this.current(auth, req));
    }
    createRole(auth, req, body) {
        return this.app.createRole(this.current(auth, req), body);
    }
    createScope(auth, req, body) {
        return this.app.createScope(this.current(auth, req), body);
    }
    updateScope(auth, req, scopeId, body) {
        return this.app.updateScope(this.current(auth, req), scopeId, body);
    }
    deleteScope(auth, req, scopeId) {
        return this.app.deleteScope(this.current(auth, req), scopeId);
    }
    copyRole(auth, req, roleId) {
        return this.app.copyRoleTemplate(this.current(auth, req), roleId);
    }
    deleteRole(auth, req, roleId) {
        return this.app.deleteRoleTemplate(this.current(auth, req), roleId);
    }
    updateRole(auth, req, roleId, body) {
        return this.app.updateRolePermissions(this.current(auth, req), roleId, body);
    }
    permissionMatrix(auth, req) {
        this.app.admin(this.current(auth, req));
        return { matrix: this.app.getPermissionMatrix() };
    }
    auditLogs(auth, req) {
        return this.app.auditLogs(this.current(auth, req));
    }
    realtime(auth, req) {
        return this.app.realtime(this.current(auth, req));
    }
    collabEvent(auth, req, body) {
        return this.app.collabEvent(this.current(auth, req), body);
    }
    // --- Task CRUD ---
    getTask(auth, req, taskId) {
        return this.app.getTask(this.current(auth, req), taskId);
    }
    updateTask(auth, req, taskId, body) {
        return this.app.updateTask(this.current(auth, req), taskId, body);
    }
    deleteTask(auth, req, taskId) {
        return this.app.deleteTask(this.current(auth, req), taskId);
    }
    copyTask(auth, req, taskId) {
        return this.app.copyTask(this.current(auth, req), taskId);
    }
    archiveTask(auth, req, taskId) {
        return this.app.archiveTask(this.current(auth, req), taskId);
    }
    restoreTask(auth, req, taskId) {
        return this.app.restoreTask(this.current(auth, req), taskId);
    }
    // --- User profile ---
    updateProfile(auth, req, body) {
        return this.app.updateProfile(this.current(auth, req), body);
    }
    changePassword(auth, req, body) {
        return this.app.changePassword(this.current(auth, req), body);
    }
    // --- Member management ---
    updateMember(auth, req, projectId, memberId, body) {
        return this.app.updateMember(this.current(auth, req), projectId, memberId, body);
    }
    removeMember(auth, req, projectId, memberId) {
        return this.app.removeMember(this.current(auth, req), projectId, memberId);
    }
    // --- IP whitelist ---
    listIpEntries(auth, req, userId) {
        return this.app.listIpEntries(this.current(auth, req), userId);
    }
    addIpEntry(auth, req, body) {
        return this.app.addIpEntry(this.current(auth, req), body);
    }
    removeIpEntry(auth, req, entryId) {
        return this.app.removeIpEntry(this.current(auth, req), entryId);
    }
    toggleIpPolicy(auth, req, body) {
        return this.app.toggleIpPolicy(this.current(auth, req), body);
    }
    // --- User management (admin) ---
    updateUser(auth, req, userId, body) {
        return this.app.updateUser(this.current(auth, req), userId, body);
    }
    resetUserPassword(auth, req, userId, body) {
        return this.app.resetUserPassword(this.current(auth, req), userId, body);
    }
    userSessions(auth, req, userId) {
        return this.app.userSessions(this.current(auth, req), userId);
    }
    revokeSession(auth, req, sessionId) {
        return this.app.revokeSession(this.current(auth, req), sessionId);
    }
    changeUserRole(auth, req, userId, body) {
        return this.app.changeUserRole(this.current(auth, req), userId, body);
    }
    userProjects(auth, req, userId) {
        return this.app.userProjects(this.current(auth, req), userId);
    }
    assignProject(auth, req, userId, body) {
        return this.app.assignProject(this.current(auth, req), userId, body);
    }
    removeProject(auth, req, userId, projectId) {
        return this.app.removeProject(this.current(auth, req), userId, projectId);
    }
    // --- Acceptance items CRUD ---
    createAcceptanceItem(auth, req, projectId, body) {
        return this.app.createAcceptanceItem(this.current(auth, req), projectId, body);
    }
    updateAcceptanceItem(auth, req, itemId, body) {
        return this.app.updateAcceptanceItem(this.current(auth, req), itemId, body);
    }
    deleteAcceptanceItem(auth, req, itemId) {
        return this.app.deleteAcceptanceItem(this.current(auth, req), itemId);
    }
    // --- Notification management ---
    updateRule(auth, req, ruleId, body) {
        return this.app.updateRule(this.current(auth, req), ruleId, body);
    }
    deleteRule(auth, req, ruleId) {
        return this.app.deleteRule(this.current(auth, req), ruleId);
    }
    toggleRule(auth, req, ruleId) {
        return this.app.toggleRule(this.current(auth, req), ruleId);
    }
    updateChannel(auth, req, channelId, body) {
        return this.app.updateChannel(this.current(auth, req), channelId, body);
    }
    deleteChannel(auth, req, channelId) {
        return this.app.deleteChannel(this.current(auth, req), channelId);
    }
    updateKey(auth, req, keyId, body) {
        return this.app.updateKey(this.current(auth, req), keyId, body);
    }
    deleteKey(auth, req, keyId) {
        return this.app.deleteKey(this.current(auth, req), keyId);
    }
    testNotification(auth, req, body) {
        return this.app.testNotification(this.current(auth, req), body);
    }
    // --- Search ---
    search(auth, req, q = "") {
        return this.app.search(this.current(auth, req), q);
    }
    uploadAvatar(auth, req, file) {
        if (!file)
            throw new (require("@nestjs/common").BadRequestException)("请选择图片文件");
        const url = `/uploads/avatars/${file.filename}`;
        this.app.updateProfile(this.current(auth, req), { avatar: url });
        return { url, filename: file.filename, size: file.size };
    }
};
__decorate([
    Post("auth/login"),
    __param(0, Body()),
    __param(1, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "login", null);
__decorate([
    Get("dashboard"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "dashboard", null);
__decorate([
    Get("dashboard/member-gantt"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "memberGantt", null);
__decorate([
    Get("dashboard/gantt/views"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "ganttViews", null);
__decorate([
    Patch("dashboard/gantt/views"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "saveGanttView", null);
__decorate([
    Get("projects"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "projects", null);
__decorate([
    Post("projects"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "createProject", null);
__decorate([
    Get("projects/:projectId"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Param("projectId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "project", null);
__decorate([
    Patch("projects/:projectId"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Param("projectId")),
    __param(3, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, Object]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "updateProject", null);
__decorate([
    Post("projects/:projectId/archive"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Param("projectId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "archiveProject", null);
__decorate([
    Post("projects/:projectId/restore"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Param("projectId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "restoreProject", null);
__decorate([
    Patch("projects/:projectId/settings"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Param("projectId")),
    __param(3, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, Object]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "settings", null);
__decorate([
    Get("projects/:projectId/members"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Param("projectId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "members", null);
__decorate([
    Post("projects/:projectId/members"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Param("projectId")),
    __param(3, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, Object]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "invite", null);
__decorate([
    Get("projects/:projectId/tasks"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Param("projectId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "tasks", null);
__decorate([
    Post("projects/:projectId/tasks"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Param("projectId")),
    __param(3, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, Object]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "createTask", null);
__decorate([
    Patch("task-progress/:progressId"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Param("progressId")),
    __param(3, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, Object]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "updateProgress", null);
__decorate([
    Post("task-progress/:progressId/:action"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Param("progressId")),
    __param(3, Param("action")),
    __param(4, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String, Object]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "progressAction", null);
__decorate([
    Post("task-progress/:progressId/submissions"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Param("progressId")),
    __param(3, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, Object]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "submit", null);
__decorate([
    Get("projects/:projectId/files"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Param("projectId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "files", null);
__decorate([
    Post("projects/:projectId/files"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Param("projectId")),
    __param(3, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, Object]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "createFile", null);
__decorate([
    Get("project-files/:fileId"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Param("fileId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "file", null);
__decorate([
    Patch("project-files/:fileId"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Param("fileId")),
    __param(3, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, Object]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "updateFile", null);
__decorate([
    Post("project-files/:fileId/import"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Param("fileId")),
    __param(3, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, Object]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "importFile", null);
__decorate([
    Post("project-files/:fileId/export"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Param("fileId")),
    __param(3, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, Object]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "exportFile", null);
__decorate([
    Get("projects/:projectId/acceptance"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Param("projectId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "acceptance", null);
__decorate([
    Post("projects/:projectId/acceptance/start"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Param("projectId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "startAcceptance", null);
__decorate([
    Post("projects/:projectId/acceptance/approve"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Param("projectId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "approveAcceptance", null);
__decorate([
    Post("projects/:projectId/acceptance/report"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Param("projectId")),
    __param(3, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, Object]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "acceptanceReport", null);
__decorate([
    Get("admin/health"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "health", null);
__decorate([
    Get("admin/users"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "adminUsers", null);
__decorate([
    Post("admin/users"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "createUser", null);
__decorate([
    Get("admin/notifications"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "notifications", null);
__decorate([
    Post("admin/notification-rules"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "createRule", null);
__decorate([
    Post("admin/notification-channels"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "createChannel", null);
__decorate([
    Post("admin/notification-keys"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "createKey", null);
__decorate([
    Post("notification-logs/:logId/retry"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Param("logId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "retryNotification", null);
__decorate([
    Get("admin/roles"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "roles", null);
__decorate([
    Post("admin/role-templates"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "createRole", null);
__decorate([
    Post("admin/permission-scopes"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "createScope", null);
__decorate([
    Patch("admin/permission-scopes/:scopeId"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Param("scopeId")),
    __param(3, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, Object]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "updateScope", null);
__decorate([
    Delete("admin/permission-scopes/:scopeId"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Param("scopeId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "deleteScope", null);
__decorate([
    Post("admin/role-templates/:roleId/copy"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Param("roleId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "copyRole", null);
__decorate([
    Delete("admin/role-templates/:roleId"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Param("roleId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "deleteRole", null);
__decorate([
    Patch("admin/role-templates/:roleId"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Param("roleId")),
    __param(3, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, Object]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "updateRole", null);
__decorate([
    Get("admin/permission-matrix"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "permissionMatrix", null);
__decorate([
    Get("admin/audit-logs"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "auditLogs", null);
__decorate([
    Get("realtime/status"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "realtime", null);
__decorate([
    Post("collaboration/events"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "collabEvent", null);
__decorate([
    Get("tasks/:taskId"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Param("taskId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "getTask", null);
__decorate([
    Patch("tasks/:taskId"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Param("taskId")),
    __param(3, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, Object]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "updateTask", null);
__decorate([
    Delete("tasks/:taskId"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Param("taskId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "deleteTask", null);
__decorate([
    Post("tasks/:taskId/copy"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Param("taskId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "copyTask", null);
__decorate([
    Post("tasks/:taskId/archive"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Param("taskId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "archiveTask", null);
__decorate([
    Post("tasks/:taskId/restore"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Param("taskId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "restoreTask", null);
__decorate([
    Patch("profile"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "updateProfile", null);
__decorate([
    Patch("profile/password"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "changePassword", null);
__decorate([
    Patch("projects/:projectId/members/:memberId"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Param("projectId")),
    __param(3, Param("memberId")),
    __param(4, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String, Object]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "updateMember", null);
__decorate([
    Delete("projects/:projectId/members/:memberId"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Param("projectId")),
    __param(3, Param("memberId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "removeMember", null);
__decorate([
    Get("admin/ip-whitelist"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Query("userId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "listIpEntries", null);
__decorate([
    Post("admin/ip-whitelist"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "addIpEntry", null);
__decorate([
    Delete("admin/ip-whitelist/:entryId"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Param("entryId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "removeIpEntry", null);
__decorate([
    Patch("admin/ip-policy"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "toggleIpPolicy", null);
__decorate([
    Patch("admin/users/:userId"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Param("userId")),
    __param(3, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, Object]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "updateUser", null);
__decorate([
    Post("admin/users/:userId/reset-password"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Param("userId")),
    __param(3, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, Object]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "resetUserPassword", null);
__decorate([
    Get("admin/users/:userId/sessions"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Param("userId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "userSessions", null);
__decorate([
    Post("admin/sessions/:sessionId/revoke"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Param("sessionId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "revokeSession", null);
__decorate([
    Patch("admin/users/:userId/role"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Param("userId")),
    __param(3, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, Object]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "changeUserRole", null);
__decorate([
    Get("admin/users/:userId/projects"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Param("userId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "userProjects", null);
__decorate([
    Post("admin/users/:userId/projects"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Param("userId")),
    __param(3, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, Object]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "assignProject", null);
__decorate([
    Delete("admin/users/:userId/projects/:projectId"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Param("userId")),
    __param(3, Param("projectId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "removeProject", null);
__decorate([
    Post("projects/:projectId/acceptance-items"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Param("projectId")),
    __param(3, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, Object]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "createAcceptanceItem", null);
__decorate([
    Patch("acceptance-items/:itemId"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Param("itemId")),
    __param(3, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, Object]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "updateAcceptanceItem", null);
__decorate([
    Delete("acceptance-items/:itemId"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Param("itemId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "deleteAcceptanceItem", null);
__decorate([
    Patch("admin/notification-rules/:ruleId"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Param("ruleId")),
    __param(3, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, Object]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "updateRule", null);
__decorate([
    Delete("admin/notification-rules/:ruleId"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Param("ruleId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "deleteRule", null);
__decorate([
    Post("admin/notification-rules/:ruleId/toggle"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Param("ruleId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "toggleRule", null);
__decorate([
    Patch("admin/notification-channels/:channelId"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Param("channelId")),
    __param(3, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, Object]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "updateChannel", null);
__decorate([
    Delete("admin/notification-channels/:channelId"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Param("channelId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "deleteChannel", null);
__decorate([
    Patch("admin/notification-keys/:keyId"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Param("keyId")),
    __param(3, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, Object]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "updateKey", null);
__decorate([
    Delete("admin/notification-keys/:keyId"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Param("keyId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "deleteKey", null);
__decorate([
    Post("admin/notification-test"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "testNotification", null);
__decorate([
    Get("search"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, Query("q")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "search", null);
__decorate([
    Post("profile/avatar"),
    UseInterceptors(FileInterceptor("file", {
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
            }
            else {
                cb(null, true);
            }
        }
    })),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __param(2, UploadedFile()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "uploadAvatar", null);
AppController = __decorate([
    Controller(),
    __metadata("design:paramtypes", [AppService])
], AppController);
export { AppController };
//# sourceMappingURL=app.controller.js.map