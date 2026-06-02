import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserRole } from "@todo/shared";
import { AuthUser, ROLES_KEY } from "./auth.decorators";

/**
 * Enforces `@Roles(...)` metadata against the authenticated user's role.
 * Runs after {@link JwtAuthGuard}, so `request.user` is already populated.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    if (!user || !required.includes(user.role)) {
      throw new ForbiddenException(`Requires role: ${required.join(", ")}`);
    }
    return true;
  }
}
