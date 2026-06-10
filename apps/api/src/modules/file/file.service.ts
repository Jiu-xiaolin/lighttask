import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import { genId } from "../../common/utils/index.js";
import { EventService } from "../../common/events/event.service.js";

@Injectable()
export class FileService {
  constructor(private prisma: PrismaService, private events: EventService) {}

  async checkAccess(user: any, projectId: string) {
    if (user.role === "SUPER_ADMIN") return true;
    const m = await this.prisma.projectMember.findUnique({ where: { projectId_userId: { projectId, userId: user.id } } });
    if (!m) throw new NotFoundException("项目不存在或无权限");
    return m;
  }

  async canEdit(user: any, projectId: string) {
    if (user.role === "SUPER_ADMIN") return true;
    const m = await this.checkAccess(user, projectId);
    if (typeof m === "boolean") return false;
    return m.role === "owner" || m.role === "admin" || m.role === "editor";
  }

  async hasScope(user: any, projectId: string, scope: string) {
    if (user.role === "SUPER_ADMIN") return true;
    const m = await this.prisma.projectMember.findUnique({ where: { projectId_userId: { projectId, userId: user.id } } }).catch(() => null);
    if (!m) return false;
    if (m.role === "owner" || m.role === "admin") return true;
    const template = await this.prisma.roleTemplate.findFirst({ where: { role: m.role } });
    return template ? (template.permissions as string[]).includes(scope) : false;
  }

  async filesOf(user: any, projectId: string) {
    await this.checkAccess(user, projectId);
    if (!(await this.hasScope(user, projectId, "file.visible"))) throw new ForbiddenException("无文件查看权限");
    const files = await this.prisma.projectFile.findMany({ where: { projectId, deleted: false }, orderBy: { updatedAt: "desc" } });
    return { files };
  }

  async createFile(user: any, projectId: string, body: any) {
    if (!(await this.canEdit(user, projectId))) throw new ForbiddenException("无文件创建权限");
    const file = await this.prisma.projectFile.create({
      data: {
        id: genId("f"), projectId,
        name: body.name || "未命名文件", type: body.type || "WORD_DOC", folder: body.folder || "项目资料",
        content: body.content || "", version: 1, ownerId: user.id,
      },
    });
    await this.prisma.fileVersion.create({
      data: { id: genId("fv"), fileId: file.id, projectId, version: 1, content: file.content || "", kind: "created", createdBy: user.id },
    });
    await this.events.record({ type: "file.created", actor: user, projectId, message: `创建文件：${file.name}`, color: "blue", metadata: { fileId: file.id, fileType: file.type } });
    return { file };
  }

  async createUploadedFiles(user: any, projectId: string, uploads: Array<Express.Multer.File>) {
    if (!(await this.canEdit(user, projectId))) throw new ForbiddenException("无文件上传权限");
    const files = [];
    for (const upload of uploads) {
      const file = await this.prisma.projectFile.create({
        data: { id: genId("f"), projectId, name: upload.originalname, type: "ATTACHMENT", folder: "项目资料", version: 1, ownerId: user.id },
      });
      await this.prisma.fileVersion.create({
        data: { id: genId("fv"), fileId: file.id, projectId, version: 1, storagePath: upload.path, kind: "uploaded", createdBy: user.id },
      });
      await this.events.record({ type: "file.uploaded", actor: user, projectId, message: `上传文件：${upload.originalname}`, color: "blue", metadata: { fileId: file.id, size: upload.size, mimetype: upload.mimetype } });
      files.push(file);
    }
    return { files };
  }

  async file(user: any, id: string) {
    const file = await this.prisma.projectFile.findUnique({ where: { id } });
    if (!file || !(await this.hasScope(user, file.projectId, "file.visible"))) throw new NotFoundException("文件不存在或无权限");
    const versions = await this.prisma.fileVersion.findMany({ where: { fileId: id }, orderBy: { version: "desc" } });
    return { file, versions };
  }

  async updateFile(user: any, id: string, body: any) {
    const file = await this.prisma.projectFile.findUnique({ where: { id } });
    if (!file || !(await this.canEdit(user, file.projectId))) throw new ForbiddenException("无文件编辑权限");
    const newVersion = file.version + 1;
    const updateData: any = { version: newVersion };
    if (body.name !== undefined) updateData.name = body.name;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.folder !== undefined) updateData.folder = body.folder;
    if (body.deleted !== undefined) updateData.deleted = body.deleted;
    if (body.content !== undefined) updateData.content = body.content;
    const updated = await this.prisma.projectFile.update({ where: { id }, data: updateData });
    if (body.content !== undefined) {
      await this.prisma.fileVersion.create({ data: { id: genId("fv"), fileId: id, projectId: file.projectId, version: newVersion, content: body.content, kind: body.kind || "updated", createdBy: user.id } });
    }
    await this.events.record({ type: body.deleted ? "file.deleted" : "file.updated", actor: user, projectId: file.projectId, message: `${body.deleted ? "删除" : "更新"}文件：${updated.name}`, color: body.deleted ? "rose" : "amber", metadata: { fileId: id, version: newVersion, fields: Object.keys(body || {}) } });
    return { file: updated };
  }

  async downloadFile(user: any, id: string) {
    const file = await this.prisma.projectFile.findUnique({ where: { id } });
    if (!file || !(await this.hasScope(user, file.projectId, "file.download"))) throw new ForbiddenException("无文件下载权限");
    const version = await this.prisma.fileVersion.findFirst({ where: { fileId: id, storagePath: { not: null } }, orderBy: { version: "desc" } });
    await this.events.record({ type: "file.downloaded", actor: user, projectId: file.projectId, message: `下载文件：${file.name}`, color: "blue", metadata: { fileId: file.id }, timeline: false });
    return { fileId: file.id, name: file.name, content: file.content, storagePath: version?.storagePath || null };
  }

  async fileJob(user: any, id: string, type: "import" | "export", body: any) {
    const file = await this.prisma.projectFile.findUnique({ where: { id } });
    if (!file) throw new NotFoundException("文件不存在");
    if (type === "export" && !(await this.hasScope(user, file.projectId, "file.download"))) throw new ForbiddenException("无文件导出权限");
    if (type === "import") await this.updateFile(user, id, { content: body.content || file.content, kind: "imported" });
    const job = await this.prisma.importExportJob.create({
      data: { id: genId("job"), type, projectId: file.projectId, fileId: id, status: "completed", requestedBy: user.id, payload: { format: body.format || "markdown" }, finishedAt: new Date() },
    });
    await this.events.record({ type: `file.${type}`, actor: user, projectId: file.projectId, message: `${type === "import" ? "导入" : "导出"}文件：${file.name}`, color: "blue", metadata: { fileId: id, jobId: job.id, format: body.format || "markdown" } });
    return { job, file };
  }

  async fileCollection(user: any, projectId: string) {
    await this.checkAccess(user, projectId);
    if (!(await this.hasScope(user, projectId, "file.visible"))) throw new ForbiddenException("无提交物查看权限");
    const submissions = await this.prisma.taskSubmission.findMany({ where: { projectId, deleted: false }, orderBy: { createdAt: "desc" } });
    return { submissions };
  }
}
