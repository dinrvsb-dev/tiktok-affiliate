import fs from "node:fs/promises";
import path from "node:path";
import { config, isConfigured } from "../config.js";
import { fetchJson } from "../lib/http.js";
import { ensureDir } from "../lib/fs-utils.js";

function graphUrl(endpoint) {
  return `https://graph.facebook.com/${config.whatsapp.graphVersion}/${endpoint}`;
}

export class WhatsAppService {
  isReady() {
    return (
      isConfigured(config.whatsapp.accessToken) &&
      isConfigured(config.whatsapp.phoneNumberId)
    );
  }

  async downloadMedia(mediaId, targetFilePath) {
    if (!this.isReady()) {
      throw new Error("WhatsApp credentials are not configured.");
    }

    const mediaInfo = await fetchJson(graphUrl(mediaId), {
      headers: {
        Authorization: `Bearer ${config.whatsapp.accessToken}`
      }
    });

    const response = await fetch(mediaInfo.url, {
      headers: {
        Authorization: `Bearer ${config.whatsapp.accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to download WhatsApp media: ${response.status}`);
    }

    await ensureDir(path.dirname(targetFilePath));
    const arrayBuffer = await response.arrayBuffer();
    await fs.writeFile(targetFilePath, Buffer.from(arrayBuffer));

    return {
      mimeType: mediaInfo.mime_type || "image/jpeg",
      localPath: targetFilePath
    };
  }

  async sendTextMessage(to, body) {
    if (!this.isReady()) {
      return { skipped: true };
    }

    await fetchJson(graphUrl(`${config.whatsapp.phoneNumberId}/messages`), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.whatsapp.accessToken}`
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: {
          body
        }
      })
    });

    return { skipped: false };
  }
}
