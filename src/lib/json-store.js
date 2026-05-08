import fs from "node:fs/promises";
import path from "node:path";
import { ensureDir, fileExists } from "./fs-utils.js";

export class JsonStore {
  constructor(filePath, initialValue) {
    this.filePath = filePath;
    this.initialValue = initialValue;
  }

  async init() {
    await ensureDir(path.dirname(this.filePath));
    if (!(await fileExists(this.filePath))) {
      await fs.writeFile(
        this.filePath,
        JSON.stringify(this.initialValue, null, 2),
        "utf8"
      );
    }
  }

  async read() {
    await this.init();
    const contents = await fs.readFile(this.filePath, "utf8");
    return JSON.parse(contents);
  }

  async write(data) {
    await this.init();
    await fs.writeFile(this.filePath, JSON.stringify(data, null, 2), "utf8");
  }

  async update(mutator) {
    const data = await this.read();
    const next = await mutator(data);
    await this.write(next);
    return next;
  }
}
