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
import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Res, StreamableFile, UploadedFiles, UseGuards, UseInterceptors } from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname } from "node:path";
import { createReadStream, existsSync, mkdirSync } from "node:fs";
import { FileService } from "./file.service.js";
import { AuthGuard } from "../../common/guards/auth.guard.js";
import { CurrentUser } from "../../common/decorators/index.js";
let FileController = class FileController {
    fileSvc;
    constructor(fileSvc) {
        this.fileSvc = fileSvc;
    }
    filesOf(user, projectId) {
        return this.fileSvc.filesOf(user, projectId);
    }
    createFile(user, projectId, body) {
        return this.fileSvc.createFile(user, projectId, body);
    }
    uploadFiles(user, projectId, files) {
        return this.fileSvc.createUploadedFiles(user, projectId, files || []);
    }
    getFile(user, fileId) {
        return this.fileSvc.file(user, fileId);
    }
    updateFile(user, fileId, body) {
        return this.fileSvc.updateFile(user, fileId, body);
    }
    async downloadFile(user, fileId, res) {
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
    importFile(user, fileId, body) {
        return this.fileSvc.fileJob(user, fileId, "import", body);
    }
    exportFile(user, fileId, body) {
        return this.fileSvc.fileJob(user, fileId, "export", body);
    }
    fileCollection(user, projectId) {
        return this.fileSvc.fileCollection(user, projectId);
    }
};
__decorate([
    Get("projects/:projectId/files"),
    __param(0, CurrentUser()),
    __param(1, Param("projectId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], FileController.prototype, "filesOf", null);
__decorate([
    Post("projects/:projectId/files"),
    __param(0, CurrentUser()),
    __param(1, Param("projectId")),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], FileController.prototype, "createFile", null);
__decorate([
    Post("projects/:projectId/files/upload"),
    UseInterceptors(FilesInterceptor("files", 10, {
        storage: diskStorage({
            destination: (_req, _file, cb) => { mkdirSync("./uploads/project-files", { recursive: true }); cb(null, "./uploads/project-files"); },
            filename: (_req, file, cb) => { cb(null, `project_${Date.now()}_${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`); },
        }),
        limits: { fileSize: 20 * 1024 * 1024, files: 10 },
        fileFilter: (_req, file, cb) => {
            const allowed = new Set([".doc", ".docx", ".xls", ".xlsx", ".csv", ".md", ".txt", ".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".zip"]);
            if (!allowed.has(extname(file.originalname).toLowerCase()))
                return cb(new BadRequestException("不支持的文件类型"), false);
            cb(null, true);
        },
    })),
    __param(0, CurrentUser()),
    __param(1, Param("projectId")),
    __param(2, UploadedFiles()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Array]),
    __metadata("design:returntype", void 0)
], FileController.prototype, "uploadFiles", null);
__decorate([
    Get("project-files/:fileId"),
    __param(0, CurrentUser()),
    __param(1, Param("fileId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], FileController.prototype, "getFile", null);
__decorate([
    Patch("project-files/:fileId"),
    __param(0, CurrentUser()),
    __param(1, Param("fileId")),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], FileController.prototype, "updateFile", null);
__decorate([
    Get("project-files/:fileId/download"),
    __param(0, CurrentUser()),
    __param(1, Param("fileId")),
    __param(2, Res({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], FileController.prototype, "downloadFile", null);
__decorate([
    Post("project-files/:fileId/import"),
    __param(0, CurrentUser()),
    __param(1, Param("fileId")),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], FileController.prototype, "importFile", null);
__decorate([
    Post("project-files/:fileId/export"),
    __param(0, CurrentUser()),
    __param(1, Param("fileId")),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], FileController.prototype, "exportFile", null);
__decorate([
    Get("projects/:projectId/file-collection"),
    __param(0, CurrentUser()),
    __param(1, Param("projectId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], FileController.prototype, "fileCollection", null);
FileController = __decorate([
    Controller(),
    UseGuards(AuthGuard),
    __metadata("design:paramtypes", [FileService])
], FileController);
export { FileController };
//# sourceMappingURL=file.controller.js.map