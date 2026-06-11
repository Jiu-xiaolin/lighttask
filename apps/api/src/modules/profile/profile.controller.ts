import { BadRequestException, Body, Controller, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname } from "node:path";
import { ProfileService } from "./profile.service.js";
import { AuthGuard } from "../../common/guards/auth.guard.js";
import { CurrentUser } from "../../common/decorators/index.js";

@Controller()
@UseGuards(AuthGuard)
export class ProfileController {
  constructor(private readonly profile: ProfileService) {}

  @Patch("profile")
  updateProfile(@CurrentUser() user: any, @Body() body: any) {
    return this.profile.updateProfile(user, body);
  }

  @Patch("profile/password")
  changePassword(@CurrentUser() user: any, @Body() body: any) {
    return this.profile.changePassword(user, body);
  }

  @Post("profile/avatar")
  @UseInterceptors(FileInterceptor("file", {
    storage: diskStorage({
      destination: "./uploads/avatars",
      filename: (_req, file, cb) => cb(null, `avatar_${Date.now()}_${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`),
    }),
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (!file.mimetype.match(/^image\/(jpeg|png|gif|webp)$/)) { cb(new Error("仅支持 jpg/png/gif/webp 图片"), false); } else { cb(null, true); }
    },
  }))
  async uploadAvatar(@CurrentUser() user: any, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException("请选择图片文件");
    const url = `/uploads/avatars/${file.filename}`;
    await this.profile.updateProfile(user, { avatar: url });
    return { url, filename: file.filename, size: file.size };
  }
}
