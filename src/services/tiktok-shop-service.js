import crypto from "node:crypto";
import { config } from "../config.js";

const AUTH_BASE = "https://auth.tiktok-shops.com";
const API_BASE = "https://open-api.tiktokglobalshop.com";

export class TiktokShopService {
  constructor() {
    this.appKey = config.tiktok.appKey;
    this.appSecret = config.tiktok.appSecret;
  }

  getAuthorizationUrl(accountId, redirectUri) {
    const params = new URLSearchParams({
      app_key: this.appKey,
      redirect_uri: redirectUri,
      state: accountId
    });
    return `${AUTH_BASE}/oauth/authorize?${params}`;
  }

  async exchangeCode(code) {
    const params = new URLSearchParams({
      app_key: this.appKey,
      app_secret: this.appSecret,
      auth_code: code,
      grant_type: "authorized_code"
    });
    const url = `${AUTH_BASE}/api/v2/token/get?${params}`;
    console.log("[TikTok] token exchange URL:", url.replace(this.appSecret, "***"));
    const res = await fetch(url);
    const raw = await res.text();
    console.log("[TikTok] token exchange raw response:", raw);
    const data = JSON.parse(raw);
    if (data.code !== 0) throw new Error(data.message || "Token exchange failed");
    return data.data;
  }

