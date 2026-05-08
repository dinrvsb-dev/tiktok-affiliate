import { google } from "googleapis";
import { config, isConfigured } from "../config.js";
import { summarizeForSheet } from "../domain/submission-model.js";

const APPROVED_HEADERS = [
  "submission_id",
  "submitted_at",
  "staff_name",
  "host_name",
  "live_session_id_or_label",
  "report_date",
  "start_time",
  "end_time",
  "duration",
  "spent",
  "sales_gmv",
  "roi",
  "extraction_confidence",
  "extraction_warnings",
  "review_status",
  "reviewed_by",
  "reviewed_at",
  "rejection_reason",
  "source_image_url",
  "sender_phone"
];

const AUDIT_HEADERS = [
  "submission_id",
  "event_at",
  "event_type",
  "status",
  "details"
];

export class GoogleSheetsService {
  constructor(authClient) {
    this.sheets = authClient ? google.sheets({ version: "v4", auth: authClient }) : null;
  }

  isReady() {
    return Boolean(this.sheets && isConfigured(config.google.spreadsheetId));
  }

  async ensureHeaders() {
    if (!this.isReady()) {
      return;
    }

    await this.ensureSheetExists(config.google.approvedTab);
    await this.ensureSheetExists(config.google.auditTab);
    await this.writeHeaders(config.google.approvedTab, APPROVED_HEADERS);
    await this.writeHeaders(config.google.auditTab, AUDIT_HEADERS);
  }

  async ensureSheetExists(tabName) {
    const spreadsheet = await this.sheets.spreadsheets.get({
      spreadsheetId: config.google.spreadsheetId,
      fields: "sheets.properties.title"
    });

    const exists = (spreadsheet.data.sheets || []).some(
      (sheet) => sheet.properties?.title === tabName
    );

    if (exists) {
      return;
    }

    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId: config.google.spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: tabName
              }
            }
          }
        ]
      }
    });
  }

  async writeHeaders(tabName, headers) {
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: config.google.spreadsheetId,
      range: `${tabName}!1:1`
    });

    const existing = response.data.values?.[0] || [];
    if (existing.length) {
      return;
    }

    await this.sheets.spreadsheets.values.update({
      spreadsheetId: config.google.spreadsheetId,
      range: `${tabName}!1:1`,
      valueInputOption: "RAW",
      requestBody: {
        values: [headers]
      }
    });
  }

  async appendApprovedSubmission(submission) {
    if (!this.isReady()) {
      return { rowNumber: null, skipped: true };
    }

    const row = summarizeForSheet(submission);
    const values = [APPROVED_HEADERS.map((header) => row[header] ?? "")];
    const response = await this.sheets.spreadsheets.values.append({
      spreadsheetId: config.google.spreadsheetId,
      range: `${config.google.approvedTab}!A1`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values }
    });

    const updatedRange = response.data.updates?.updatedRange || "";
    const rowNumber = Number(updatedRange.split("!")[1]?.match(/\d+/)?.[0] || 0) || null;
    return { rowNumber, skipped: false };
  }

  async appendAuditEvent(submission, event) {
    if (!this.isReady()) {
      return;
    }

    await this.sheets.spreadsheets.values.append({
      spreadsheetId: config.google.spreadsheetId,
      range: `${config.google.auditTab}!A1`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [
          [
            submission.id,
            event.at,
            event.type,
            submission.status,
            JSON.stringify(event.details || {})
          ]
        ]
      }
    });
  }
}
