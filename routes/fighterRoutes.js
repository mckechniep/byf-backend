import { Router } from "express";
import { getAllFighters } from "../controllers/userController.js";

const router = Router();

// @route GET /API/fighters
// @desc Get all fighters with optional filters
// @access Public

router.get("/", getAllFighters);

export default router;

