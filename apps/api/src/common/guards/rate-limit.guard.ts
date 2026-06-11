import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator.js";
import { clientIp } from "../utils/index.js";
import { RedisService } from "../../redis/redis.service.js";
import { AppConfigService } from "../../config/app-config.service.js";

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private reflector: Reflector, private redis: RedisService, private config: AppConfigService) {}

  async canActivate(context: ExecutionContext) {
    if (!this.config.rateLimitEnabled) return true;
    const request = context.switchToHttp().getRequest();
    if (request.path?.startsWith("/api/health")) return true;

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const ip = clientIp(request.headers || {}, request.socket?.remoteAddress || "127.0.0.1");
    const route = `${request.method}:${request.route?.path || request.path || request.url}`;
    const isLogin = route.includes("auth/login");
    const max = isLogin ? this.config.loginRateLimitMax : this.config.rateLimitMax;
    const windowSeconds = this.config.rateLimitWindowSeconds;
    const key = `rate:${isPublic ? "public" : "auth"}:${route}:${ip}`;

    const count = await this.redis.incrementWithTtl(key, windowSeconds);
    if (count > max) throw new HttpException("请求过于频繁，请稍后再试", HttpStatus.TOO_MANY_REQUESTS);
    return true;
  }
}
