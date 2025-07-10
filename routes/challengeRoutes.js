// routes/challengeRoutes.js - Challenge system routes with comprehensive validation
import { Router } from "express";
import {
    createChallenge,
    acceptChallenge,
    declineChallenge,
    cancelChallenge,
    updateChallengeDetails,
    addMessageToChallenge,
    getMyChallenges,
    getPendingChallenges,
    getChallengeById
} from "../controllers/challengeController.js";
import verifyToken from "../middleware/verifyToken.js";
import { validateInput, validateObjectId } from "../middleware/validation.js";
import { createLimiter } from "../middleware/security.js";

const router = Router();

/**
 * ALL CHALLENGE ROUTES REQUIRE AUTHENTICATION
 * Apply JWT verification to all routes
 */
router.use(verifyToken);

/**
 * CHALLENGE CREATION & MANAGEMENT ROUTES
 */

// @route   POST /api/challenges
// @desc    Create a new challenge
// @access  Private (Fighters only)
// @body    { challengedId, fightDetails?, message }
router.post("/",
    createLimiter,                          // Rate limit challenge creation to prevent spam
    validateInput('createChallenge'),       // Validate challenge creation data
    createChallenge                         // Handle challenge creation
);

// @route   GET /api/challenges/my
// @desc    Get all challenges for the current user (sent and received)
// @access  Private
// @query   status?, role?, page?, limit?, sort?
router.get("/my",
    validateInput('challengeQuery', 'query'), // Validate query parameters
    getMyChallenges                         // Handle getting user's challenges
);

// @route   GET /api/challenges/pending
// @desc    Get pending challenges that need user's response
// @access  Private
router.get("/pending",
    getPendingChallenges                    // Handle getting pending challenges (no validation needed)
);

// @route   GET /api/challenges/:id
// @desc    Get a specific challenge by ID
// @access  Private (Participants only)
router.get("/:id",
    validateObjectId('id'),                 // Validate challenge ID format
    getChallengeById                        // Handle getting specific challenge
);

/**
 * CHALLENGE RESPONSE ROUTES
 */

// @route   PATCH /api/challenges/:id/accept
// @desc    Accept a challenge
// @access  Private (Challenged fighter only)
// @body    { responseMessage? }
router.patch("/:id/accept",
    validateObjectId('id'),                 // Validate challenge ID format
    validateInput('acceptChallenge'),       // Validate accept challenge data
    acceptChallenge                         // Handle accepting challenge
);

// @route   PATCH /api/challenges/:id/decline
// @desc    Decline a challenge
// @access  Private (Challenged fighter only)
// @body    { responseMessage? }
router.patch("/:id/decline",
    validateObjectId('id'),                 // Validate challenge ID format
    validateInput('declineChallenge'),      // Validate decline challenge data
    declineChallenge                        // Handle declining challenge
);

// @route   DELETE /api/challenges/:id
// @desc    Cancel a challenge
// @access  Private (Challenger only)
// @body    { reason? }
router.delete("/:id",
    validateObjectId('id'),                 // Validate challenge ID format
    validateInput('cancelChallenge'),       // Validate cancellation data
    cancelChallenge                         // Handle cancelling challenge
);

/**
 * CHALLENGE INTERACTION ROUTES
 */

// @route   PATCH /api/challenges/:id/details
// @desc    Update challenge fight details
// @access  Private (Both participants)
// @body    { fightDetails: { proposedDate?, location?, rules?, weightClass?, stakes? } }
router.patch("/:id/details",
    validateObjectId('id'),                 // Validate challenge ID format
    validateInput('updateChallengeDetails'), // Validate fight details update
    updateChallengeDetails                  // Handle updating challenge details
);

// @route   POST /api/challenges/:id/messages
// @desc    Add a message to challenge conversation
// @access  Private (Both participants)
// @body    { message }
router.post("/:id/messages",
    createLimiter,                          // Rate limit message creation to prevent spam
    validateObjectId('id'),                 // Validate challenge ID format
    validateInput('addChallengeMessage'),   // Validate message data
    addMessageToChallenge                   // Handle adding message to challenge
);

/**
 * FUTURE ROUTES
 * These routes are ready for implementation when fight system is built
 */

// @route   PATCH /api/challenges/:id/complete
// @desc    Complete a challenge (when fight is finished)
// @access  Private (Admin or when fight system is implemented)
// @body    { fightId? }
// router.patch("/:id/complete",
//     validateObjectId('id'),              // Validate challenge ID format
//     validateInput('completeChallenge'),  // Validate completion data (future schema)
//     completeChallenge                    // Handle completing challenge
// );

export default router;