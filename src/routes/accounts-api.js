import express from "express";
import {
  assignAffiliate,
  createAccount,
  isInactive,
  markActive,
  unassignAffiliate,
  AccountStatus
} from "../domain/account-model.js";
import { AccountStore } from "../services/account-store.js";

const store = new AccountStore();

export function createAccountsRouter() {
  const router = express.Router();

  router.get("/", async (req, res, next) => {
    try {
      const accounts = await store.list();
      const withFlags = accounts.map((a) => ({ ...a, inactive: isInactive(a) }));
      res.json({ accounts: withFlags });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id", async (req, res, next) => {
    try {
      const account = await store.getById(req.params.id);
      if (!account) return res.status(404).json({ error: "Account not found" });
      res.json({ account: { ...account, inactive: isInactive(account) } });
    } catch (error) {
      next(error);
    }
  });

  router.post("/", async (req, res, next) => {
    try {
      const account = createAccount(req.body);
      await store.save(account);
      res.status(201).json({ account });
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:id", async (req, res, next) => {
    try {
      const account = await store.getById(req.params.id);
      if (!account) return res.status(404).json({ error: "Account not found" });

      const fields = ["tiktokUsername", "password", "email", "phone", "type", "status", "notes"];
      for (const f of fields) {
        if (req.body[f] !== undefined) account[f] = req.body[f];
      }
      account.updatedAt = new Date().toISOString();
      await store.save(account);
      res.json({ account });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:id/assign", async (req, res, next) => {
    try {
      const account = await store.getById(req.params.id);
      if (!account) return res.status(404).json({ error: "Account not found" });
      assignAffiliate(account, { name: req.body.name, phone: req.body.phone, startDate: req.body.startDate });
      await store.save(account);
      res.json({ account });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:id/unassign", async (req, res, next) => {
    try {
      const account = await store.getById(req.params.id);
      if (!account) return res.status(404).json({ error: "Account not found" });
      unassignAffiliate(account);
      await store.save(account);
      res.json({ account });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:id/mark-active", async (req, res, next) => {
    try {
      const account = await store.getById(req.params.id);
      if (!account) return res.status(404).json({ error: "Account not found" });
      markActive(account);
      await store.save(account);
      res.json({ account });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:id", async (req, res, next) => {
    try {
      await store.delete(req.params.id);
      res.json({ deleted: true });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
