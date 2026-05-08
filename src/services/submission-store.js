import path from "node:path";
import { config } from "../config.js";
import { JsonStore } from "../lib/json-store.js";

export class SubmissionStore {
  constructor() {
    this.store = new JsonStore(path.resolve(config.dataDir, "submissions.json"), {
      submissions: []
    });
  }

  async list() {
    const data = await this.store.read();
    return data.submissions;
  }

  async getById(id) {
    const submissions = await this.list();
    return submissions.find((item) => item.id === id) || null;
  }

  async getByWhatsAppMessageId(whatsappMessageId) {
    const submissions = await this.list();
    return submissions.find((item) => item.whatsappMessageId === whatsappMessageId) || null;
  }

  async getLatestAwaitingMetadata(senderPhone) {
    const submissions = await this.list();
    return (
      submissions
        .filter(
          (item) => item.senderPhone === senderPhone && item.status === "awaiting_metadata"
        )
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0] || null
    );
  }

  async save(submission) {
    await this.store.update((data) => {
      const index = data.submissions.findIndex((item) => item.id === submission.id);
      if (index >= 0) {
        data.submissions[index] = submission;
      } else {
        data.submissions.push(submission);
      }

      return data;
    });
    return submission;
  }
}
