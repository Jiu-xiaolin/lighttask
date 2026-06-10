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
import { Body, Controller, Get, Headers, Post, Req } from "@nestjs/common";
import { AuthService } from "./auth.service.js";
import { Public } from "../../common/decorators/index.js";
let AuthController = class AuthController {
    auth;
    constructor(auth) {
        this.auth = auth;
    }
    login(body, req) {
        return this.auth.login(body, this.auth.getClientIp(req.headers, req.socket?.remoteAddress), String(req.headers["user-agent"] || ""));
    }
    me(authorization, req) {
        return this.auth.getMe(authorization, this.auth.getClientIp(req.headers, req.socket?.remoteAddress));
    }
    logout(authorization, req) {
        return this.auth.logout(authorization, this.auth.getClientIp(req.headers, req.socket?.remoteAddress));
    }
    refreshSession(authorization, req) {
        return this.auth.refreshSession(authorization, this.auth.getClientIp(req.headers, req.socket?.remoteAddress));
    }
};
__decorate([
    Public(),
    Post("auth/login"),
    __param(0, Body()),
    __param(1, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "login", null);
__decorate([
    Get("auth/me"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "me", null);
__decorate([
    Post("auth/logout"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "logout", null);
__decorate([
    Post("auth/refresh"),
    __param(0, Headers("authorization")),
    __param(1, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "refreshSession", null);
AuthController = __decorate([
    Controller(),
    __metadata("design:paramtypes", [AuthService])
], AuthController);
export { AuthController };
//# sourceMappingURL=auth.controller.js.map