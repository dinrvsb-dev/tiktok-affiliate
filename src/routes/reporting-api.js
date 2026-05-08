import express from "express";
import { AccountStore } from "../services/account-store.js";
import { TiktokShopService } from "../services/tiktok-shop-service.js";

const store = new AccountStore();
const tiktok = new TiktokShopService();

export function createReportingRouter() {
  const router = express.Router();

  // List all accounts with connection status
  router.get("/accounts", async (req, res, next) => {
    try {
      const accounts = await store.list();
      const result = accounts.map((a) => ({
        id: a.id,
        tiktokUsername: a.tiktokUsername,
        type: a.type,
        status: a.status,
        shopConnect: a.shopConnect
          ? {
              connected: a.shopConnect.connected,
              shopName: a.shopConnect.shopName,
              shopId: a.shopConnect.shopId,
              connectedAt: a.shopConnect.connectedAt,
              expiresAt: a.shopConnect.expiresAt
            }
          : { connected: false }
      }));
      res.json({ accounts: result });
    } catch (err) {
      next(err);
    }
  });

  // Pull data for one account
  router.post("/sync/:accountId", async (req, res, next) => {
    try {
      const account = await store.getById(req.params.accountId);
      if (!account) return res.status(404).json({ error: "Account not found" });
      if (!account.shopConnect?.connected) {
        return res.status(400).json({ error: "Account not connected to TikTok Shop" });
      }

      const { startDate, endDate } = req.body;
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "startDate and endDate required (YYYY-MM-DD)" });
      }

      const data = await tiktok.fetchReportingData(account, startDate, endDate);

      // Save updated tokens if they were refreshed
      await store.save(account);

      res.json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  });

  // Pull data for all connected accounts
  router.post("/sync-all", async (req, res, next) => {
    try {
      const { startDate, endDate } = req.body;
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "startDate and endDate required (YYYY-MM-DD)" });
      }

      const accounts = await store.list();
      const connected = accounts.filter((a) => a.shopConnect?.connected);

      const results = await Promise.allSettled(
        connected.map((a) => tiktok.fetchReportingData(a, startDate, endDate))
      );

      // Save any refreshed tokens
      for (const account of connected) await store.save(account);

      const data = results.map((r, i) => {
        if (r.status === "fulfilled") return r.value;
        return {
          accountId: connected[i].id,
          tiktokUsername: connected[i].tiktokUsername,
          error: r.reason?.message || "Unknown error"
        };
      });

      res.json({ ok: true, total: connected.length, data });
    } catch (err) {
      next(err);
    }
  });

  // Disconnect a shop account
  router.post("/disconnect/:accountId", async (req, res, next) => {
    try {
      const account = await store.getById(req.params.accountId);
      if (!account) return res.status(404).json({ error: "Account not found" });
      account.shopConnect = { connected: false };
      account.updatedAt = new Date().toISOString();
      await store.save(account);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
