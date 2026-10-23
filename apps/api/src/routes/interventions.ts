import { Router } from "express";
import { getInterventions, resolveIntervention } from "../store.js";

export const interventionsRouter = Router();

interventionsRouter.get("/", async (_req, res) => {
  try {
    const list = await getInterventions();
    res.json({ success: true, count: list.length, data: list });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

interventionsRouter.post("/:id/resolve", async (req, res) => {
  try {
    const resolved = await resolveIntervention(req.params.id);
    res.json({ success: true, message: "Intervention resolved", data: resolved });
  } catch (err: any) {
    res.status(404).json({ success: false, error: err.message });
  }
});
