import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../config.js";

function dbPath() {
  return path.resolve(config.dataDir, "accounts.json");
}

async function readDb() {
  try {
    const raw = await fs.readFile(dbPath(), "utf-8");
    return JSON.parse(raw);
  } catch {
    return { accounts: [] };
  }
}

async function writeDb(db) {
  await fs.writeFile(dbPath(), JSON.stringify(db, null, 2), "utf-8");
}

export class AccountStore {
  async list() {
    const db = await readDb();
    return db.accounts;
  }

  async getById(id) {
    const db = await readDb();
    return db.accounts.find((a) => a.id === id) || null;
  }

  async save(account) {
    const db = await readDb();
    const idx = db.accounts.findIndex((a) => a.id === account.id);
    if (idx >= 0) {
      db.accounts[idx] = account;
    } else {
      db.accounts.push(account);
    }
    await writeDb(db);
    return account;
  }

  async delete(id) {
    const db = await readDb();
    db.accounts = db.accounts.filter((a) => a.id !== id);
    await writeDb(db);
  }
}
