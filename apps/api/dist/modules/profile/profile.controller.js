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
import { BadRequestException, Body, Controller, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname } from "node:path";
import { ProfileService } from "./profile.service.js";
import { AuthGuard } from "../../common/guards/auth.guard.js";
import { CurrentUser } from "../../common/decorators/index.js";
let ProfileController = class ProfileController {
    profile;
    constructor(profile) {
        this.profile = profile;
    }
    updateProfile(user, body) {
        return this.profile.updateProfile(user, body);
    }
    changePassword(user, body) {
        return this.profile.changePassword(user, body);
    }
    uploadAvatar(user, file) {
        if (!file)
            throw new BadRequestException("请选择图片文件");
        const url = `/uploads/avatars/${file.filename}`;
        this.profile.updateProfile(user, { avatar: url });
        return { url, filename: file.filename, size: file.size };
    }
};
__decorate([
    Patch("profile"),
    __param(0, CurrentUser()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ProfileController.prototype, "updateProfile", null);
__decorate([
    Patch("profile/password"),
    __param(0, CurrentUser()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ProfileController.prototype, "changePassword", null);
__decorate([
    Post("profile/avatar"),
    UseInterceptors(FileInterceptor("file", {
        storage: diskStorage({
            destination: "./uploads/avatars",
            filename: (_req, file, cb) => cb(null, `avatar_${Date.now()}_${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`),
        }),
        limits: { fileSize: 2 * 1024 * 1024 },
        fileFilter: (_req, file, cb) => {
            if (!file.mimetype.match(/^image\/(jpeg|png|gif|webp)$/)) {
                cb(new Error("仅支持 jpg/png/gif/webp 图片"), false);
            }
            else {
                cb(null, true);
            }
        },
    })),
    __param(0, CurrentUser()),
    __param(1, UploadedFile()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ProfileController.prototype, "uploadAvatar", null);
ProfileController = __decorate([
    Controller(),
    UseGuards(AuthGuard),
    __metadata("design:paramtypes", [ProfileService])
], ProfileController);
export { ProfileController };
//# sourceMappingURL=profile.controller.js.map