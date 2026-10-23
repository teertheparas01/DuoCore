import { Router } from "express";
import { autoMatchDispatches, getDispatches, updateDispatch } from "../store.js";

export const dispatchRouter = Router();

dispatchRouter.get("/", async (_req, res) => {
  try {
    const dispatches = await getDispatches();
    res.json({ success: true, count: dispatches.length, data: dispatches });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

dispatchRouter.post("/auto-match", async (_req, res) => {
  try {
    const matched = await autoMatchDispatches();
    res.json({ success: true, message: "Auto-matching executed", data: matched });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

dispatchRouter.patch("/:id", async (req, res) => {
  try {
    const updated = await updateDispatch(req.params.id, req.body);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(404).json({ success: false, error: err.message });
  }
});
