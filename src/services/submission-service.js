import path from "node:path";
import {
  applyMetadata,
  createSubmission,
  hasCompleteMetadata,
  imageFileName,
  setStatus,
  SubmissionStatus,
  touchSubmission
} from "../domain/submission-model.js";
import { config } from "../config.js";
import { ensureDir } from "../lib/fs-utils.js";
import {
  buildMetadataPrompt,
  missingMetadataFields,
  parseMetadataText
} from "./metadata-parser.js";

export class SubmissionService {
  constructor({
    store,
    whatsappService,
    extractor,
    driveService,
    sheetsService
  }) {
    this.store = store;
    this.whatsappService = whatsappService;
    this.extractor = extractor;
    this.driveService = driveService;
    this.sheetsService = sheetsService;
  }

  async initialize() {
    await ensureDir(config.dataDir);
    await ensureDir(config.mediaDir);
    await this.sheetsService.ensureHeaders();
  }

  async listSubmissions(status) {
    const submissions = await this.store.list();
    const filtered = status
      ? submissions.filter((submission) => submission.status === status)
      : submissions;

    return filtered.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  async getSubmission(id) {
    return this.store.getById(id);
  }

  async createManualSubmission({ senderPhone, metadata, imagePath, mimeType }) {
    const submission = createSubmission({
      senderPhone,
      whatsappMessageId: `manual-${crypto.randomUUID()}`,
      image: {
        sourceType: "manual",
        localPath: imagePath,
        mimeType
      },
      metadata
    });

    setStatus(
      submission,
      hasCompleteMetadata(submission)
        ? SubmissionStatus.RECEIVED
        : SubmissionStatus.AWAITING_METADATA
    );

    if (imagePath) {
      const uploadResult = await this.driveService.uploadImage({
        filePath: imagePath,
        fileName: imageFileName(submission),
        mimeType
      });

      submission.image.driveFileId = uploadResult.driveFileId;
      submission.image.driveFileUrl = uploadResult.driveFileUrl;
      submission.image.localPath = uploadResult.localPath;
      submission.sync.driveStoredAt = new Date().toISOString();
    }

    await this.store.save(submission);

    if (hasCompleteMetadata(submission)) {
      await this.processExtraction(submission.id);
    }

    return submission;
  }

  async handleWebhookPayload(payload) {
    const changes = payload.entry?.flatMap((entry) => entry.changes || []) || [];

    for (const change of changes) {
      const messages = change.value?.messages || [];
      for (const message of messages) {
        if (message.type === "image") {
          await this.handleIncomingImage(message);
        } else if (message.type === "text") {
          await this.handleIncomingText(message);
        }
      }
    }
  }

  async handleIncomingImage(message) {
    const existing = await this.store.getByWhatsAppMessageId(message.id);
    if (existing) {
      return existing;
    }

    const tempPath = path.resolve(config.mediaDir, `${message.id}.bin`);
    const downloaded = await this.whatsappService.downloadMedia(message.image.id, tempPath);

    const submission = createSubmission({
      senderPhone: message.from,
      whatsappMessageId: message.id,
      image: {
        sourceType: "whatsapp",
        localPath: downloaded.localPath,
        mimeType: downloaded.mimeType,
        whatsappMediaId: message.image.id
      },
      metadata: parseMetadataText(message.image.caption || "")
    });

    const uploadResult = await this.driveService.uploadImage({
      filePath: downloaded.localPath,
      fileName: imageFileName(submission),
      mimeType: downloaded.mimeType
    });

    submission.image.driveFileId = uploadResult.driveFileId;
    submission.image.driveFileUrl = uploadResult.driveFileUrl;
    submission.image.localPath = uploadResult.localPath;
    submission.sync.driveStoredAt = new Date().toISOString();

    if (hasCompleteMetadata(submission)) {
      setStatus(submission, SubmissionStatus.RECEIVED, { source: "image_caption" });
      await this.store.save(submission);
      await this.processExtraction(submission.id);
      return submission;
    }

    setStatus(submission, SubmissionStatus.AWAITING_METADATA);
    await this.store.save(submission);

    const missingFields = missingMetadataFields(submission.metadata);
    await this.whatsappService.sendTextMessage(
      message.from,
      buildMetadataPrompt(missingFields)
    );

    return submission;
  }

  async handleIncomingText(message) {
    const submission = await this.store.getLatestAwaitingMetadata(message.from);
    if (!submission) {
      return null;
    }

    const metadata = parseMetadataText(message.text.body || "");
    applyMetadata(submission, metadata);

    if (!hasCompleteMetadata(submission)) {
      setStatus(submission, SubmissionStatus.AWAITING_METADATA);
      await this.store.save(submission);
      const missingFields = missingMetadataFields(submission.metadata);
      await this.whatsappService.sendTextMessage(
        message.from,
        buildMetadataPrompt(missingFields)
      );
      return submission;
    }

    setStatus(submission, SubmissionStatus.RECEIVED, { source: "text_metadata" });
    await this.store.save(submission);
    await this.processExtraction(submission.id);
    return submission;
  }

  async processExtraction(submissionId) {
    const submission = await this.requireSubmission(submissionId);

    try {
      const extraction = await this.extractor.extractFromSubmission(submission);
      submission.extraction.metrics = extraction.metrics;
      submission.extraction.confidence = extraction.confidence;
      submission.extraction.warnings = extraction.warnings;
      submission.extraction.rawResponse = extraction.rawResponse;
      submission.extraction.extractedAt = new Date().toISOString();
      setStatus(submission, SubmissionStatus.EXTRACTED_PENDING_REVIEW);
      await this.store.save(submission);

      await this.whatsappService.sendTextMessage(
        submission.senderPhone,
        "Screenshot diterima dan sedang menunggu semakan admin."
      );

      return submission;
    } catch (error) {
      submission.sync.lastError = error.message;
      setStatus(submission, SubmissionStatus.ERROR, { stage: "extraction" });
      await this.store.save(submission);
      throw error;
    }
  }

  async approveSubmission(submissionId, { reviewer, overrides = {} }) {
    const submission = await this.requireSubmission(submissionId);

    submission.metadata = {
      ...submission.metadata,
      ...(overrides.metadata || {})
    };
    submission.extraction.metrics = {
      ...submission.extraction.metrics,
      ...overrides.metrics
    };
    if (typeof overrides.confidence === "number") {
      submission.extraction.confidence = overrides.confidence;
    }
    if (Array.isArray(overrides.warnings)) {
      submission.extraction.warnings = overrides.warnings;
    }

    submission.review.reviewedBy = reviewer;
    submission.review.reviewedAt = new Date().toISOString();
    submission.review.rejectionReason = "";
    touchSubmission(submission);
    setStatus(submission, SubmissionStatus.APPROVED);

    const syncResult = await this.sheetsService.appendApprovedSubmission(submission);
    submission.sync.sheetRowNumber = syncResult.rowNumber;
    submission.sync.sheetSyncedAt = syncResult.skipped ? "" : new Date().toISOString();
    await this.store.save(submission);

    await this.sheetsService.appendAuditEvent(
      submission,
      submission.events[submission.events.length - 1]
    );
    await this.whatsappService.sendTextMessage(
      submission.senderPhone,
      "Report anda telah disahkan dan direkodkan."
    );

    return submission;
  }

  async rejectSubmission(submissionId, { reviewer, reason }) {
    const submission = await this.requireSubmission(submissionId);
    submission.review.reviewedBy = reviewer;
    submission.review.reviewedAt = new Date().toISOString();
    submission.review.rejectionReason = reason || "Rejected by reviewer";
    setStatus(submission, SubmissionStatus.REJECTED, { reason: submission.review.rejectionReason });
    await this.store.save(submission);

    await this.sheetsService.appendAuditEvent(
      submission,
      submission.events[submission.events.length - 1]
    );
    await this.whatsappService.sendTextMessage(
      submission.senderPhone,
      `Report ditolak. Sebab: ${submission.review.rejectionReason}`
    );

    return submission;
  }

  async retrySubmission(submissionId) {
    const submission = await this.requireSubmission(submissionId);
    submission.sync.lastError = "";
    await this.store.save(submission);
    return this.processExtraction(submissionId);
  }

  async requireSubmission(submissionId) {
    const submission = await this.store.getById(submissionId);
    if (!submission) {
      throw new Error(`Submission not found: ${submissionId}`);
    }
    return submission;
  }
}
