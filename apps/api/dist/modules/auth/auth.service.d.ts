import { PrismaService } from "../../prisma/prisma.service.js";
export declare class AuthService {
    private prisma;
    constructor(prisma: PrismaService);
    getClientIp(headers: Record<string, any>, remoteAddress?: string): string;
    isIpAllowed(userId: string, ip: string): Promise<boolean>;
    private createSession;
    login(body: any, ip: string, userAgent?: string): Promise<{
        token: string;
        user: {
            id: string;
            username: string;
            name: string;
            role: import("@prisma/client").$Enums.UserRole;
            enabled: true;
            avatar: string;
            signature: string;
            theme: string;
            customWallpaper: any;
            customBlur: any;
        };
    }>;
    logout(token: string, ip: string): Promise<{
        ok: boolean;
    }>;
    refreshSession(token: string, ip: string): Promise<{
        user: {
            id: string;
            username: string;
            name: string;
            role: import("@prisma/client").$Enums.UserRole;
            enabled: true;
            avatar: string;
            signature: string;
            theme: string;
            customWallpaper: any;
            customBlur: any;
        };
        session: {
            id: string;
            userId: string;
            ip: string;
            lastActivityAt: string;
        };
    }>;
    getMe(token: string, ip: string): Promise<{
        user: {
            id: string;
            username: string;
            name: string;
            role: import("@prisma/client").$Enums.UserRole;
            enabled: true;
            avatar: string;
            signature: string;
            theme: string;
            customWallpaper: any;
            customBlur: any;
        };
        session: {
            id: string;
            userId: string;
            ip: string;
            lastActivityAt: string;
        };
    }>;
    getCurrentUser(token: string, ip: string): Promise<{
        id: string;
        username: string;
        name: string;
        role: import("@prisma/client").$Enums.UserRole;
        enabled: true;
        avatar: string;
        signature: string;
        theme: string;
        customWallpaper: any;
        customBlur: any;
    }>;
    isAdmin(user: any): boolean;
}
