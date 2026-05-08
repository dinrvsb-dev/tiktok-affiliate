import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../config.js";

function dbPath() {
  return path.resolve(config.dataDir, "affiliates.json");
}

async function readDb() {
  try {
    const raw = await fs.readFile(dbPath(), "utf-8");
    return JSON.parse(raw);
  } catch {
    return { affiliates: [] };
  }
}

async function writeDb(db) {
  await fs.writeFile(dbPath(), JSON.stringify(db, null, 2), "utf-8");
}

export class AffiliateStore {
  async list(status) {
    const db = await readDb();
    if (status) return db.affiliates.filter((a) => a.status === status);
    return db.affiliates;
  }

  async getById(id) {
    const db = await readDb();
    return db.affiliates.find((a) => a.id === id) || null;
  }

  async save(affiliate) {
    const db = await readDb();
    const idx = db.affiliates.findIndex((a) => a.id === affiliate.id);
    if (idx >= 0) {
      db.affiliates[idx] = affiliate;
    } else {
      db.affiliates.push(affiliate);
    }
    await writeDb(db);
    return affiliate;
  }

  async delete(id) {
    const db = await readDb();
    db.affiliates = db.affiliates.filter((a) => a.id !== id);
    await writeDb(db);
  }
}
