// routes/userRoutes.js - Enhanced with comprehensive validation
import { Router } from "express";
import { 
    signup, 
    signin, 
    stepIntoTheCage, 
    getMyProfile, 
    updateMyProfile, 
    updateFighterProfile,
    getAllFighters 
} from "../controllers/userController.js";
import verifyToken from "../middleware/verifyToken.js";
import { validateInput, validateObjectId } from "../middleware/validation.js";
import { createLimiter } from "../middleware/security.js";

const router = Router();

/**
 * PUBLIC ROUTES
 * These routes don't require authentication
 */

// User Registration
router.post("/signup", 
    createLimiter,                    // Rate limit account creation to prevent spam
    validateInput('signup'),          // Validate signup data (username, email, password)
    signup                           // Handle signup logic
);

// User Login
router.post("/signin", 
    validateInput('signin'),          // Validate login data (username, password)
    signin                           // Handle signin logic
);

// Get all fighters (public endpoint for browsing)
router.get("/fighters", 
    validateInput('fighterQuery', 'query'), // Validate query parameters
    getAllFighters                   // Handle getting all fighters with filters
);

/**
 * PROTECTED ROUTES
 * All routes below this middleware require valid JWT authentication
 */
router.use(verifyToken);

/**
 * USER PROFILE ROUTES
 */

// Get current user's profile
router.get("/me", 
    getMyProfile                     // No validation needed for GET request
);

// Update current user's general profile
router.patch("/me", 
    validateInput('updateProfile'),   // Validate profile update data
    updateMyProfile                  // Handle profile update
);

// Transition from fan to fighter ("Step Into The Cage")
router.post("/become-fighter", 
    stepIntoTheCage                  // No body validation needed, just auth
);

/**
 * FIGHTER-SPECIFIC ROUTES
 */

// Update fighter-specific profile details
router.patch("/me/fighter", 
    validateInput('updateFighterProfile'), // Validate fighter-specific data
    updateFighterProfile             // Handle fighter profile update
);

/**
 * BETTING ROUTES (Future implementation)
 * Commented out for now, but validation is ready
 */

// Place a bet on a fighter
// router.post("/bets", 
//     validateInput('placeBet'),       // Validate bet data
//     placeBet                         // Handle placing bet
// );

// Get current user's betting history
// router.get("/bets", 
//     getBettingHistory               // Handle getting user's bets
// );

/**
 * SOCIAL FEATURES (Future implementation)
 */

// Add a comment/review
// router.post("/comments", 
//     validateInput('addComment'),     // Validate comment data
//     addComment                      // Handle adding comment
// );

// Follow/unfollow a fighter
// router.post("/follow/:fighterId", 
//     validateObjectId('fighterId'),   // Validate fighter ID format
//     followFighter                   // Handle follow logic
// );

// router.delete("/follow/:fighterId", 
//     validateObjectId('fighterId'),   // Validate fighter ID format
//     unfollowFighter                 // Handle unfollow logic
// );

export default router;