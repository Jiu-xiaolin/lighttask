import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Res, StreamableFile, UploadedFiles, UseGuards, UseInterceptors } from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname } from "node:path";
import { createReadStream, existsSync, mkdirSync } from "node:fs";
import type { Response } from "express";
import { FileService } from "./file.service.js";
import { AuthGuard } from "../../common/guards/auth.guard.js";
import { CurrentUser } from "../../common/decorators/index.js";

@Controller()
@UseGuards(AuthGuard)
export class FileController {
  constructor(private readonly fileSvc: FileService) {}

  @Get("projects/:projectId/files")
  filesOf(@CurrentUser() user: any, @Param("projectId") projectId: string) {
    return this.fileSvc.filesOf(user, projectId);
  }

  @Post("projects/:projectId/files")
  createFile(@CurrentUser() user: any, @Param("projectId") projectId: string, @Body() body: any) {
    return this.fileSvc.createFile(user, projectId, body);
  }

  @Post("projects/:projectId/files/upload")
  @UseInterceptors(FilesInterceptor("files", 10, {
    storage: diskStorage({
      destination: (_req, _file, cb) => { mkdirSync("./uploads/project-files", { recursive: true }); cb(null, "./uploads/project-files"); },
      filename: (_req, file, cb) => { cb(null, `project_${Date.now()}_${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`); },
    }),
    limits: { fileSize: 20 * 1024 * 1024, files: 10 },
    fileFilter: (_req, file, cb) => {
      const allowed = new Set([".doc", ".docx", ".xls", ".xlsx", ".csv", ".md", ".txt", ".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".zip"]);
      if (!allowed.has(extname(file.originalname).toLowerCase())) return cb(new BadRequestException("不支持的文件类型"), false);
      cb(null, true);
    },
  }))
  uploadFiles(@CurrentUser() user: any, @Param("projectId") projectId: string, @UploadedFiles() files: Array<Express.Multer.File>) {
    return this.fileSvc.createUploadedFiles(user, projectId, files || []);
  }

  @Get("project-files/:fileId")
  getFile(@CurrentUser() user: any, @Param("fileId") fileId: string) {
    return this.fileSvc.file(user, fileId);
  }

  @Patch("project-files/:fileId")
  updateFile(@CurrentUser() user: any, @Param("fileId") fileId: string, @Body() body: any) {
    return this.fileSvc.updateFile(user, fileId, body);
  }

  @Get("project-files/:fileId/download")
  async downloadFile(@CurrentUser() user: any, @Param("fileId") fileId: string, @Res({ passthrough: true }) res: Response) {
    const file = await this.fileSvc.downloadFile(user, fileId);
    const safeName = encodeURIComponent(file.name).replace(/['()]/g, escape);
    res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${safeName}`);
    res.setHeader("Cache-Control", "private, max-age=0, no-store");
    if (file.storagePath && existsSync(file.storagePath)) {
      return new StreamableFile(createReadStream(file.storagePath));
    }
    return new StreamableFile(Buffer.from(file.content || "", "utf8"), {
      type: "text/plain; charset=utf-8",
    });
  }

  @Post("project-files/:fileId/import")
  importFile(@CurrentUser() user: any, @Param("fileId") fileId: string, @Body() body: any) {
    return this.fileSvc.fileJob(user, fileId, "import", body);
  }

  @Post("project-files/:fileId/export")
  exportFile(@CurrentUser() user: any, @Param("fileId") fileId: string, @Body() body: any) {
    return this.fileSvc.fileJob(user, fileId, "export", body);
  }

  @Get("projects/:projectId/file-collection")
  fileCollection(@CurrentUser() user: any, @Param("projectId") projectId: string) {
    return this.fileSvc.fileCollection(user, projectId);
  }
}
