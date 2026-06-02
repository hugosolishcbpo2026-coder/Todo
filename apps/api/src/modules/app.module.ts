import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AdminModule } from "./admin/admin.module";
import { AuthModule } from "./auth/auth.module";
import { DriversModule } from "./drivers/drivers.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { PaymentsModule } from "./payments/payments.module";
import { RealtimeModule } from "./realtime/realtime.module";
import { RidesModule } from "./rides/rides.module";
import { StorageModule } from "./storage/storage.module";
import { WebhooksModule } from "./webhooks/webhooks.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    DriversModule,
    RidesModule,
    PaymentsModule,
    NotificationsModule,
    RealtimeModule,
    StorageModule,
    AdminModule,
    WebhooksModule
  ]
})
export class AppModule {}
