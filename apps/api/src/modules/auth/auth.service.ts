import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from "@nestjs/common";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaService } from "../../prisma/prisma.service.js";
import { sha256, clientIp, ipInCidr, genId } from "../../common/utils/index.js";

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  // ---- IP helpers ----
  getClientIp(headers: Record<string, any>, remoteAddress = "127.0.0.1") {
    return clientIp(headers, remoteAddress);
  }

  isIpAllowed(userId: string, ip: string) {
    return this.prisma.userIpPolicy
      .findUnique({ where: { userId } })
      .then(async (policy) => {
        if (!policy?.enabled) return true;
        const entries = await this.prisma.userIpWhitelistEntry.findMany({
          where: { userId, enabled: true },
        });
        return entries.some((e) => e.value === ip || ipInCidr(ip, e.value));
      })
      .catch(() => true);
  }

  // ---- Session management ----
  private async createSession(userId: string, ip: string, userAgent = "") {
    const token = `lt_${randomBytes(24).toString("hex")}`;
    const tokenHash = sha256(token);
    const session = await this.prisma.session.create({
      data: {
        id: genId("sess"),
        tokenHash,
        userId,
        ip,
        userAgent,
        lastActivityAt: new Date(),
      },
    });
    return { token, session };
  }

  // ---- Auth ----
  async login(body: any, ip: string, userAgent = "") {
    const dbUser = await this.prisma.user.findUnique({
      where: { username: body.username },
    });

    if (!dbUser || !dbUser.enabled || !bcrypt.compareSync(String(body.password || ""), dbUser.passwordHash)) {
      throw new UnauthorizedException("账号或密码错误");
    }

    if (!(await this.isIpAllowed(dbUser.id, ip))) {
      throw new ForbiddenException("当前网络不允许访问");
    }

    const { token } = await this.createSession(dbUser.id, ip, userAgent);
    return {
      token,
      user: {
        id: dbUser.id,
        username: dbUser.username,
        name: dbUser.name,
        role: dbUser.role,
        enabled: dbUser.enabled,
        avatar: dbUser.avatar || "",
        signature: dbUser.signature || "",
        theme: dbUser.theme || "letter",
        customWallpaper: ((dbUser.themeConfig as any) || {}).customWallpaper || "",
        customBlur: ((dbUser.themeConfig as any) || {}).customBlur || 0,
      },
    };
  }

  async logout(token: string, ip: string) {
    if (!token) throw new UnauthorizedException("请先登录");
    const raw = token.replace(/^Bearer\s+/i, "");
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: sha256(raw) },
    });
    if (!session || session.revoked) throw new UnauthorizedException("登录状态已失效");

    await this.prisma.session.update({
      where: { id: session.id },
      data: { revoked: true, revokedReason: "user_logout" },
    });
    return { ok: true };
  }

  async refreshSession(token: string, ip: string) {
    if (!token) throw new UnauthorizedException("请先登录");
    const raw = token.replace(/^Bearer\s+/i, "");
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: sha256(raw) },
    });
    if (!session || session.revoked) throw new UnauthorizedException("登录状态已失效");
    const idleMs = Date.now() - session.lastActivityAt.getTime();
    if (idleMs > 24 * 60 * 60 * 1000) {
      await this.prisma.session.update({ where: { id: session.id }, data: { revoked: true, revokedReason: "idle_timeout" } });
      throw new UnauthorizedException("长时间未操作，请重新登录");
    }

    const user = await this.prisma.user.findUnique({ where: { id: session.userId } });
    if (!user || !user.enabled) throw new UnauthorizedException("用户不可用");
    if (!(await this.isIpAllowed(user.id, ip))) {
      await this.prisma.session.update({ where: { id: session.id }, data: { revoked: true, revokedReason: "ip_not_allowed" } });
      throw new ForbiddenException("当前网络不允许访问");
    }

    const updatedSession = await this.prisma.session.update({
      where: { id: session.id },
      data: { lastActivityAt: new Date() },
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        enabled: user.enabled,
        avatar: user.avatar || "",
        signature: user.signature || "",
        theme: user.theme || "letter",
        customWallpaper: ((user.themeConfig as any) || {}).customWallpaper || "",
        customBlur: ((user.themeConfig as any) || {}).customBlur || 0,
      },
      session: { id: updatedSession.id, userId: updatedSession.userId, ip: updatedSession.ip, lastActivityAt: updatedSession.lastActivityAt.toISOString() },
    };
  }

  async getMe(token: string, ip: string) {
    return this.refreshSession(token, ip);
  }

  async getCurrentUser(token: string, ip: string) {
    return (await this.refreshSession(token, ip)).user;
  }

  isAdmin(user: any) {
    return user?.role === "SUPER_ADMIN";
  }
}
