var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Injectable, ForbiddenException } from "@nestjs/common";
import bcrypt from "bcryptjs";
import { PrismaService } from "../../prisma/prisma.service.js";
let ProfileService = class ProfileService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async updateProfile(user, body) {
        const updateData = {};
        if (body.name !== undefined)
            updateData.name = body.name;
        if (body.signature !== undefined)
            updateData.signature = body.signature;
        if (body.avatar !== undefined)
            updateData.avatar = body.avatar;
        if (body.theme !== undefined)
            updateData.theme = body.theme;
        if (body.customWallpaper !== undefined || body.customBlur !== undefined) {
            const config = user.themeConfig || {};
            if (body.customWallpaper !== undefined)
                config.customWallpaper = body.customWallpaper;
            if (body.customBlur !== undefined)
                config.customBlur = body.customBlur;
            updateData.themeConfig = config;
        }
        const updated = await this.prisma.user.update({ where: { id: user.id }, data: updateData });
        return {
            user: {
                id: updated.id, username: updated.username, name: updated.name, role: updated.role,
                avatar: updated.avatar || "", signature: updated.signature || "", theme: updated.theme || "letter",
                customWallpaper: (updated.themeConfig || {}).customWallpaper || "",
                customBlur: (updated.themeConfig || {}).customBlur || 0,
            },
        };
    }
    async changePassword(user, body) {
        const dbUser = await this.prisma.user.findUnique({ where: { id: user.id } });
        if (!dbUser || !bcrypt.compareSync(String(body.currentPassword || ""), dbUser.passwordHash))
            throw new ForbiddenException("当前密码错误");
        await this.prisma.user.update({ where: { id: user.id }, data: { passwordHash: bcrypt.hashSync(body.newPassword, 10) } });
        return { ok: true };
    }
};
ProfileService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaService])
], ProfileService);
export { ProfileService };
//# sourceMappingURL=profile.service.js.map