import { Router } from "express";
import { getActivities } from "../store.js";

export const networkRouter = Router();

networkRouter.get("/telemetry", async (_req, res) => {
  res.json({
    success: true,
    data: {
      overallHealth: 98.4,
      totalKgDistributedToday: 485,
      totalMealsDelivered: 1240,
      avgTransitMinutes: 14.2,
      zeroSpoilageRate: 99.1,
      activeBottlenecks: 1,
      sectors: [
        { id: "SEC-01", name: "FC Road Corridor", activeDonors: 6, activeRiders: 4, avgDeliveryMinutes: 12, compliance: "100%" },
        { id: "SEC-02", name: "JM Road Commercial", activeDonors: 4, activeRiders: 5, avgDeliveryMinutes: 14, compliance: "96.4%" },
        { id: "SEC-03", name: "COEP & Sangam", activeDonors: 3, activeRiders: 5, avgDeliveryMinutes: 16, compliance: "98.1%" },
        { id: "SEC-04", name: "Agri College & Station", activeDonors: 2, activeRiders: 4, avgDeliveryMinutes: 10, compliance: "100%" },
      ],
      bridges: [
        { name: "Sangam Bridge (COEP Link)", status: "Clear & Fast", travelTime: "4 mins", flow: "Normal Flow" },
        { name: "Dengle Bridge (River Crossing)", status: "Clear", travelTime: "6 mins", flow: "Normal Flow" },
        { name: "Shivaji Bridge (Old City Gate)", status: "Heavy Traffic", travelTime: "11 mins", flow: "Dense" },
        { name: "Mutha River Water Level", status: "Safe / Baseline", travelTime: "1.2m depth", flow: "Safe" },
      ],
    },
  });
});

networkRouter.get("/activity", async (_req, res) => {
  try {
    const activities = await getActivities();
    res.json({ success: true, count: activities.length, data: activities });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
