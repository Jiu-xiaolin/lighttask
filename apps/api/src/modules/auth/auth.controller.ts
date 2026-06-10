import { Body, Controller, Get, Headers, Post, Req } from "@nestjs/common";
import { AuthService } from "./auth.service.js";
import { Public } from "../../common/decorators/index.js";

@Controller()
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post("auth/login")
  login(@Body() body: any, @Req() req: any) {
    return this.auth.login(body, this.auth.getClientIp(req.headers, req.socket?.remoteAddress), String(req.headers["user-agent"] || ""));
  }

  @Get("auth/me")
  me(@Headers("authorization") authorization: string, @Req() req: any) {
    return this.auth.getMe(authorization, this.auth.getClientIp(req.headers, req.socket?.remoteAddress));
  }

  @Post("auth/logout")
  logout(@Headers("authorization") authorization: string, @Req() req: any) {
    return this.auth.logout(authorization, this.auth.getClientIp(req.headers, req.socket?.remoteAddress));
  }

  @Post("auth/refresh")
  refreshSession(@Headers("authorization") authorization: string, @Req() req: any) {
    return this.auth.refreshSession(authorization, this.auth.getClientIp(req.headers, req.socket?.remoteAddress));
  }
}
