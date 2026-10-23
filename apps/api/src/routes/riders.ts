import { Router } from "express";
import { getRiders, updateRider } from "../store.js";

export const ridersRouter = Router();

ridersRouter.get("/", async (_req, res) => {
  try {
    const riders = await getRiders();
    res.json({ success: true, count: riders.length, data: riders });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

ridersRouter.patch("/:id", async (req, res) => {
  try {
    const updated = await updateRider(req.params.id, req.body);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(404).json({ success: false, error: err.message });
  }
});
