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
import { ProjectService } from "./project.service.js";
import { AuthGuard } from "../../common/guards/auth.guard.js";
import { CurrentUser } from "../../common/decorators/index.js";
let ProjectController = class ProjectController {
    project;
    constructor(project) {
        this.project = project;
    }
    listProjects(user, filter, group) {
        return this.project.listProjects(user, filter, group);
    }
    createProject(user, body) {
        return this.project.createProject(user, body);
    }
    projectDetail(user, projectId) {
        return this.project.projectDetail(user, projectId);
    }
    updateProject(user, projectId, body) {
        return this.project.updateProject(user, projectId, body);
    }
    archiveProject(user, projectId) {
        return this.project.archiveProject(user, projectId);
    }
    restoreProject(user, projectId) {
        return this.project.restoreProject(user, projectId);
    }
    deleteProject(user, projectId) {
        return this.project.deleteProject(user, projectId);
    }
    members(user, projectId) {
        return this.project.membersOf(user, projectId);
    }
    invite(user, projectId, body) {
        return this.project.invite(user, projectId, body);
    }
    updateMember(user, projectId, memberId, body) {
        return this.project.updateMember(user, projectId, memberId, body);
    }
    removeMember(user, projectId, memberId) {
        return this.project.removeMember(user, projectId, memberId);
    }
    projectGroups(user) {
        return this.project.projectGroups(user);
    }
};
__decorate([
    Get("projects"),
    __param(0, CurrentUser()),
    __param(1, Query("filter")),
    __param(2, Query("group")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], ProjectController.prototype, "listProjects", null);
__decorate([
    Post("projects"),
    __param(0, CurrentUser()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ProjectController.prototype, "createProject", null);
__decorate([
    Get("projects/:projectId"),
    __param(0, CurrentUser()),
    __param(1, Param("projectId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ProjectController.prototype, "projectDetail", null);
__decorate([
    Patch("projects/:projectId"),
    __param(0, CurrentUser()),
    __param(1, Param("projectId")),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], ProjectController.prototype, "updateProject", null);
__decorate([
    Post("projects/:projectId/archive"),
    __param(0, CurrentUser()),
    __param(1, Param("projectId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ProjectController.prototype, "archiveProject", null);
__decorate([
    Post("projects/:projectId/restore"),
    __param(0, CurrentUser()),
    __param(1, Param("projectId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ProjectController.prototype, "restoreProject", null);
__decorate([
    Delete("projects/:projectId"),
    __param(0, CurrentUser()),
    __param(1, Param("projectId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ProjectController.prototype, "deleteProject", null);
__decorate([
    Get("projects/:projectId/members"),
    __param(0, CurrentUser()),
    __param(1, Param("projectId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ProjectController.prototype, "members", null);
__decorate([
    Post("projects/:projectId/members"),
    __param(0, CurrentUser()),
    __param(1, Param("projectId")),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], ProjectController.prototype, "invite", null);
__decorate([
    Patch("projects/:projectId/members/:memberId"),
    __param(0, CurrentUser()),
    __param(1, Param("projectId")),
    __param(2, Param("memberId")),
    __param(3, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", void 0)
], ProjectController.prototype, "updateMember", null);
__decorate([
    Delete("projects/:projectId/members/:memberId"),
    __param(0, CurrentUser()),
    __param(1, Param("projectId")),
    __param(2, Param("memberId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], ProjectController.prototype, "removeMember", null);
__decorate([
    Get("project-groups"),
    __param(0, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ProjectController.prototype, "projectGroups", null);
ProjectController = __decorate([
    Controller(),
    UseGuards(AuthGuard),
    __metadata("design:paramtypes", [ProjectService])
], ProjectController);
export { ProjectController };
//# sourceMappingURL=project.controller.js.map