import express from "express";
import crypto from "node:crypto";
import { ContentGenerator } from "../services/content-generator.js";
import { TiktokCreatorService } from "../services/tiktok-creator-service.js";
import { PostStore } from "../services/post-store.js";

export function createContentStudioRouter() {
  const generator = new ContentGenerator();
  const tiktok = new TiktokCreatorService();
  const store = new PostStore();
  const router = express.Router();

  // ── Config ──────────────────────────────────────────────────────────────────

  router.get("/config", (_req, res) => {
    const oauthBase = config.creatorOauthBaseUrl || config.appBaseUrl;
    res.json({ oauthConnectUrl: `${oauthBase}/auth/creator/connect` });
  });

  // ── Accounts ────────────────────────────────────────────────────────────────

  router.get("/accounts", async (req, res, next) => {
    try {
      const accounts = await store.listAccounts();
      res.json({ accounts: accounts.map(({ accessToken, refreshToken, ...safe }) => safe) });
    } catch (err) {
      next(err);
    }
  });

  router.delete("/accounts/:openId", async (req, res, next) => {
    try {
      await store.deleteAccount(req.params.openId);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  // ── Content generation ───────────────────────────────────────────────────────

  router.post("/generate", async (req, res, next) => {
    try {
      const { niche, product, imageStyle = "product showcase", language = "ms" } = req.body;
      if (!niche) return res.status(400).json({ error: "niche diperlukan" });

      const result = await generator.generateContent({ niche, product, imageStyle, language });
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  router.post("/generate/caption", async (req, res, next) => {
    try {
      const { niche, product, imageStyle = "product showcase", language = "ms" } = req.body;
      if (!niche) return res.status(400).json({ error: "niche diperlukan" });

      const result = await generator.generateCaptionOnly({ niche, product, imageStyle, language });
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // ── Posts ────────────────────────────────────────────────────────────────────

  router.get("/posts", async (req, res, next) => {
    try {
      const posts = await store.listPosts({ status: req.query.status });
      res.json({ posts });
    } catch (err) {
      next(err);
    }
  });

  router.post("/posts", async (req, res, next) => {
    try {
      const {
        openId,
        type = "photo",           // "photo" | "video_url"
        caption,
        hashtags,
        imageUrls,                 // array of URLs for photo post
        videoUrl,                  // for video_url type
        privacyLevel = "PUBLIC_TO_EVERYONE",
        scheduledAt               // ISO date string, optional
      } = req.body;

      if (!caption) return res.status(400).json({ error: "caption diperlukan" });

      // Get connected account
      const account = openId ? await store.getAccount(openId) : await store.getDefaultAccount();
      if (!account) return res.status(400).json({ error: "Tiada akaun TikTok yang disambungkan" });

      const accessToken = await tiktok.ensureFreshToken(account);
      await store.saveAccount(account); // persist refreshed token

      const fullTitle = `${caption}\n\n${hashtags || ""}`.trim();
      let publishResult;

      if (type === "photo") {
        if (!imageUrls?.length) return res.status(400).json({ error: "imageUrls diperlukan untuk photo post" });
        publishResult = await tiktok.postPhoto(accessToken, {
          title: fullTitle,
          imageUrls,
          privacyLevel,
          scheduledAt
        });
      } else if (type === "video_url") {
        if (!videoUrl) return res.status(400).json({ error: "videoUrl diperlukan untuk video post" });
        publishResult = await tiktok.postVideoFromUrl(accessToken, {
          title: fullTitle,
          videoUrl,
          privacyLevel,
          scheduledAt
        });
      } else {
        return res.status(400).json({ error: `Jenis post tidak disokong: ${type}` });
      }

      const post = {
        id: crypto.randomUUID(),
        openId: account.openId,
        displayName: account.displayName,
        type,
        caption,
        hashtags: hashtags || "",
        imageUrls: imageUrls || [],
        videoUrl: videoUrl || null,
        privacyLevel,
        scheduledAt: scheduledAt || null,
        publishId: publishResult?.publish_id || null,
        status: scheduledAt ? "scheduled" : "published",
        createdAt: new Date().toISOString()
      };

      await store.savePost(post);
      res.status(201).json({ post });
    } catch (err) {
      next(err);
    }
  });

  router.get("/posts/:id/status", async (req, res, next) => {
    try {
      const post = await store.getPost(req.params.id);
      if (!post) return res.status(404).json({ error: "Post tidak dijumpai" });
      if (!post.publishId) return res.json({ post, tiktokStatus: null });

      const account = await store.getAccount(post.openId);
      if (!account) return res.status(400).json({ error: "Akaun tidak dijumpai" });

      const accessToken = await tiktok.ensureFreshToken(account);
      await store.saveAccount(account);

      const tiktokStatus = await tiktok.getPostStatus(accessToken, post.publishId);

      if (tiktokStatus.status === "PUBLISH_COMPLETE") {
        await store.updatePost(post.id, { status: "published", publishedItemId: tiktokStatus.published_item_id });
      } else if (tiktokStatus.status === "FAILED") {
        await store.updatePost(post.id, { status: "failed", failReason: tiktokStatus.fail_reason });
      }

      res.json({ post: await store.getPost(post.id), tiktokStatus });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
