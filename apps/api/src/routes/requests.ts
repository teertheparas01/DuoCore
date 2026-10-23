import { Router } from "express";
import { createRequest, getRequests, updateRequest } from "../store.js";

export const requestsRouter = Router();

requestsRouter.get("/", async (_req, res) => {
  try {
    const requests = await getRequests();
    res.json({ success: true, count: requests.length, data: requests });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

requestsRouter.post("/", async (req, res) => {
  try {
    const newRequest = await createRequest(req.body);
    res.status(201).json({ success: true, data: newRequest });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

requestsRouter.patch("/:id", async (req, res) => {
  try {
    const updated = await updateRequest(req.params.id, req.body);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(404).json({ success: false, error: err.message });
  }
});
