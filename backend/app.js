import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import db from "./db.js"; // Import the Firestore instance
import authRoutes from "./routes/auth.js";
import photoRoutes from "./routes/photos.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/photos", photoRoutes);

// Server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
