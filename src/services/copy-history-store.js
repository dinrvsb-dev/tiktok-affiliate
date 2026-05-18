import path from "node:path";
import { config } from "../config.js";
import { JsonStore } from "../lib/json-store.js";

// Stores copy history per openId: { "openId": ["caption1", "caption2", ...] }
const store = new JsonStore(path.join(config.dataDir, "copy-history.json"), {});

export class CopyHistoryStore {
  async getHistory(openId) {
    const all = await store.read();
    return all[openId] || [];
  }

  async appendCopy(openId, caption) {
    await store.update((all) => {
      if (!all[openId]) all[openId] = [];
      all[openId].push(caption);
      if (all[openId].length > 100) all[openId] = all[openId].slice(-100);
      return all;
    });
  }

  async clearHistory(openId) {
    await store.update((all) => {
      delete all[openId];
      return all;
    });
  }
}
