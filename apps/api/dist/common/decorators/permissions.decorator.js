import { SetMetadata } from "@nestjs/common";
export const PERMISSION_KEY = "permission";
export const RequirePermission = (scope) => SetMetadata(PERMISSION_KEY, scope);
export const ROLE_KEY = "role";
export const RequireRole = (role) => SetMetadata(ROLE_KEY, role);
//# sourceMappingURL=permissions.decorator.js.map