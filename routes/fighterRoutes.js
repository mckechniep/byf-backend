// routes/fighterRoutes.js - Enhanced with proper validation and separation of concerns
import { Router } from "express";
import { getAllFighters } from "../controllers/userController.js";
import { validateInput } from "../middleware/validation.js";

const router = Router();

/**
 * PUBLIC FIGHTER ROUTES
 * These routes are accessible without authentication
 */

// @route   GET /api/fighters
// @desc    Get all fighters with optional filters and pagination
// @access  Public
// @query   weight, height, styles, city, state, country, page, limit, sort
router.get("/", 
    validateInput('fighterQuery', 'query'), // Validate query parameters
    getAllFighters                          // Handle getting filtered fighters
);

/**
 * FUTURE FIGHTER-SPECIFIC ROUTES
 * These would be implemented as the app grows
 */

// Get specific fighter profile by ID
// router.get("/:fighterId", 
//     validateObjectId('fighterId'),       // Validate fighter ID format
//     getFighterProfile                    // Handle getting specific fighter
// );

// Get fighter's fight history
// router.get("/:fighterId/fights", 
//     validateObjectId('fighterId'),       // Validate fighter ID format
//     getFighterFights                     // Handle getting fighter's fights
// );

// Get fighter's stats/analytics
// router.get("/:fighterId/stats", 
//     validateObjectId('fighterId'),       // Validate fighter ID format
//     getFighterStats                      // Handle getting fighter statistics
// );

export default router;