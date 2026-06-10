import { CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "../../prisma/prisma.service.js";
export declare class AuthGuard implements CanActivate {
    private reflector;
    private prisma;
    private readonly logger;
    constructor(reflector: Reflector, prisma: PrismaService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
