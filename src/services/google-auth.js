import { google } from "googleapis";
import { config, isConfigured } from "../config.js";

export function createGoogleAuthClient() {
  if (
    !isConfigured(config.google.serviceAccountEmail) ||
    !isConfigured(config.google.privateKey)
  ) {
    return null;
  }

  return new google.auth.JWT({
    email: config.google.serviceAccountEmail,
    key: config.google.privateKey,
    scopes: [
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/spreadsheets"
    ]
  });
}
