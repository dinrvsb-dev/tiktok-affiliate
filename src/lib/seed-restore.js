import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../config.js";

const SENTINEL_FILE = "accounts.json"; // if this exists, data is already restored

export async function autoRestoreFromSeedData() {
  const seedData = process.env.SEED_DATA;
  if (!seedData) return;

  const sentinelPath = path.join(config.dataDir, SENTINEL_FILE);
  try {
    await fs.access(sentinelPath);
    return; // data already exists, skip
  } catch {
    // file doesn't exist — proceed with restore
  }

  try {
    const json = Buffer.from(seedData, "base64").toString("utf8");
    const data = JSON.parse(json);
    await fs.mkdir(config.dataDir, { recursive: true });

    let count = 0;
    for (const [file, value] of Object.entries(data)) {
      if (value !== null && value !== undefined) {
        await fs.writeFile(path.join(config.dataDir, file), JSON.stringify(value, null, 2), "utf8");
        count++;
      }
    }
    console.log(`[SeedRestore] Auto-restored ${count} data files from SEED_DATA env var.`);
  } catch (err) {
    console.error("[SeedRestore] Failed to restore from SEED_DATA:", err.message);
  }
}
