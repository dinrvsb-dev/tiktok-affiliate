import { spawn } from "node:child_process";

const DEFAULT_SYSTEM = `Kamu adalah copywriter profesional untuk TikTok Malaysia.
Tulis caption dan headline yang menarik, viral, dan relatable untuk audiens Malaysia.
Elak mengulang tema atau frasa yang sama dengan caption terdahulu.`;

function runClaude(prompt) {
  return new Promise((resolve, reject) => {
    const proc = spawn("claude", ["-p"], {
      shell: true // needed to find claude.cmd on Windows
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    proc.stderr.on("data", (chunk) => { stderr += chunk.toString(); });

    proc.stdin.write(prompt, "utf8");
    proc.stdin.end();

    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Claude CLI error (${code}): ${stderr.slice(0, 300) || "unknown"}`));
      } else {
        resolve(stdout);
      }
    });

    proc.on("error", (err) => {
      reject(new Error(`Claude CLI tidak dijumpai. Pastikan 'claude' diinstall dan dalam PATH. (${err.message})`));
    });
  });
}

function parseJson(output, label) {
  const start = output.indexOf("{");
  const end = output.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error(`Claude tidak menjana JSON untuk ${label}. Output: ${output.slice(0, 200)}`);
  }
  return JSON.parse(output.slice(start, end + 1));
}

export class ClaudeCopywriter {
  async generateAngle({ niche, product, language = "ms" }) {
    const langNote = language === "en"
      ? "Write in natural English."
      : "Tulis dalam Bahasa Malaysia yang natural.";

    const prompt = `Kamu adalah content strategist TikTok Malaysia yang pakar dalam emotional storytelling.

${langNote}
Niche: ${niche}${product ? `\nProduk: ${product}` : ""}

Jana SATU "angle" (sudut cerita) yang:
- Berdasarkan situasi kehidupan sebenar yang relatable
- Bermula dengan moment specific yang orang boleh "nampak dalam kepala"
- Emosional tapi realistic, bukan dramatik berlebihan
- Sesuai untuk TikTok awareness/soft-sell

Contoh angle yang bagus:
- "anak dah 3 tahun tapi tak boleh sebut 'mama' dengan jelas"
- "tengah malam scroll phone, tapi sebenarnya tengah lari dari fikiran sendiri"
- "bukan penat kerja. penat pretend ok je"

Balas HANYA dalam JSON (tiada teks lain):
{"angle": "satu ayat angle yang specific dan relatable"}`;

    const output = await runClaude(prompt);
    return parseJson(output, "angle");
  }

  async generateCopy({ systemInstruction, niche, product, angle, previousCopies = [], language = "ms" }) {
    const system = systemInstruction?.trim() || DEFAULT_SYSTEM;

    const historyNote = previousCopies.length
      ? `\n\nCaption SUDAH DIGUNAKAN — elak tema/frasa serupa:\n${previousCopies.slice(-20).map((c, i) => `${i + 1}. ${c}`).join("\n")}`
      : "";

    const langNote = language === "en"
      ? "Write in natural, engaging English."
      : "Tulis dalam Bahasa Malaysia yang natural dan relatable.";

    const angleNote = angle
      ? `\nAngle/Sudut Cerita: "${angle}"\nBina caption BERDASARKAN angle ini.`
      : "";

    const fullPrompt = `${system}

---

${langNote}
Niche: ${niche}${product ? `\nProduk: ${product}` : ""}${angleNote}${historyNote}

Jana SATU set copywriting TikTok. Balas HANYA dalam JSON (tiada teks lain):
{
  "headline": "Tajuk pendek menarik (max 1 baris)",
  "caption": "Caption 3-5 baris dengan emoji secukupnya",
  "hashtags": "#tag1 #tag2 #tag3 (5-8 hashtag)"
}`;

    const output = await runClaude(fullPrompt);
    return parseJson(output, "copy");
  }
}
