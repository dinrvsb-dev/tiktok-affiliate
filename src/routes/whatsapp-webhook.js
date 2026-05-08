import express from "express";
import { config } from "../config.js";

export function createWhatsAppWebhookRouter({ submissionService }) {
  const router = express.Router();

  router.get("/", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === config.whatsapp.verifyToken) {
      return res.status(200).send(challenge);
    }

    return res.status(403).send("Forbidden");
  });

  router.post("/", async (req, res, next) => {
    try {
      await submissionService.handleWebhookPayload(req.body);
      res.status(200).json({ received: true });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
