// routes/fightRoutes.js - Fight system routes with comprehensive validation
import { Router } from "express";
import {
    createFightFromChallenge,
    updateFightDetails,
    startFight,
    recordFightResult,
    cancelFight,
    postponeFight,
    addFightStats,
    getFightById,
    getUserFights,
    getUpcomingFights,
    getRecentResults,
    verifyFight
} from "../controllers/fightController.js";
import verifyToken from "../middleware/verifyToken.js";
import { validateInput, validateObjectId } from "../middleware/validation.js";
import { createLimiter } from "../middleware/security.js";

const router = Router();

/**
 * PUBLIC ROUTES
 * These routes are accessible without authentication
 */

// @route   GET /api/fights/upcoming
// @desc    Get upcoming scheduled fights
// @access  Public
// @query   limit?
router.get("/upcoming",
    validateInput('upcomingFightsQuery', 'query'), // Validate query parameters
    getUpcomingFights                               // Handle getting upcoming fights
);

// @route   GET /api/fights/recent-results
// @desc    Get recent fight results
// @access  Public
// @query   limit?
router.get("/recent-results",
    validateInput('recentResultsQuery', 'query'),   // Validate query parameters
    getRecentResults                                // Handle getting recent results
);

// @route   GET /api/fights/:id
// @desc    Get a specific fight by ID
// @access  Public (with visibility restrictions)
router.get("/:id",
    validateObjectId('id'),                         // Validate fight ID format
    getFightById                                    // Handle getting specific fight
);

// @route   GET /api/fights/user/:userId
// @desc    Get a user's fight history
// @access  Public
// @query   status?, page?, limit?, sort?
router.get("/user/:userId",
    validateObjectId('userId'),                     // Validate user ID format
    validateInput('fightQuery', 'query'),           // Validate query parameters
    getUserFights                                   // Handle getting user's fights
);

/**
 * PROTECTED ROUTES
 * All routes below require authentication
 */
router.use(verifyToken);

/**
 * FIGHT CREATION & MANAGEMENT ROUTES
 */

// @route   POST /api/fights/from-challenge
// @desc    Create a fight from an accepted challenge
// @access  Private (Challenge participants or admin)
// @body    { challengeId, fightDetails? }
router.post("/from-challenge",
    createLimiter,                                  // Rate limit fight creation
    validateInput('createFightFromChallenge'),      // Validate fight creation data
    createFightFromChallenge                        // Handle fight creation
);

// @route   PATCH /api/fights/:id/details
// @desc    Update fight details (before fight happens)
// @access  Private (Fight participants or admin)
// @body    { details: { scheduledDate?, venue?, weightClass?, rules? } }
router.patch("/:id/details",
    validateObjectId('id'),                         // Validate fight ID format
    validateInput('updateFightDetails'),            // Validate fight details update
    updateFightDetails                              // Handle updating fight details
);

/**
 * FIGHT STATUS MANAGEMENT ROUTES
 */

// @route   PATCH /api/fights/:id/start
// @desc    Start a fight (change status to in-progress)
// @access  Private (Admin or referee)
router.patch("/:id/start",
    validateObjectId('id'),                         // Validate fight ID format
    startFight                                      // Handle starting fight (no body validation)
);

// @route   PATCH /api/fights/:id/result
// @desc    Record fight result
// @access  Private (Admin or participants after fight)
// @body    { winnerId?, method, details? }
router.patch("/:id/result",
    validateObjectId('id'),                         // Validate fight ID format
    validateInput('recordFightResult'),             // Validate result data
    recordFightResult                               // Handle recording result
);

// @route   PATCH /api/fights/:id/cancel
// @desc    Cancel a fight
// @access  Private (Admin or both participants)
// @body    { reason }
router.patch("/:id/cancel",
    validateObjectId('id'),                         // Validate fight ID format
    validateInput('cancelFight'),                   // Validate cancellation data
    cancelFight                                     // Handle cancelling fight
);

// @route   PATCH /api/fights/:id/postpone
// @desc    Postpone a fight
// @access  Private (Admin or both participants)
// @body    { newDate, reason? }
router.patch("/:id/postpone",
    validateObjectId('id'),                         // Validate fight ID format
    validateInput('postponeFight'),                 // Validate postpone data
    postponeFight                                   // Handle postponing fight
);

/**
 * FIGHT DATA MANAGEMENT ROUTES
 */

// @route   PATCH /api/fights/:id/stats
// @desc    Add fight statistics
// @access  Private (Admin only)
// @body    { stats: [{ fighter, strikes?, takedowns?, submissions?, controlTime? }] }
router.patch("/:id/stats",
    validateObjectId('id'),                         // Validate fight ID format
    validateInput('addFightStats'),                 // Validate stats data
    addFightStats                                   // Handle adding fight stats
);

// @route   PATCH /api/fights/:id/verify
// @desc    Verify fight result (admin function)
// @access  Private (Admin only)
// @body    { notes? }
router.patch("/:id/verify",
    validateObjectId('id'),                         // Validate fight ID format
    validateInput('verifyFight'),                   // Validate verification data
    verifyFight                                     // Handle verifying fight
);

/**
 * FUTURE ROUTES
 * These routes are ready for implementation as features expand
 */

// @route   GET /api/fights/weight-class/:weightClass
// @desc    Get fights by weight class
// @access  Public
// @query   page?, limit?, sort?, status?
// router.get("/weight-class/:weightClass",
//     validateInput('weightClassParam', 'params'),    // Validate weight class param
//     validateInput('fightQuery', 'query'),           // Validate query parameters
//     getFightsByWeightClass                          // Handle getting fights by weight class
// );

// @route   GET /api/fights/search
// @desc    Search fights
// @access  Public
// @query   query, filters?, page?, limit?
// router.get("/search",
//     validateInput('searchFightsQuery', 'query'),    // Validate search parameters
//     searchFights                                    // Handle searching fights
// );

// @route   POST /api/fights/:id/media
// @desc    Upload fight media (photos/videos)
// @access  Private (Fight participants or admin)
// router.post("/:id/media",
//     validateObjectId('id'),                         // Validate fight ID format
//     upload.single('media'),                         // Handle file upload (when implemented)
//     validateInput('uploadFightMedia'),              // Validate media metadata
//     uploadFightMedia                                // Handle media upload
// );

export default router;