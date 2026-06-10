import { AuthService } from "./auth.service.js";
export declare class AuthController {
    private readonly auth;
    constructor(auth: AuthService);
    login(body: any, req: any): Promise<{
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
    me(authorization: string, req: any): Promise<{
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
    logout(authorization: string, req: any): Promise<{
        ok: boolean;
    }>;
    refreshSession(authorization: string, req: any): Promise<{
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
}
