import express from "express";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../config.js";
import { ClaudeCopywriter } from "../services/claude-copywriter.js";
import { CopyHistoryStore } from "../services/copy-history-store.js";
import { KitStore } from "../services/kit-store.js";
import { AccountStore } from "../services/account-store.js";
import { PostStore } from "../services/post-store.js";
import { TiktokCreatorService } from "../services/tiktok-creator-service.js";
import { createGoogleAuthClient } from "../services/google-auth.js";
import { GoogleSheetsService } from "../services/google-sheets-service.js";

const BATCH_MEDIA_DIR = path.join(config.mediaDir, "batch");

let _sheets = null;
function getSheets() {
  if (!_sheets) {
    try {
      _sheets = new GoogleSheetsService(createGoogleAuthClient());
    } catch (_) {}
  }
  return _sheets;
}

async function logToSheets(tabName, row) {
  try {
    const s = getSheets();
    if (!s?.isReady()) return;
    await s.ensureSheetExists(tabName);
    await s.sheets.spreadsheets.values.append({
      spreadsheetId: config.google.spreadsheetId,
      range: `${tabName}!A1`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [row] }
    });
  } catch (_) { /* sheets is optional */ }
}

export function createBatchPublisherRouter() {
  const copywriter = new ClaudeCopywriter();
  const historyStore = new CopyHistoryStore();
  const kitStore = new KitStore();
  const accountStore = new AccountStore();
  const postStore = new PostStore();
  const tiktok = new TiktokCreatorService();
  const router = express.Router();

  // ── Accounts + DNA ─────────────────────────────────────────────────────────

  router.get("/accounts", async (req, res, next) => {
    try {
      const accounts = await accountStore.list();
      res.json({
        accounts: accounts.map(({ password, ...safe }) => safe)
      });
    } catch (err) { next(err); }
  });

  router.put("/accounts/:id/dna", async (req, res, next) => {
    try {
      const { systemInstruction } = req.body;
      const account = await accountStore.getById(req.params.id);
      if (!account) return res.status(404).json({ error: "Akaun tidak dijumpai" });
      account.systemInstruction = systemInstruction ?? "";
      await accountStore.save(account);
      res.json({ ok: true });
    } catch (err) { next(err); }
  });

  // ── Image upload ────────────────────────────────────────────────────────────

  // Called by Custom GPT Action — fetch image from ChatGPT URL and save locally
  // Body: { imageUrl: "https://oaidalleapiprodscus...", filename?: "...", label?: "..." }
  router.post("/receive-image", async (req, res, next) => {
    try {
      await fs.mkdir(BATCH_MEDIA_DIR, { recursive: true });
      const { imageUrl, filename, label } = req.body;
      if (!imageUrl) return res.status(400).json({ error: "imageUrl diperlukan" });

      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error(`Gagal fetch gambar dari ChatGPT: ${response.status}`);

      const buffer = await response.arrayBuffer();
      const contentType = response.headers.get("content-type") || "image/jpeg";
      const ext = contentType.split("/")[1]?.split(";")[0]?.replace("jpeg", "jpg") || "jpg";
      const name = filename || `chatgpt-${crypto.randomUUID()}.${ext}`;

      await fs.writeFile(path.join(BATCH_MEDIA_DIR, name), Buffer.from(buffer));

      const savedUrl = `${config.appBaseUrl}/media/batch/${name}`;
      console.log(`[BatchPublisher] Image received from ChatGPT: ${savedUrl}`);

      res.json({
        ok: true,
        imageUrl: savedUrl,
        filename: name,
        label: label || name,
        message: "Gambar berjaya disimpan ke webapp. Buka Batch Publisher untuk guna gambar ini."
      });
    } catch (err) { next(err); }
  });

  // Body: { imageData: "data:image/jpeg;base64,...", filename?: "name.jpg" }
  router.post("/upload-image", async (req, res, next) => {
    try {
      await fs.mkdir(BATCH_MEDIA_DIR, { recursive: true });
      const { imageData, filename } = req.body;
      if (!imageData) return res.status(400).json({ error: "imageData diperlukan" });

      const base64 = imageData.replace(/^data:image\/\w+;base64,/, "");
      const ext = imageData.match(/^data:image\/(\w+);/)?.[1] || "jpg";
      const name = filename || `${crypto.randomUUID()}.${ext}`;
      await fs.writeFile(path.join(BATCH_MEDIA_DIR, name), Buffer.from(base64, "base64"));

      const imageUrl = `${config.appBaseUrl}/media/batch/${name}`;
      res.json({ imageUrl, filename: name });
    } catch (err) { next(err); }
  });

  // List recently received images (from ChatGPT or uploads)
  router.get("/images", async (req, res, next) => {
    try {
      await fs.mkdir(BATCH_MEDIA_DIR, { recursive: true });
      const files = await fs.readdir(BATCH_MEDIA_DIR);
      const images = files
        .filter((f) => /\.(jpg|jpeg|png|webp|gif)$/i.test(f))
        .map((f) => ({
          filename: f,
          imageUrl: `${config.appBaseUrl}/media/batch/${f}`
        }))
        .slice(-20); // last 20
      res.json({ images: images.reverse() });
    } catch (err) { next(err); }
  });

  // ── Copy generation ──────────────────────────────────────────────────────────

  // Body: { accountIds: [...], niche, product?, language? }
  router.post("/generate-copy", async (req, res, next) => {
    try {
      const { accountIds, niche, product, language = "ms" } = req.body;
      if (!accountIds?.length) return res.status(400).json({ error: "accountIds diperlukan" });
      if (!niche) return res.status(400).json({ error: "niche diperlukan" });

      const results = [];

      for (const accountId of accountIds) {
        const account = await accountStore.getById(accountId);
        if (!account) {
          results.push({ accountId, error: "Akaun tidak dijumpai" });
          continue;
        }

        try {
          const previousCopies = await historyStore.getHistory(accountId);
          const copy = await copywriter.generateCopy({
            systemInstruction: account.systemInstruction,
            niche,
            product,
            previousCopies,
            language
          });

          logToSheets("CopyHistory", [
            new Date().toISOString(),
            account.id,
            account.tiktokUsername,
            niche,
            product || "",
            copy.headline,
            copy.caption,
            copy.hashtags,
            language
          ]);

          results.push({ accountId, displayName: account.tiktokUsername, ...copy });
        } catch (e) {
          results.push({ accountId, displayName: account.tiktokUsername, error: e.message });
        }
      }

      res.json({ results });
    } catch (err) { next(err); }
  });

  // ── Batch publish ───────────────────────────────────────────────────────────

  // Body: { posts: [{ openId, caption, hashtags }], imageUrls: [...], privacyLevel?, scheduledAt? }
  router.post("/publish", async (req, res, next) => {
    try {
      const {
        posts,
        imageUrls,
        privacyLevel = "PUBLIC_TO_EVERYONE",
        scheduledAt
      } = req.body;

      if (!posts?.length) return res.status(400).json({ error: "posts diperlukan" });
      if (!imageUrls?.length) return res.status(400).json({ error: "imageUrls diperlukan" });

      const results = [];

      for (const { openId, caption, hashtags } of posts) {
        const account = await postStore.getAccount(openId);
        if (!account) {
          results.push({ openId, success: false, error: "Akaun tidak dijumpai" });
          continue;
        }

        try {
          const accessToken = await tiktok.ensureFreshToken(account);
          await postStore.saveAccount(account);

          const title = `${caption}\n\n${hashtags || ""}`.trim();
          const publishResult = await tiktok.postPhoto(accessToken, {
            title,
            imageUrls,
            privacyLevel,
            scheduledAt
          });

          await historyStore.appendCopy(openId, caption);

          const post = {
            id: crypto.randomUUID(),
            source: "batch",
            openId,
            displayName: account.displayName,
            type: "photo",
            caption,
            hashtags: hashtags || "",
            imageUrls,
            privacyLevel,
            scheduledAt: scheduledAt || null,
            publishId: publishResult?.publish_id || null,
            status: scheduledAt ? "scheduled" : "published",
            createdAt: new Date().toISOString()
          };
          await postStore.savePost(post);

          logToSheets("BatchPostStatus", [
            post.id,
            post.createdAt,
            account.displayName,
            caption.slice(0, 200),
            post.status,
            publishResult?.publish_id || ""
          ]);

          results.push({
            openId,
            displayName: account.displayName,
            success: true,
            publishId: publishResult?.publish_id
          });
        } catch (e) {
          results.push({ openId, displayName: account.displayName, success: false, error: e.message });
        }
      }

      res.json({ results });
    } catch (err) { next(err); }
  });

  // ── History ─────────────────────────────────────────────────────────────────

  router.get("/posts", async (req, res, next) => {
    try {
      const all = await postStore.listPosts();
      res.json({ posts: all.filter((p) => p.source === "batch") });
    } catch (err) { next(err); }
  });

  router.get("/copy-history/:openId", async (req, res, next) => {
    try {
      res.json({ history: await historyStore.getHistory(req.params.openId) });
    } catch (err) { next(err); }
  });

  router.delete("/copy-history/:openId", async (req, res, next) => {
    try {
      await historyStore.clearHistory(req.params.openId);
      res.json({ ok: true });
    } catch (err) { next(err); }
  });

  // ── Content Kits (for Chrome Extension) ────────────────────────────────────

  // Create kits from generated copies
  // Body: { copies: [{ openId, displayName, headline, caption, hashtags }], imageUrl, privacyLevel?, scheduledAt? }
  router.post("/kits", async (req, res, next) => {
    try {
      const { copies, imageUrl, privacyLevel = "PUBLIC_TO_EVERYONE", scheduledAt } = req.body;
      if (!copies?.length) return res.status(400).json({ error: "copies diperlukan" });
      if (!imageUrl) return res.status(400).json({ error: "imageUrl diperlukan" });

      const kits = [];
      for (const copy of copies) {
        const kit = await kitStore.save({
          accountId: copy.accountId,
          displayName: copy.displayName,
          headline: copy.headline || "",
          caption: copy.caption || "",
          hashtags: copy.hashtags || "",
          imageUrl,
          privacyLevel,
          scheduledAt: scheduledAt || null,
          status: "pending",
          createdAt: new Date().toISOString(),
          postedAt: null
        });
        kits.push(kit);
      }
      res.json({ kits });
    } catch (err) { next(err); }
  });

  router.get("/kits", async (req, res, next) => {
    try {
      const kits = await kitStore.list({ status: req.query.status || undefined });
      res.json({ kits });
    } catch (err) { next(err); }
  });

  // Update kit status — called by Chrome extension after posting
  router.put("/kits/:id/status", async (req, res, next) => {
    try {
      const { status, note } = req.body;
      const validStatuses = ["pending", "in_progress", "posted", "skipped", "failed"];
      if (!validStatuses.includes(status)) return res.status(400).json({ error: "Status tidak valid" });

      const extra = {};
      if (status === "posted") {
        extra.postedAt = new Date().toISOString();
      }
      if (note) extra.note = note;

      const kit = await kitStore.updateStatus(req.params.id, status, extra);
      if (!kit) return res.status(404).json({ error: "Kit tidak dijumpai" });

      if (status === "posted") {
        await historyStore.appendCopy(kit.accountId, kit.caption);

        const post = {
          id: crypto.randomUUID(),
          source: "batch",
          openId: kit.openId,
          displayName: kit.displayName,
          type: "photo",
          caption: kit.caption,
          hashtags: kit.hashtags || "",
          imageUrls: [kit.imageUrl],
          privacyLevel: kit.privacyLevel,
          scheduledAt: kit.scheduledAt,
          publishId: null,
          status: "published",
          createdAt: kit.postedAt
        };
        await postStore.savePost(post);

        logToSheets("BatchPostStatus", [
          post.id, post.createdAt, kit.displayName,
          kit.caption.slice(0, 200), "posted", "via-extension"
        ]);
      }

      res.json({ kit });
    } catch (err) { next(err); }
  });

  router.delete("/kits/:id", async (req, res, next) => {
    try {
      await kitStore.updateStatus(req.params.id, "deleted");
      res.json({ ok: true });
    } catch (err) { next(err); }
  });

  return router;
}
