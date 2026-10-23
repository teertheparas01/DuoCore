import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { dispatchRouter } from "./routes/dispatch.js";
import { donationsRouter } from "./routes/donations.js";
import { interventionsRouter } from "./routes/interventions.js";
import { networkRouter } from "./routes/network.js";
import { requestsRouter } from "./routes/requests.js";
import { ridersRouter } from "./routes/riders.js";
import { getDb } from "./store.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Health Check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "AidFlow / अन्नपूर्ण Civic Logistics Backend API",
    city: "Pune",
    sector: "Shivaji Nagar & Mutha River Corridor",
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
app.use("/api/donations", donationsRouter);
app.use("/api/requests", requestsRouter);
app.use("/api/riders", ridersRouter);
app.use("/api/dispatch", dispatchRouter);
app.use("/api/interventions", interventionsRouter);
app.use("/api/network", networkRouter);

// Initialize DB and start server
getDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n======================================================`);
      console.log(`  अन्नपूर्ण (AidFlow) API Server Running on Port ${PORT}`);
      console.log(`  Health Check: http://127.0.0.1:${PORT}/api/health`);
      console.log(`  Donations:    http://127.0.0.1:${PORT}/api/donations`);
      console.log(`  Requests:     http://127.0.0.1:${PORT}/api/requests`);
      console.log(`  Riders:       http://127.0.0.1:${PORT}/api/riders`);
      console.log(`  Dispatch:     http://127.0.0.1:${PORT}/api/dispatch`);
      console.log(`  Network:      http://127.0.0.1:${PORT}/api/network/telemetry`);
      console.log(`======================================================\n`);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize database:", err);
    process.exit(1);
  });
