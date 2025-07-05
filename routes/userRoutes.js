// routes/userRoutes.js - Updated with validation middleware
import { Router } from "express";
import { 
    signup, 
    signin, 
    stepIntoTheCage, 
    getMyProfile, 
    updateMyProfile, 
    updateFighterProfile 
} from "../controllers/userController.js";
import verifyToken from "../middleware/verifyToken.js";
import { validateInput } from "../middleware/validation.js";
import { createLimiter } from "../middleware/security.js";

const router = Router();

/**
 * WHY WE'RE ADDING VALIDATION:
 * - validateInput('signup') checks username, email, password format
 * - validateInput('signin') ensures required fields are present
 * - createLimiter prevents spam account creation
 * - All inputs are sanitized and validated before reaching controllers
 */

// Public routes
router.post("/signup", 
    createLimiter,                    // Rate limit account creation
    validateInput('signup'),          // Validate signup data
    signup                           // Handle signup
);

router.post("/signin", 
    validateInput('signin'),          // Validate login data
    signin                           // Handle signin
);

// Protected routes (require authentication)
router.use(verifyToken);             // All routes below require valid JWT

router.post("/become-fighter", 
    stepIntoTheCage                  // No additional validation needed
);

router.get("/me", 
    getMyProfile                     // No validation needed for GET
);

router.patch("/me", 
    validateInput('updateProfile'),   // Validate profile update data
    updateMyProfile                  // Handle profile update
);

router.patch("/me/fighter", 
    validateInput('updateFighterProfile'), // Validate fighter-specific data
    updateFighterProfile             // Handle fighter profile update
);

export default router;