import { Injectable, ForbiddenException, BadRequestException } from "@nestjs/common";
import bcrypt from "bcryptjs";
import { PrismaService } from "../../prisma/prisma.service.js";

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}

  async updateProfile(user: any, body: any) {
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.signature !== undefined) updateData.signature = body.signature;
    if (body.avatar !== undefined) updateData.avatar = body.avatar;
    if (body.theme !== undefined) updateData.theme = body.theme;
    if (body.customWallpaper !== undefined || body.customBlur !== undefined) {
      const config: any = (user.themeConfig as any) || {};
      if (body.customWallpaper !== undefined) config.customWallpaper = body.customWallpaper;
      if (body.customBlur !== undefined) config.customBlur = body.customBlur;
      updateData.themeConfig = config;
    }
    const updated = await this.prisma.user.update({ where: { id: user.id }, data: updateData });
    return {
      user: {
        id: updated.id, username: updated.username, name: updated.name, role: updated.role,
        avatar: updated.avatar || "", signature: updated.signature || "", theme: updated.theme || "letter",
        customWallpaper: ((updated.themeConfig as any) || {}).customWallpaper || "",
        customBlur: ((updated.themeConfig as any) || {}).customBlur || 0,
      },
    };
  }

  async changePassword(user: any, body: any) {
    const dbUser = await this.prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser || !bcrypt.compareSync(String(body.currentPassword || ""), dbUser.passwordHash)) throw new ForbiddenException("当前密码错误");
    await this.prisma.user.update({ where: { id: user.id }, data: { passwordHash: bcrypt.hashSync(body.newPassword, 10) } });
    return { ok: true };
  }
}
