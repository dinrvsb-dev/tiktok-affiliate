import express from "express";
import { createAffiliate, AffiliateStatus } from "../domain/affiliate-model.js";
import { AffiliateStore } from "../services/affiliate-store.js";

const store = new AffiliateStore();

export function createAffiliatePublicRouter() {
  const router = express.Router();

  router.post("/daftar", async (req, res, next) => {
    try {
      const { namaLengkap, noFon, emel, alamatBaris1, alamatBaris2, alamatBaris3, poskod, daerah, negeri, akauntTiktok, namaBank, noAkauntBank } = req.body;
      if (!namaLengkap || !noFon || !emel) {
        return res.status(400).json({ error: "Nama, no. fon dan emel diperlukan." });
      }
      const affiliate = createAffiliate({ namaLengkap, noFon, emel, alamatBaris1, alamatBaris2, alamatBaris3, poskod, daerah, negeri, akauntTiktok, namaBank, noAkauntBank });
      await store.save(affiliate);
      res.status(201).json({ success: true, id: affiliate.id });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export function createAffiliateAdminRouter() {
  const router = express.Router();

  router.post("/", async (req, res, next) => {
    try {
      const { namaLengkap, noFon, emel, alamat, akauntTiktok, namaBank, noAkauntBank } = req.body;
      const affiliate = createAffiliate({ namaLengkap, noFon, emel, alamat, akauntTiktok, namaBank, noAkauntBank });
      affiliate.status = AffiliateStatus.Approved;
      await store.save(affiliate);
      res.status(201).json({ affiliate });
    } catch (error) {
      next(error);
    }
  });

  router.get("/", async (req, res, next) => {
    try {
      const affiliates = await store.list(req.query.status);
      const sorted = affiliates.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
      res.json({ affiliates: sorted });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id", async (req, res, next) => {
    try {
      const affiliate = await store.getById(req.params.id);
      if (!affiliate) return res.status(404).json({ error: "Tidak dijumpai." });
      res.json({ affiliate });
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:id", async (req, res, next) => {
    try {
      const affiliate = await store.getById(req.params.id);
      if (!affiliate) return res.status(404).json({ error: "Tidak dijumpai." });
      const fields = ["namaLengkap", "noFon", "emel", "alamat", "akauntTiktok", "namaBank", "noAkauntBank", "status", "notes", "submittedAt"];
      for (const f of fields) {
        if (req.body[f] !== undefined) affiliate[f] = req.body[f];
      }
      affiliate.updatedAt = new Date().toISOString();
      await store.save(affiliate);
      res.json({ affiliate });
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