  async refreshToken(refreshToken) {
    const body = {
      app_key: this.appKey,
      app_secret: this.appSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    };
    const res = await fetch(`${AUTH_BASE}/api/v2/token/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const raw = await res.text();
    console.log("[TikTok] token refresh raw response:", raw);
    const data = JSON.parse(raw);
    if (data.code !== 0) throw new Error(data.message || "Token refresh failed");
    return data.data;
  }

  _sign(path, params, bodyStr = "") {
    // Sort params (exclude access_token and sign), concat key+value pairs
    const keys = Object.keys(params).sort();
    let base = this.appSecret + path;
    for (const k of keys) base += k + String(params[k]);
    if (bodyStr) base += bodyStr;
    base += this.appSecret;
    return crypto.createHmac("sha256", this.appSecret).update(base).digest("hex");
  }

  async _legacyPost(path, accessToken, shopId, body = {}) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const bodyStr = JSON.stringify(body);
    // Sign with HMAC-SHA256 + path (same algorithm as new API)
    // Exclude access_token from sign params; shop_id, version included
    const signParams = { app_key: this.appKey, shop_id: String(shopId), timestamp, version: "202212" };
    const sign = this._sign(path, signParams, bodyStr);

    const url = new URL(`${API_BASE}${path}`);
    url.searchParams.set("app_key", this.appKey);
    url.searchParams.set("access_token", accessToken);
    url.searchParams.set("shop_id", String(shopId));
    url.searchParams.set("timestamp", timestamp);
    url.searchParams.set("version", "202212");
    url.searchParams.set("sign", sign);

    console.log(`[TikTok] legacy POST ${path}?shop_id=${shopId}`);
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: bodyStr
    });
    const raw = await res.text();
    console.log(`[TikTok] legacy ${path}:`, raw.slice(0, 400));
    try { return JSON.parse(raw); } catch { throw new Error("Invalid JSON from API"); }
  }

  async _get(path, accessToken, queryParams = {}) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const cleanQuery = Object.fromEntries(Object.entries(queryParams).filter(([, v]) => v !== undefined && v !== null));
    const signParams = { ...cleanQuery, app_key: this.appKey, timestamp };
    const sign = this._sign(path, signParams);

    const url = new URL(`${API_BASE}${path}`);
    url.searchParams.set("app_key", this.appKey);
    url.searchParams.set("timestamp", timestamp);
    url.searchParams.set("sign", sign);
    for (const [k, v] of Object.entries(cleanQuery)) url.searchParams.set(k, String(v));

    const res = await fetch(url.toString(), {
      headers: { "x-tts-access-token": accessToken }
    });
    const raw = await res.text();
    try { return JSON.parse(raw); } catch { console.error("[TikTok] _get parse error:", raw.slice(0, 200)); throw new Error("Invalid JSON from API"); }
  }

  async _post(path, accessToken, body = {}, extraQueryParams = {}) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signParams = { ...extraQueryParams, app_key: this.appKey, timestamp };
    const bodyStr = JSON.stringify(body);
    const sign = this._sign(path, signParams, bodyStr);

    const url = new URL(`${API_BASE}${path}`);
    url.searchParams.set("app_key", this.appKey);
    url.searchParams.set("timestamp", timestamp);
    url.searchParams.set("sign", sign);
    for (const [k, v] of Object.entries(extraQueryParams)) url.searchParams.set(k, String(v));

    const res = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-tts-access-token": accessToken
      },
      body: bodyStr
    });
    const raw = await res.text();
    try { return JSON.parse(raw); } catch { console.error("[TikTok] _post parse error:", raw.slice(0, 200)); throw new Error("Invalid JSON from API"); }
  }

  async ensureFreshToken(account) {
    const conn = account.shopConnect;
    if (!conn?.accessToken) throw new Error("Account not connected to TikTok Shop");

    const expiresAt = new Date(conn.expiresAt).getTime();
    const fiveMinutes = 5 * 60 * 1000;
    if (Date.now() < expiresAt - fiveMinutes) return conn.accessToken;

    // Refresh token
    const tokenData = await this.refreshToken(conn.refreshToken);
    conn.accessToken = tokenData.access_token;
    conn.refreshToken = tokenData.refresh_token;
    conn.expiresAt = new Date(Date.now() + tokenData.access_token_expire_in * 1000).toISOString();
    return conn.accessToken;
  }

  async getShops(accessToken) {
    return this._get("/seller/202309/shops", accessToken);
  }

  // Finance statements — V2 202309 API
  async getStatements(accessToken, shopCipher, startDate, endDate) {
    const from = Math.floor(new Date(startDate).getTime() / 1000);
    const to = Math.floor(new Date(endDate + "T23:59:59").getTime() / 1000);
    return this._get("/finance/202309/statements", accessToken, {
      shop_cipher: shopCipher || undefined,
      sort_field: "statement_time",
      create_time_ge: from,
      create_time_lt: to,
      page_size: 20
    });
  }

  // Order search by time range — POST v202309 (requires shop_cipher)
  async searchOrders(accessToken, shopCipher, startDate, endDate) {
    const from = Math.floor(new Date(startDate).getTime() / 1000);
    const to = Math.floor(new Date(endDate + "T23:59:59").getTime() / 1000);
    const body = { create_time_ge: from, create_time_lt: to };
    if (shopCipher) body.shop_cipher = shopCipher;
    return this._post("/order/202309/orders/search", accessToken, body, { page_size: 20 });
  }

  // Order search legacy v202212 — uses shop_id (no cipher needed)
  async searchOrdersLegacy(accessToken, shopId, startDate, endDate) {
    const from = Math.floor(new Date(startDate).getTime() / 1000);
    const to = Math.floor(new Date(endDate + "T23:59:59").getTime() / 1000);
    return this._legacyPost("/api/orders/search", accessToken, shopId, {
      create_time_from: from,
      create_time_to: to,
      page_size: 20
    });
  }

  // Pull full reporting data for one account
  async fetchReportingData(account, startDate, endDate) {
    const accessToken = await this.ensureFreshToken(account);

    const shopsData = await this.getShops(accessToken);
    console.log("[TikTok] shops full response:", JSON.stringify(shopsData).slice(0, 600));

    const shop = shopsData?.data?.shops?.[0];
    const realShopId = String(shop?.id || account.shopConnect.shopId);

    // cipher may come from shops endpoint (works even with Custom Connector apps)
    const shopCipher = shop?.cipher || account.shopConnect.shopCipher || null;
    console.log("[TikTok] cipher from shops:", shop?.cipher, "| stored:", account.shopConnect.shopCipher, "| using:", shopCipher);

    // shopCipher is only valid from ISV/Public service apps.
    // Custom Connector apps get null — fall back to legacy v202212 orders API (uses shop_id).
    const ordersPromise = shopCipher
      ? this.searchOrders(accessToken, shopCipher, startDate, endDate)
      : this.searchOrdersLegacy(accessToken, realShopId, startDate, endDate);

    const [statementsRes, ordersRes] = await Promise.allSettled([
      this.getStatements(accessToken, shopCipher, startDate, endDate),
      ordersPromise
    ]);

    console.log("[TikTok] statements:", JSON.stringify(statementsRes.value || statementsRes.reason?.message).slice(0, 400));
    console.log("[TikTok] orders:", JSON.stringify(ordersRes.value || ordersRes.reason?.message).slice(0, 400));

    return {
      accountId: account.id,
      tiktokUsername: account.tiktokUsername,
      shopId: realShopId,
      shopName: account.shopConnect.shopName,
      startDate,
      endDate,
      statements: statementsRes.status === "fulfilled" ? statementsRes.value : { error: statementsRes.reason?.message },
      orders: ordersRes.status === "fulfilled" ? ordersRes.value : { error: ordersRes.reason?.message },
      fetchedAt: new Date().toISOString()
    };
  }
}
