import path from "node:path";

export const SubmissionStatus = {
  RECEIVED: "received",
  AWAITING_METADATA: "awaiting_metadata",
  EXTRACTED_PENDING_REVIEW: "extracted_pending_review",
  APPROVED: "approved",
  REJECTED: "rejected",
  ERROR: "error"
};

export const METRIC_FIELDS = [
  "start_time",
  "end_time",
  "duration",
  "spent",
  "sales_gmv",
  "roi"
];

export function createEmptyMetrics() {
  return Object.fromEntries(METRIC_FIELDS.map((field) => [field, null]));
}

export function createSubmission({
  senderPhone,
  whatsappMessageId,
  image,
  metadata = {}
}) {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    senderPhone,
    whatsappMessageId,
    status: SubmissionStatus.RECEIVED,
    submittedAt: now,
    updatedAt: now,
    metadata: {
      staffName: metadata.staffName || "",
      hostName: metadata.hostName || "",
      liveSessionIdOrLabel: metadata.liveSessionIdOrLabel || "",
      reportDate: metadata.reportDate || ""
    },
    image: {
      sourceType: image.sourceType,
      mimeType: image.mimeType || "",
      originalFileName: image.originalFileName || "",
      localPath: image.localPath || "",
      driveFileId: image.driveFileId || "",
      driveFileUrl: image.driveFileUrl || "",
      whatsappMediaId: image.whatsappMediaId || "",
      originalUrl: image.originalUrl || ""
    },
    extraction: {
      metrics: createEmptyMetrics(),
      confidence: null,
      warnings: [],
      rawResponse: null,
      extractedAt: null
    },
    review: {
      reviewedBy: "",
      reviewedAt: "",
      rejectionReason: ""
    },
    sync: {
      driveStoredAt: "",
      sheetRowNumber: null,
      sheetSyncedAt: "",
      lastError: ""
    },
    events: [
      {
        at: now,
        type: "submission_created",
        details: {
          senderPhone,
          whatsappMessageId
        }
      }
    ]
  };
}

export function applyMetadata(submission, metadata) {
  submission.metadata = {
    ...submission.metadata,
    ...metadata
  };
  touchSubmission(submission);
  submission.events.push({
    at: submission.updatedAt,
    type: "metadata_updated",
    details: metadata
  });
  return submission;
}

export function hasCompleteMetadata(submission) {
  return Boolean(
    submission.metadata.staffName &&
      submission.metadata.hostName &&
      submission.metadata.liveSessionIdOrLabel &&
      submission.metadata.reportDate
  );
}

export function setStatus(submission, status, details = {}) {
  submission.status = status;
  touchSubmission(submission);
  submission.events.push({
    at: submission.updatedAt,
    type: "status_changed",
    details: {
      status,
      ...details
    }
  });
  return submission;
}

export function touchSubmission(submission) {
  submission.updatedAt = new Date().toISOString();
  return submission;
}

export function summarizeForSheet(submission) {
  return {
    submission_id: submission.id,
    submitted_at: submission.submittedAt,
    staff_name: submission.metadata.staffName,
    host_name: submission.metadata.hostName,
    live_session_id_or_label: submission.metadata.liveSessionIdOrLabel,
    report_date: submission.metadata.reportDate,
    ...submission.extraction.metrics,
    extraction_confidence: submission.extraction.confidence,
    extraction_warnings: submission.extraction.warnings.join(" | "),
    review_status: submission.status,
    reviewed_by: submission.review.reviewedBy,
    reviewed_at: submission.review.reviewedAt,
    rejection_reason: submission.review.rejectionReason,
    source_image_url: submission.image.driveFileUrl || submission.image.localPath,
    sender_phone: submission.senderPhone
  };
}

export function imageFileName(submission) {
  const extension =
    submission.image.mimeType === "image/png"
      ? ".png"
      : submission.image.mimeType === "image/webp"
        ? ".webp"
        : ".jpg";
  return `${submission.id}${extension}`;
}

export function localImageUrl(submission) {
  return `/media/${path.basename(submission.image.localPath)}`;
}
