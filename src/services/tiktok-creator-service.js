import crypto from "node:crypto";
import fs from "node:fs/promises";
import { config } from "../config.js";

const OAUTH_BASE = "https://www.tiktok.com";
const API_BASE = "https://open.tiktokapis.com/v2";

function generateCodeVerifier() {
  return crypto.randomBytes(64).toString("base64url");
}

function generateCodeChallenge(verifier) {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

export class TiktokCreatorService {
  constructor() {
    this.clientKey = config.tiktokCreator.clientKey;
    this.clientSecret = config.tiktokCreator.clientSecret;
  }

  buildAuthUrl(redirectUri, { state, scopes = [] } = {}) {
    const verifier = generateCodeVerifier();
    const challenge = generateCodeChallenge(verifier);
    const defaultScopes = ["user.info.basic", "video.upload", "video.publish"];
    const scope = [...new Set([...defaultScopes, ...scopes])].join(",");

    const params = new URLSearchParams({
      client_key: this.clientKey,
      scope,
      response_type: "code",
      redirect_uri: redirectUri,
      state: state || "connect",
      code_challenge: challenge,
      code_challenge_method: "S256"
    });

    return {
      url: `${OAUTH_BASE}/v2/auth/authorize/?${params}`,
      verifier
    };
  }

  async exchangeCode(code, redirectUri, codeVerifier) {
    const body = new URLSearchParams({
      client_key: this.clientKey,
      client_secret: this.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code_verifier: codeVerifier
    });

    const res = await fetch(`${API_BASE}/oauth/token/`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString()
    });
    const raw = await res.text();
    console.log("[TikTokCreator] token exchange:", raw.slice(0, 300));
    const data = JSON.parse(raw);
    if (data.error) throw new Error(`Token exchange failed: ${data.error_description || data.error}`);
    return data;
  }

  async refreshToken(refreshToken) {
    const body = new URLSearchParams({
      client_key: this.clientKey,
      client_secret: this.clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken
    });

    const res = await fetch(`${API_BASE}/oauth/token/`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString()
    });
    const data = await res.json();
    if (data.error) throw new Error(`Token refresh failed: ${data.error_description || data.error}`);
    return data;
  }

  async getUserInfo(accessToken) {
    const res = await fetch(`${API_BASE}/user/info/?fields=open_id,display_name,avatar_url,follower_count`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const data = await res.json();
    if (data.error?.code !== "ok") throw new Error(`User info failed: ${data.error?.message}`);
    return data.data?.user || {};
  }

  async ensureFreshToken(account) {
    const expiresAt = new Date(account.expiresAt).getTime();
    if (Date.now() < expiresAt - 5 * 60 * 1000) return account.accessToken;

    const tokenData = await this.refreshToken(account.refreshToken);
    account.accessToken = tokenData.access_token;
    account.refreshToken = tokenData.refresh_token || account.refreshToken;
    account.expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
    return account.accessToken;
  }

  async postPhoto(accessToken, { title, imageUrls, privacyLevel = "PUBLIC_TO_EVERYONE", scheduledAt } = {}) {
    const body = {
      post_info: {
        title: title || "",
        privacy_level: privacyLevel,
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false
      },
      source_info: {
        source: "PULL_FROM_URL",
        photo_cover_index: 0,
        photo_images: imageUrls
      },
      media_type: "PHOTO"
    };

    if (scheduledAt) {
      body.post_info.scheduled_publish_time = Math.floor(new Date(scheduledAt).getTime() / 1000);
    }

    const res = await fetch(`${API_BASE}/post/publish/content/init/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    console.log("[TikTokCreator] postPhoto:", JSON.stringify(data).slice(0, 300));
    if (data.error?.code !== "ok") throw new Error(`Photo post failed: ${data.error?.message} (${data.error?.code})`);
    return data.data;
  }

  async initVideoUpload(accessToken, { title, videoSize, privacyLevel = "PUBLIC_TO_EVERYONE", scheduledAt } = {}) {
    const chunkSize = 10 * 1024 * 1024; // 10MB
    const totalChunks = Math.ceil(videoSize / chunkSize);

    const body = {
      post_info: {
        title: title || "",
        privacy_level: privacyLevel,
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false
      },
      source_info: {
        source: "FILE_UPLOAD",
        video_size: videoSize,
        chunk_size: chunkSize,
        total_chunk_count: totalChunks
      }
    };

    if (scheduledAt) {
      body.post_info.scheduled_publish_time = Math.floor(new Date(scheduledAt).getTime() / 1000);
    }

    const res = await fetch(`${API_BASE}/post/publish/video/init/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.error?.code !== "ok") throw new Error(`Video init failed: ${data.error?.message} (${data.error?.code})`);
    return data.data; // { publish_id, upload_url }
  }

  async uploadVideoChunks(uploadUrl, videoPath, videoSize) {
    const chunkSize = 10 * 1024 * 1024;
    const totalChunks = Math.ceil(videoSize / chunkSize);
    const fileHandle = await fs.open(videoPath, "r");

    try {
      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize - 1, videoSize - 1);
        const length = end - start + 1;
        const buffer = Buffer.allocUnsafe(length);
        await fileHandle.read(buffer, 0, length, start);

        const res = await fetch(uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": "video/mp4",
            "Content-Range": `bytes ${start}-${end}/${videoSize}`,
            "Content-Length": String(length)
          },
          body: buffer
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Chunk ${i} upload failed (${res.status}): ${text.slice(0, 200)}`);
        }
        console.log(`[TikTokCreator] chunk ${i + 1}/${totalChunks} uploaded`);
      }
    } finally {
      await fileHandle.close();
    }
  }

  async postVideo(accessToken, { title, videoPath, videoSize, privacyLevel = "PUBLIC_TO_EVERYONE", scheduledAt } = {}) {
    const { publish_id, upload_url } = await this.initVideoUpload(accessToken, {
      title,
      videoSize,
      privacyLevel,
      scheduledAt
    });

    await this.uploadVideoChunks(upload_url, videoPath, videoSize);
    return { publishId: publish_id };
  }

  async postVideoFromUrl(accessToken, { title, videoUrl, privacyLevel = "PUBLIC_TO_EVERYONE", scheduledAt } = {}) {
    const body = {
      post_info: {
        title: title || "",
        privacy_level: privacyLevel,
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false
      },
      source_info: {
        source: "PULL_FROM_URL",
        video_url: videoUrl
      }
    };

    if (scheduledAt) {
      body.post_info.scheduled_publish_time = Math.floor(new Date(scheduledAt).getTime() / 1000);
    }

    const res = await fetch(`${API_BASE}/post/publish/video/init/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.error?.code !== "ok") throw new Error(`Video post failed: ${data.error?.message} (${data.error?.code})`);
    return data.data; // { publish_id }
  }

  async getPostStatus(accessToken, publishId) {
    const res = await fetch(`${API_BASE}/post/publish/status/fetch/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({ publish_id: publishId })
    });
    const data = await res.json();
    if (data.error?.code !== "ok") throw new Error(`Status fetch failed: ${data.error?.message}`);
    return data.data; // { status, published_item_id? }
  }
}
