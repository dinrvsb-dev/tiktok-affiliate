import fs from "node:fs/promises";
import Anthropic from "@anthropic-ai/sdk";
import { config, isConfigured } from "../config.js";
import { createEmptyMetrics, METRIC_FIELDS } from "../domain/submission-model.js";

const PROMPT = `Extract the following data from this TikTok Live dashboard screenshot.
Use the extract_metrics tool to return the data.

Fields:
- start_time: live session start time (e.g. "14:30" or "14:30:00"), string or null
- end_time: live session end time (e.g. "16:00"), string or null
- duration: total live duration (e.g. "1h 30m"), string or null
- spent: ad spend amount as number only, no currency symbol (e.g. 150.00), number or null
- sales_gmv: gross merchandise value as number only, no currency symbol (e.g. 750.00), number or null
- roi: return on investment as number only (e.g. 5.0 for 5x ROI, or 500 for 500%), number or null

Return null for any value not visible or unreadable in the image.
Set confidence between 0 and 1 based on how clearly the data is visible.`;

const extractTool = {
  name: "extract_metrics",
  description: "Extract TikTok Live dashboard metrics from a screenshot",
  input_schema: {
    type: "object",
    properties: {
      metrics: {
        type: "object",
        properties: {
          start_time: { type: ["string", "null"] },
          end_time: { type: ["string", "null"] },
          duration: { type: ["string", "null"] },
          spent: { type: ["number", "null"] },
          sales_gmv: { type: ["number", "null"] },
          roi: { type: ["number", "null"] }
        },
        required: METRIC_FIELDS
      },
      confidence: { type: "number" },
      warnings: { type: "array", items: { type: "string" } }
    },
    required: ["metrics", "confidence", "warnings"]
  }
};

export class OpenAiExtractor {
  constructor() {
    this.client = new Anthropic({ apiKey: config.anthropic.apiKey });
  }

  async extractFromSubmission(submission) {
    if (!isConfigured(config.anthropic.apiKey)) {
      return {
        metrics: createEmptyMetrics(),
        confidence: 0,
        warnings: ["ANTHROPIC_API_KEY is not configured. Extraction skipped."],
        rawResponse: null
      };
    }

    const imageBuffer = await fs.readFile(submission.image.localPath);
    const imageBase64 = imageBuffer.toString("base64");
    const mediaType = submission.image.mimeType || "image/jpeg";

    const response = await this.client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      tools: [extractTool],
      tool_choice: { type: "auto" },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: imageBase64 }
            },
            { type: "text", text: PROMPT }
          ]
        }
      ]
    });

    const toolUse = response.content.find((block) => block.type === "tool_use");
    const parsed = toolUse?.input || {};

    return {
      metrics: { ...createEmptyMetrics(), ...(parsed.metrics || {}) },
      confidence: parsed.confidence ?? 0,
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
      rawResponse: parsed
    };
  }
}
