import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ProjectService } from "./project.service.js";
import { AuthGuard } from "../../common/guards/auth.guard.js";
import { CurrentUser } from "../../common/decorators/index.js";

@Controller()
@UseGuards(AuthGuard)
export class ProjectController {
  constructor(private readonly project: ProjectService) {}

  @Get("projects")
  listProjects(@CurrentUser() user: any, @Query("filter") filter?: string, @Query("group") group?: string) {
    return this.project.listProjects(user, filter, group);
  }

  @Post("projects")
  createProject(@CurrentUser() user: any, @Body() body: any) {
    return this.project.createProject(user, body);
  }

  @Get("projects/:projectId")
  projectDetail(@CurrentUser() user: any, @Param("projectId") projectId: string) {
    return this.project.projectDetail(user, projectId);
  }

  @Patch("projects/:projectId")
  updateProject(@CurrentUser() user: any, @Param("projectId") projectId: string, @Body() body: any) {
    return this.project.updateProject(user, projectId, body);
  }

  @Post("projects/:projectId/archive")
  archiveProject(@CurrentUser() user: any, @Param("projectId") projectId: string) {
    return this.project.archiveProject(user, projectId);
  }

  @Post("projects/:projectId/restore")
  restoreProject(@CurrentUser() user: any, @Param("projectId") projectId: string) {
    return this.project.restoreProject(user, projectId);
  }

  @Delete("projects/:projectId")
  deleteProject(@CurrentUser() user: any, @Param("projectId") projectId: string) {
    return this.project.deleteProject(user, projectId);
  }

  @Get("projects/:projectId/members")
  members(@CurrentUser() user: any, @Param("projectId") projectId: string) {
    return this.project.membersOf(user, projectId);
  }

  @Post("projects/:projectId/members")
  invite(@CurrentUser() user: any, @Param("projectId") projectId: string, @Body() body: any) {
    return this.project.invite(user, projectId, body);
  }

  @Patch("projects/:projectId/members/:memberId")
  updateMember(@CurrentUser() user: any, @Param("projectId") projectId: string, @Param("memberId") memberId: string, @Body() body: any) {
    return this.project.updateMember(user, projectId, memberId, body);
  }

  @Delete("projects/:projectId/members/:memberId")
  removeMember(@CurrentUser() user: any, @Param("projectId") projectId: string, @Param("memberId") memberId: string) {
    return this.project.removeMember(user, projectId, memberId);
  }

  @Get("project-groups")
  projectGroups(@CurrentUser() user: any) {
    return this.project.projectGroups(user);
  }
}
