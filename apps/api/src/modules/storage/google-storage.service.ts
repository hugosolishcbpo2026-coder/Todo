import { Injectable } from "@nestjs/common";

interface StorageRecord {
  category: "driver_document" | "vehicle_document" | "backup" | "export" | "memory";
  fileName: string;
  ownerId?: string;
}

@Injectable()
export class GoogleStorageService {
  createStorageInstruction(record: StorageRecord) {
    return {
      provider: "google_drive",
      mode: process.env.GOOGLE_STORAGE_MODE ?? "manual",
      account: process.env.GOOGLE_ACCOUNT_EMAIL ?? "not_configured",
      rootFolderId: process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID ?? null,
      record,
      instruction:
        "Upload this file to the configured Google Drive folder and store the resulting Drive file ID in PostgreSQL."
    };
  }
}
