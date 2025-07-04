import express from "express";
import logger from "morgan";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

import userRoutes from "./routes/userRoutes.js";
import fighterRouter from "./routes/fighterRoutes.js";

// Load environment variables (from .env file)
// dotenv.config() reads the .env file and merges variables into process.env.
// You can then access them in your code with process.env.JWT_SECRET, for example, to sign or verify JWTs.
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(logger("dev"));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to database'))
    .catch((err) => console.error('Connection error:', err));

// Routes
app.use("/api/users", userRoutes);
app.use("/api/fighters", fighterRouter); // Mount the fighters router

app.listen(PORT, () => {
    console.log(`Sever running on http://localhost:${PORT}`);
});

