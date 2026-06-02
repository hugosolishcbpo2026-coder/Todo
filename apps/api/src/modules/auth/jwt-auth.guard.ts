import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { AuthUser, IS_PUBLIC_KEY } from "./auth.decorators";

interface RequestWithAuth {
  headers: { authorization?: string };
  user?: AuthUser;
}

/**
 * Global guard that verifies the `Authorization: Bearer <jwt>` header and
 * attaches the decoded payload to `request.user`. Routes decorated with
 * `@Public()` bypass verification.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<RequestWithAuth>();
    const header = request.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing bearer token");
    }

    try {
      request.user = this.jwt.verify<AuthUser>(header.slice(7));
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }
  }
}
