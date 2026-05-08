import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import OpenAI from "openai";
import { config, isConfigured } from "../config.js";

const LANG_PROMPTS = {
  ms: {
    system: `Kau adalah pakar copywriting TikTok Malaysia. Tulis caption yang viral, relatable, dan sesuai untuk audience Malaysia. Gunakan Bahasa Malaysia casual dengan sedikit Manglish bila sesuai. Maksimum 150 patah perkataan untuk caption.`,
    captionInstruction: "Tulis caption TikTok yang menarik dan viral",
    hashtagInstruction: "berikan 10-15 hashtag berkaitan (gabungan Bahasa Malaysia dan English, format #hashtag)"
  },
  en: {
    system: `You are a TikTok copywriting expert. Write viral, engaging captions that resonate with the target audience. Maximum 150 words for the caption.`,
    captionInstruction: "Write an engaging viral TikTok caption",
    hashtagInstruction: "provide 10-15 relevant hashtags (format #hashtag)"
  }
};

export class ContentGenerator {
  constructor() {
    this.client = isConfigured(config.openai.apiKey) ? new OpenAI({ apiKey: config.openai.apiKey }) : null;
  }

  async generateImage({ niche, product, imageStyle, language = "ms" }) {
    if (!this.client) throw new Error("OPENAI_API_KEY not configured");

    const productPart = product ? ` featuring ${product}` : "";
    const prompt = `A high-quality TikTok-style ${imageStyle} photo${productPart} for ${niche} content.
Vibrant, eye-catching, professional product photography aesthetic, 9:16 aspect ratio feel, white or clean background, modern aesthetic.
No text overlay. Photorealistic.`;

    const response = await this.client.images.generate({
      model: config.openai.imageModel,
      prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      response_format: "b64_json"
    });

    const b64 = response.data[0].b64_json;
    const revisedPrompt = response.data[0].revised_prompt || prompt;

    // Save to media/generated/
    const filename = `gen_${crypto.randomUUID()}.png`;
    const generatedDir = path.join(config.mediaDir, "generated");
    await fs.mkdir(generatedDir, { recursive: true });
    const localPath = path.join(generatedDir, filename);
    await fs.writeFile(localPath, Buffer.from(b64, "base64"));

    const publicUrl = `${config.appBaseUrl}/media/generated/${filename}`;
    return { localPath, publicUrl, filename, revisedPrompt };
  }

  async generateCaption({ niche, product, imageStyle, language = "ms" }) {
    if (!this.client) throw new Error("OPENAI_API_KEY not configured");

    const lang = LANG_PROMPTS[language] || LANG_PROMPTS.ms;
    const productPart = product ? ` untuk produk: ${product}` : "";
    const userPrompt = `${lang.captionInstruction} untuk niche ${niche}${productPart}. Style visual: ${imageStyle}.

${lang.hashtagInstruction}.

Format response JSON:
{
  "caption": "...",
  "hashtags": "#tag1 #tag2 ..."
}`;

    const completion = await this.client.chat.completions.create({
      model: config.openai.model,
      messages: [
        { role: "system", content: lang.system },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      max_tokens: 600
    });

    const parsed = JSON.parse(completion.choices[0].message.content);
    return {
      caption: parsed.caption || "",
      hashtags: parsed.hashtags || ""
    };
  }

  async generateContent({ niche, product, imageStyle = "product showcase", language = "ms" }) {
    const [imageResult, textResult] = await Promise.all([
      this.generateImage({ niche, product, imageStyle, language }),
      this.generateCaption({ niche, product, imageStyle, language })
    ]);

    return {
      image: imageResult,
      caption: textResult.caption,
      hashtags: textResult.hashtags,
      fullCaption: `${textResult.caption}\n\n${textResult.hashtags}`
    };
  }

  async generateCaptionOnly({ niche, product, imageStyle = "product showcase", language = "ms" }) {
    return this.generateCaption({ niche, product, imageStyle, language });
  }
}
