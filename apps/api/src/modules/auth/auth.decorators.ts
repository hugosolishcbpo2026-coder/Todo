import { createParamDecorator, ExecutionContext, SetMetadata } from "@nestjs/common";
import { UserRole } from "@todo/shared";

/** JWT payload attached to the request by {@link JwtAuthGuard}. */
export interface AuthUser {
  sub: string;
  phone: string;
  role: UserRole;
}

export const IS_PUBLIC_KEY = "isPublic";
/** Mark a route as accessible without authentication. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ROLES_KEY = "roles";
/** Restrict a route to one or more roles (enforced by RolesGuard). */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

/** Inject the authenticated user (or a single field of it) into a handler. */
export const CurrentUser = createParamDecorator(
  (field: keyof AuthUser | undefined, ctx: ExecutionContext): AuthUser | string => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthUser }>();
    return field ? request.user?.[field] : request.user;
  },
);
