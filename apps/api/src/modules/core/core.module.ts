import { Global, Module } from "@nestjs/common";
import { StoreService } from "./store.service";

/**
 * Global module exposing the shared persistence layer ({@link StoreService})
 * to every other module without explicit imports.
 */
@Global()
@Module({
  providers: [StoreService],
  exports: [StoreService],
})
export class CoreModule {}
