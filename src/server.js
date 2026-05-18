import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { adminAuthMiddleware } from "./lib/auth.js";
import { createApiRouter } from "./routes/api.js";
import { createWhatsAppWebhookRouter } from "./routes/whatsapp-webhook.js";
import { createAccountsRouter } from "./routes/accounts-api.js";
import { createAffiliatePublicRouter, createAffiliateAdminRouter } from "./routes/affiliate-api.js";
import { createTiktokOAuthRouter } from "./routes/tiktok-oauth.js";
import { createCreatorOAuthRouter } from "./routes/creator-oauth.js";
import { createContentStudioRouter } from "./routes/content-studio-api.js";
import { createReportingRouter } from "./routes/reporting-api.js";
import { createDataTransferRouter } from "./routes/data-transfer-api.js";
import { createBatchPublisherRouter } from "./routes/batch-publisher-api.js";
import { GoogleDriveService } from "./services/google-drive-service.js";
import { createGoogleAuthClient } from "./services/google-auth.js";
import { GoogleSheetsService } from "./services/google-sheets-service.js";
import { OpenAiExtractor } from "./services/openai-extractor.js";
import { SubmissionService } from "./services/submission-service.js";
import { SubmissionStore } from "./services/submission-store.js";
import { WhatsAppService } from "./services/whatsapp-service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const app = express();
  const googleAuthClient = createGoogleAuthClient();
  const submissionService = new SubmissionService({
    store: new SubmissionStore(),
    whatsappService: new WhatsAppService(),
    extractor: new OpenAiExtractor(),
    driveService: new GoogleDriveService(googleAuthClient),
    sheetsService: new GoogleSheetsService(googleAuthClient)
  });

  await submissionService.initialize();

  app.use(express.json({ limit: "20mb" }));
  app.use(express.static(path.join(process.cwd(), "public")));
  app.use("/media", express.static(config.mediaDir));

  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      appBaseUrl: config.appBaseUrl,
      timestamp: new Date().toISOString()
    });
  });

  app.use("/auth/tiktok", createTiktokOAuthRouter());
  app.use("/auth/creator", createCreatorOAuthRouter());
  app.use("/webhooks/whatsapp", createWhatsAppWebhookRouter({ submissionService }));
  app.use("/affiliate", createAffiliatePublicRouter());
  app.use("/api/studio", adminAuthMiddleware(config), createContentStudioRouter());
  app.use("/api/batch", adminAuthMiddleware(config), createBatchPublisherRouter());
  app.use("/api/data", adminAuthMiddleware(config), createDataTransferRouter());
  app.use("/api/reporting", adminAuthMiddleware(config), createReportingRouter());
  app.use("/api/accounts", adminAuthMiddleware(config), createAccountsRouter());
  app.use("/api/affiliates", adminAuthMiddleware(config), createAffiliateAdminRouter());
  app.use(
    "/api",
    adminAuthMiddleware(config),
    createApiRouter({ submissionService })
  );

  app.use((error, _req, res, _next) => {
    console.error(error);
    res.status(500).json({
      error: error.message || "Internal server error"
    });
  });

  app.listen(config.port, () => {
    console.log(`TikTok reporting app listening on port ${config.port}`);
  });
}

main().catch((error) => {
  console.error("Failed to start application", error);
  process.exitCode = 1;
});
