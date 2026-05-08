import express from "express";
import { config } from "../config.js";
import { TiktokCreatorService } from "../services/tiktok-creator-service.js";
import { PostStore } from "../services/post-store.js";

// In-memory store for PKCE verifiers (keyed by state param)
const pkceVerifiers = new Map();

function getRedirectUri() {
  return `${config.appBaseUrl}/auth/creator/callback`;
}

export function createCreatorOAuthRouter() {
  const tiktok = new TiktokCreatorService();
  const store = new PostStore();
  const router = express.Router();

  router.get("/debug-url", (req, res) => {
    const { url } = tiktok.buildAuthUrl(getRedirectUri(), { state: "test" });
    res.json({ redirectUri: getRedirectUri(), authUrl: url });
  });

  router.get("/connect", (req, res) => {
    const state = `creator_${Date.now()}`;
    const { url, verifier } = tiktok.buildAuthUrl(getRedirectUri(), { state });
    pkceVerifiers.set(state, verifier);
    // Cleanup old entries after 10 minutes
    setTimeout(() => pkceVerifiers.delete(state), 10 * 60 * 1000);
    res.redirect(url);
  });

  router.get("/callback", async (req, res, next) => {
    try {
      const { code, state, error: oauthError } = req.query;

      if (oauthError) return res.redirect(`/?tab=studio&error=${encodeURIComponent(oauthError)}`);
      if (!code || !state) return res.status(400).send("Missing code or state");

      const verifier = pkceVerifiers.get(state);
      if (!verifier) return res.status(400).send("Invalid or expired state");
      pkceVerifiers.delete(state);

      const tokenData = await tiktok.exchangeCode(code, getRedirectUri(), verifier);
      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

      let displayName = tokenData.open_id;
      try {
        const userInfo = await tiktok.getUserInfo(tokenData.access_token);
        displayName = userInfo.display_name || tokenData.open_id;
      } catch (e) {
        console.warn("[CreatorOAuth] failed to fetch user info:", e.message);
      }

      const accountData = {
        openId: tokenData.open_id,
        displayName,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt,
        scope: tokenData.scope,
        connectedAt: new Date().toISOString()
      };

      await store.saveAccount(accountData);

      // If OAUTH_RETURN_URL set (on Render), relay token back to that server
      const returnBase = config.oauthReturnUrl || config.appBaseUrl;
      const encoded = Buffer.from(JSON.stringify(accountData)).toString("base64url");
      res.redirect(`${returnBase}/auth/creator/save?d=${encoded}`);
    } catch (err) {
      next(err);
    }
  });

  // Receives relayed token from Render OAuth and saves to local store
  router.get("/save", async (req, res, next) => {
    try {
      const { d } = req.query;
      if (!d) return res.status(400).send("Missing token data");
      const accountData = JSON.parse(Buffer.from(d, "base64url").toString("utf8"));
      await store.saveAccount(accountData);
      res.redirect("/?tab=studio&connected=1");
    } catch (err) {
      next(err);
    }
  });

  router.post("/disconnect/:openId", async (req, res, next) => {
    try {
      await store.deleteAccount(req.params.openId);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
