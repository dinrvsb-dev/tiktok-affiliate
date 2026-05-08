import path from "node:path";
import { config } from "../config.js";
import { JsonStore } from "../lib/json-store.js";

const accountsStore = new JsonStore(path.join(config.dataDir, "creator-accounts.json"), []);
const postsStore = new JsonStore(path.join(config.dataDir, "studio-posts.json"), []);

export class PostStore {
  async listAccounts() {
    return accountsStore.read();
  }

  async getAccount(openId) {
    const accounts = await this.listAccounts();
    return accounts.find((a) => a.openId === openId) || null;
  }

  async getDefaultAccount() {
    const accounts = await this.listAccounts();
    return accounts[0] || null;
  }

  async saveAccount(account) {
    await accountsStore.update((accounts) => {
      const idx = accounts.findIndex((a) => a.openId === account.openId);
      if (idx >= 0) accounts[idx] = { ...accounts[idx], ...account };
      else accounts.push(account);
      return accounts;
    });
    return account;
  }

  async deleteAccount(openId) {
    await accountsStore.update((accounts) => accounts.filter((a) => a.openId !== openId));
  }

  async listPosts({ status } = {}) {
    const posts = await postsStore.read();
    return status ? posts.filter((p) => p.status === status) : posts;
  }

  async getPost(id) {
    const posts = await postsStore.read();
    return posts.find((p) => p.id === id) || null;
  }

  async savePost(post) {
    await postsStore.update((posts) => {
      const idx = posts.findIndex((p) => p.id === post.id);
      if (idx >= 0) posts[idx] = post;
      else posts.unshift(post);
      return posts;
    });
    return post;
  }

  async updatePost(id, updates) {
    let updated;
    await postsStore.update((posts) => {
      const idx = posts.findIndex((p) => p.id === id);
      if (idx >= 0) {
        posts[idx] = { ...posts[idx], ...updates };
        updated = posts[idx];
      }
      return posts;
    });
    return updated;
  }
}
