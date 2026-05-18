import { spawn } from "node:child_process";

const DEFAULT_SYSTEM = `Kamu adalah copywriter profesional untuk TikTok Malaysia.
Tulis caption dan headline yang menarik, viral, dan relatable untuk audiens Malaysia.
Elak mengulang tema atau frasa yang sama dengan caption terdahulu.`;

function runClaude(prompt) {
  return new Promise((resolve, reject) => {
    // Pipe prompt via stdin to avoid shell escaping issues with newlines
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

export class ClaudeCopywriter {
  async generateCopy({ systemInstruction, niche, product, previousCopies = [], language = "ms" }) {
    const system = systemInstruction?.trim() || DEFAULT_SYSTEM;

    const historyNote = previousCopies.length
      ? `\n\nCaption SUDAH DIGUNAKAN — elak tema/frasa serupa:\n${previousCopies.slice(-20).map((c, i) => `${i + 1}. ${c}`).join("\n")}`
      : "";

    const langNote = language === "en"
      ? "Write in natural, engaging English."
      : "Tulis dalam Bahasa Malaysia yang natural dan relatable.";

    const fullPrompt = `${system}

---

${langNote}
Niche: ${niche}${product ? `\nProduk: ${product}` : ""}${historyNote}

Jana SATU set copywriting TikTok. Balas HANYA dalam JSON (tiada teks lain):
{
  "headline": "Tajuk pendek menarik (max 1 baris)",
  "caption": "Caption 3-5 baris dengan emoji secukupnya",
  "hashtags": "#tag1 #tag2 #tag3 (5-8 hashtag)"
}`;

    const output = await runClaude(fullPrompt);

    const start = output.indexOf("{");
    const end = output.lastIndexOf("}");
    if (start === -1 || end === -1) {
      throw new Error(`Claude tidak menjana JSON. Output: ${output.slice(0, 200)}`);
    }
    return JSON.parse(output.slice(start, end + 1));
  }
}
