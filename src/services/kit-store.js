import path from "node:path";
import crypto from "node:crypto";
import { config } from "../config.js";
import { JsonStore } from "../lib/json-store.js";

const store = new JsonStore(path.join(config.dataDir, "content-kits.json"), []);

export class KitStore {
  async list({ status } = {}) {
    const kits = await store.read();
    return status ? kits.filter((k) => k.status === status) : kits;
  }

  async get(id) {
    const kits = await store.read();
    return kits.find((k) => k.id === id) || null;
  }

  async save(kit) {
    if (!kit.id) kit.id = crypto.randomUUID();
    await store.update((kits) => {
      const idx = kits.findIndex((k) => k.id === kit.id);
      if (idx >= 0) kits[idx] = kit;
      else kits.unshift(kit);
      return kits;
    });
    return kit;
  }

  async updateStatus(id, status, extra = {}) {
    let updated;
    await store.update((kits) => {
      const idx = kits.findIndex((k) => k.id === id);
      if (idx >= 0) {
        kits[idx] = { ...kits[idx], status, ...extra };
        updated = kits[idx];
      }
      return kits;
    });
    return updated;
  }
}
