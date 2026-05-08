import express from "express";
import { config } from "../config.js";
import { AccountStore } from "../services/account-store.js";
import { TiktokShopService } from "../services/tiktok-shop-service.js";

const store = new AccountStore();
const tiktok = new TiktokShopService();

function getRedirectUri() {
  return `${config.appBaseUrl}/auth/tiktok/callback`;
}

export function createTiktokOAuthRouter() {
  const router = express.Router();

  // Redirect this account to TikTok OAuth
  router.get("/connect/:accountId", async (req, res, next) => {
    try {
      const account = await store.getById(req.params.accountId);
      if (!account) return res.status(404).send("Account not found");

      const url = tiktok.getAuthorizationUrl(account.id, getRedirectUri());
      res.redirect(url);
    } catch (err) {
      next(err);
    }
  });

  // TikTok redirects back here after user approves
  router.get("/callback", async (req, res, next) => {
    try {
      console.log("[TikTok] callback query params:", JSON.stringify(req.query));
      // cipher may come from callback URL params (TikTok passes it here)
      const { code, state: accountId, cipher: urlCipher } = req.query;
      if (!code || !accountId) return res.status(400).send("Missing code or state");

      const account = await store.getById(accountId);
      if (!account) return res.status(404).send("Account not found");

      // Exchange auth code for tokens
      const tokenData = await tiktok.exchangeCode(code);
      console.log("[TikTok] token data full:", JSON.stringify(tokenData));

      // cipher only valid from ISV/Public service apps — open_id is NOT a valid shop_cipher
      const shopCipher = urlCipher || tokenData.cipher || tokenData.shop_cipher || null;
      console.log("[TikTok] shop cipher:", shopCipher, "| user_type:", tokenData.user_type);

      account.shopConnect = {
        connected: true,
        shopId: tokenData.open_id || tokenData.shop_id || null,
        shopName: tokenData.seller_name || account.tiktokUsername,
        openId: tokenData.open_id,
        shopCipher,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        // access_token_expire_in is an absolute Unix timestamp (seconds)
        expiresAt: new Date(tokenData.access_token_expire_in * 1000).toISOString(),
        grantedScopes: tokenData.granted_scopes || [],
        connectedAt: new Date().toISOString()
      };
      account.updatedAt = new Date().toISOString();
      await store.save(account);

      res.redirect("/?tab=reporting&connected=" + account.tiktokUsername);
    } catch (err) {
      next(err);
    }
  });

  // Disconnect account
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
