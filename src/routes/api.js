import express from "express";
import { missingMetadataFields } from "../services/metadata-parser.js";

export function createApiRouter({ submissionService }) {
  const router = express.Router();

  router.get("/submissions", async (req, res, next) => {
    try {
      const submissions = await submissionService.listSubmissions(req.query.status);
      res.json({ submissions });
    } catch (error) {
      next(error);
    }
  });

  router.get("/submissions/:id", async (req, res, next) => {
    try {
      const submission = await submissionService.getSubmission(req.params.id);
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      return res.json({
        submission,
        missingMetadata: missingMetadataFields(submission.metadata)
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/submissions/:id/approve", async (req, res, next) => {
    try {
      const submission = await submissionService.approveSubmission(req.params.id, {
        reviewer: req.body.reviewer || "admin",
        overrides: req.body.overrides || {}
      });
      res.json({ submission });
    } catch (error) {
      next(error);
    }
  });

  router.post("/submissions/:id/reject", async (req, res, next) => {
    try {
      const submission = await submissionService.rejectSubmission(req.params.id, {
        reviewer: req.body.reviewer || "admin",
        reason: req.body.reason || ""
      });
      res.json({ submission });
    } catch (error) {
      next(error);
    }
  });

  router.post("/submissions/:id/retry", async (req, res, next) => {
    try {
      const submission = await submissionService.retrySubmission(req.params.id);
      res.json({ submission });
    } catch (error) {
      next(error);
    }
  });

  router.post("/dev/submissions", async (req, res, next) => {
    try {
      const submission = await submissionService.createManualSubmission({
        senderPhone: req.body.senderPhone || "manual",
        metadata: req.body.metadata || {},
        imagePath: req.body.imagePath,
        mimeType: req.body.mimeType || "image/jpeg"
      });
      res.status(201).json({ submission });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
