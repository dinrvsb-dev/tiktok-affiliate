import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../config.js";

const FILES = ["accounts.json", "affiliates.json", "submissions.json", "creator-accounts.json", "studio-posts.json", "content-kits.json", "copy-history.json"];

export function createDataTransferRouter() {
  const router = express.Router();

  router.get("/export", async (req, res, next) => {
    try {
      const result = {};
      for (const file of FILES) {
        const filePath = path.join(config.dataDir, file);
        try {
          const content = await fs.readFile(filePath, "utf8");
          result[file] = JSON.parse(content);
        } catch {
          result[file] = null;
        }
      }
      res.setHeader("Content-Disposition", `attachment; filename="tiktok-data-${Date.now()}.json"`);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  router.post("/import", async (req, res, next) => {
    try {
      const data = req.body;
      const imported = [];
      for (const file of FILES) {
        if (data[file] !== undefined && data[file] !== null) {
          const filePath = path.join(config.dataDir, file);
          await fs.mkdir(path.dirname(filePath), { recursive: true });
          await fs.writeFile(filePath, JSON.stringify(data[file], null, 2), "utf8");
          imported.push(file);
        }
      }
      res.json({ ok: true, imported });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
