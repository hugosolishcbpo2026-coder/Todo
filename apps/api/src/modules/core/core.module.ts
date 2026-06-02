import { Global, Module } from "@nestjs/common";
import { openDatabase, SQLITE_DB } from "./database";
import { StoreService } from "./store.service";

/**
 * Global module exposing the shared persistence layer ({@link StoreService})
 * and the underlying SQLite connection to every other module.
 */
@Global()
@Module({
  providers: [
    { provide: SQLITE_DB, useFactory: () => openDatabase() },
    StoreService,
  ],
  exports: [StoreService, SQLITE_DB],
})
export class CoreModule {}
