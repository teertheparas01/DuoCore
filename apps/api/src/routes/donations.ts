import { Router } from "express";
import { createDonation, getDonations, splitDonation } from "../store.js";

export const donationsRouter = Router();

donationsRouter.get("/", async (_req, res) => {
  try {
    const donations = await getDonations();
    res.json({ success: true, count: donations.length, data: donations });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

donationsRouter.post("/", async (req, res) => {
  try {
    const donation = await createDonation(req.body);
    res.status(201).json({ success: true, data: donation });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

donationsRouter.post("/:id/split", async (req, res) => {
  try {
    const subBatches = await splitDonation(req.params.id);
    res.json({ success: true, message: "Batch split successfully", data: subBatches });
  } catch (err: any) {
    res.status(404).json({ success: false, error: err.message });
  }
});
