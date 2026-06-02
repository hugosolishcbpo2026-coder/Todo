import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "../auth/auth.decorators";

@ApiTags("health")
@Public()
@Controller("health")
export class HealthController {
  private readonly startedAt = Date.now();

  @Get()
  check() {
    return {
      status: "ok",
      service: "todo-api",
      version: process.env.npm_package_version ?? "0.1.0",
      uptimeSeconds: Math.round((Date.now() - this.startedAt) / 1000),
      timestamp: new Date().toISOString(),
    };
  }
}
