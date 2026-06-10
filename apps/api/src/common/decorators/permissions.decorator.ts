import { SetMetadata } from "@nestjs/common";

export const PERMISSION_KEY = "permission";
export const RequirePermission = (scope: string) => SetMetadata(PERMISSION_KEY, scope);

export const ROLE_KEY = "role";
export const RequireRole = (role: string) => SetMetadata(ROLE_KEY, role);
