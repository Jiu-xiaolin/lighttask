import {
  Injectable, CanActivate, ExecutionContext,
  UnauthorizedException, ServiceUnavailableException, Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { sha256, clientIp, ipInCidr } from "../utils/index.js";

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(private reflector: Reflector, private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const token = (request.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
    if (!token) throw new UnauthorizedException("请先登录");

    const ip = clientIp(request.headers || {}, request.socket?.remoteAddress || "127.0.0.1");
    const tokenHash = sha256(token);

    // Validate session
    let session;
    try {
      session = await this.prisma.session.findUnique({ where: { tokenHash } });
    } catch (err) {
      this.logger.error(`Session lookup failed: ${err}`);
      throw new ServiceUnavailableException("服务暂时不可用，请稍后重试");
    }

    if (!session) {
      throw new UnauthorizedException("登录状态已失效，请重新登录");
    }
    if (session.revoked) {
      throw new UnauthorizedException(
        session.revokedReason === "idle_timeout" ? "长时间未操作，请重新登录"
        : session.revokedReason === "ip_not_allowed" ? "当前网络环境已变更，请重新登录"
        : "会话已注销，请重新登录"
      );
    }

    // Check idle timeout
    const idleMs = Date.now() - session.lastActivityAt.getTime();
    if (idleMs > 24 * 60 * 60 * 1000) {
      await this.prisma.session.update({
        where: { id: session.id },
        data: { revoked: true, revokedReason: "idle_timeout" },
      }).catch(() => {});
      throw new UnauthorizedException("长时间未操作，请重新登录");
    }

    // Get user
    let user;
    try {
      user = await this.prisma.user.findUnique({ where: { id: session.userId } });
    } catch (err) {
      this.logger.error(`User lookup failed: ${err}`);
      throw new ServiceUnavailableException("服务暂时不可用");
    }
    if (!user || !user.enabled) {
      throw new UnauthorizedException("账号已被禁用或不存在");
    }

    // Check IP whitelist
    try {
      const policy = await this.prisma.userIpPolicy.findUnique({ where: { userId: user.id } });
      if (policy?.enabled) {
        const entries = await this.prisma.userIpWhitelistEntry.findMany({ where: { userId: user.id, enabled: true } });
        const allowed = entries.some((e) => e.value === ip || ipInCidr(ip, e.value));
        if (!allowed) {
          await this.prisma.session.update({
            where: { id: session.id },
            data: { revoked: true, revokedReason: "ip_not_allowed" },
          }).catch(() => {});
          throw new UnauthorizedException("当前网络环境已变更，请重新登录");
        }
      }
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      this.logger.warn(`IP check skipped: ${err}`);
      // Continue — don't block on IP check failure
    }

    // Bump last activity (non-blocking)
    this.prisma.session.update({
      where: { id: session.id },
      data: { lastActivityAt: new Date() },
    }).catch((err) => this.logger.warn(`Failed to bump activity: ${err.message}`));

    request.user = user;
    request.session = session;
    return true;
  }
}
