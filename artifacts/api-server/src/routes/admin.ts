import { Router } from "express";
import { requireOwner } from "../middlewares/auth";
import { purgeCloudflareCache } from "../lib/cloudflareCachePurge";

const router = Router();

/**
 * POST /admin/purge-cache
 *
 * Triggers a Cloudflare cache purge for 333lives.app key pages on demand.
 * Protected by the owner flag — only the app owner's account can call this.
 * Useful when the web artifact is redeployed without restarting the API server.
 */
router.post("/admin/purge-cache", requireOwner, async (req, res) => {
  try {
    await purgeCloudflareCache();
    req.log.info("Cloudflare cache purged via admin endpoint");
    return res.json({ success: true });
  } catch (error) {
    req.log.error({ err: error }, "Cloudflare cache purge failed via admin endpoint");
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(502).json({ success: false, error: message });
  }
});

export default router;
