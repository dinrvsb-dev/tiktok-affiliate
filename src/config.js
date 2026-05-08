import path from "node:path";
import process from "node:process";

function required(name, fallback = "") {
  return process.env[name] || fallback;
}

function normalizePrivateKey(value) {
  return value ? value.replace(/\\n/g, "\n") : "";
}

const rootDir = process.cwd();
const dataDir = path.resolve(rootDir, required("DATA_DIR", "./data"));
const mediaDir = path.resolve(rootDir, required("MEDIA_DIR", "./data/media"));

export const config = {
  port: Number(required("PORT", "3000")),
  appBaseUrl: required("APP_BASE_URL", "http://localhost:3000"),
  adminApiKey: required("ADMIN_API_KEY", "change-me"),
  dataDir,
  mediaDir,
  whatsapp: {
    verifyToken: required("WHATSAPP_VERIFY_TOKEN", "verify-token"),
    accessToken: required("WHATSAPP_ACCESS_TOKEN"),
    phoneNumberId: required("WHATSAPP_PHONE_NUMBER_ID"),
    graphVersion: required("WHATSAPP_GRAPH_VERSION", "v21.0")
  },
  anthropic: {
    apiKey: required("ANTHROPIC_API_KEY")
  },
  openai: {
    apiKey: required("OPENAI_API_KEY"),
    model: required("OPENAI_MODEL", "gpt-4o"),
    imageModel: required("OPENAI_IMAGE_MODEL", "dall-e-3")
  },
  tiktok: {
    appKey: required("TIKTOK_APP_KEY"),
    appSecret: required("TIKTOK_APP_SECRET")
  },
  tiktokCreator: {
    clientKey: required("TIKTOK_CREATOR_CLIENT_KEY"),
    clientSecret: required("TIKTOK_CREATOR_CLIENT_SECRET")
  },
  // URL to redirect after OAuth (set to localhost on Render, empty on localhost)
  oauthReturnUrl: required("OAUTH_RETURN_URL", ""),
  // Base URL of the OAuth server (set to Render URL on localhost)
  creatorOauthBaseUrl: required("CREATOR_OAUTH_BASE_URL", ""),
  google: {
    serviceAccountEmail: required("GOOGLE_SERVICE_ACCOUNT_EMAIL"),
    privateKey: normalizePrivateKey(required("GOOGLE_PRIVATE_KEY")),
    driveFolderId: required("GOOGLE_DRIVE_FOLDER_ID"),
    spreadsheetId: required("GOOGLE_SHEETS_SPREADSHEET_ID"),
    approvedTab: required("GOOGLE_SHEETS_APPROVED_TAB", "ApprovedReports"),
    auditTab: required("GOOGLE_SHEETS_AUDIT_TAB", "ReviewAudit")
  }
};

export function isConfigured(value) {
  return Boolean(value && value.trim());
}
