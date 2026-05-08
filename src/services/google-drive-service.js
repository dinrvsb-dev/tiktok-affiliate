import fs from "node:fs";
import path from "node:path";
import { google } from "googleapis";
import { config, isConfigured } from "../config.js";
import { ensureDir } from "../lib/fs-utils.js";

export class GoogleDriveService {
  constructor(authClient) {
    this.authClient = authClient;
    this.drive = authClient ? google.drive({ version: "v3", auth: authClient }) : null;
  }

  async uploadImage({ filePath, fileName, mimeType }) {
    if (this.drive && isConfigured(config.google.driveFolderId)) {
      const createResponse = await this.drive.files.create({
        requestBody: {
          name: fileName,
          parents: [config.google.driveFolderId]
        },
        media: {
          mimeType,
          body: fs.createReadStream(filePath)
        },
        fields: "id, webViewLink, webContentLink"
      });

      return {
        storage: "drive",
        driveFileId: createResponse.data.id || "",
        driveFileUrl:
          createResponse.data.webViewLink || createResponse.data.webContentLink || "",
        localPath: filePath
      };
    }

    await ensureDir(config.mediaDir);
    const fallbackPath = path.resolve(config.mediaDir, fileName);
    if (fallbackPath !== filePath) {
      await fs.promises.copyFile(filePath, fallbackPath);
    }

    return {
      storage: "local",
      driveFileId: "",
      driveFileUrl: "",
      localPath: fallbackPath
    };
  }
}
