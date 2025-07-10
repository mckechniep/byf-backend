// controllers/challengeController.js - Challenge system controller
import Challenge from "../models/challengeModel.js";
import User from "../models/userModel.js";
import { AppError, catchAsync } from "../middleware/errorHandler.js";

/**
 * @desc  Create a new challenge (Fighter A challenges Fighter B)
 * @route POST /api/challenges
 * @access Private (Fighters only)
 * 
 * NOTE: req.body is pre-validated by validateInput('createChallenge') middleware
 */
export const createChallenge = catchAsync(async (req, res, next) => {
    const challengerId = req.user.id;
    const { challengedId, fightDetails, message } = req.body;

    // Verify challenger is a fighter
    const challenger = await User.findById(challengerId);
    if (!challenger || !challenger.isFighter) {
        return next(new AppError(
            'Only fighters can create challenges',
            403,
            'NOT_FIGHTER'
        ));
    }

    // Verify challenged user exists and is a fighter
    const challenged = await User.findById(challengedId);
    if (!challenged) {
        return next(new AppError(
            'Challenged fighter not found',
            404,
            'FIGHTER_NOT_FOUND'
        ));
    }

    if (!challenged.isFighter) {
        return next(new AppError(
            'You can only challenge fighters',
            400,
            'TARGET_NOT_FIGHTER'
        ));
    }

    // Prevent self-challenges (also handled in model, but double-check here)
    if (challengerId === challengedId) {
        return next(new AppError(
            'You cannot challenge yourself',
            400,
            'SELF_CHALLENGE'
        ));
    }

    // Check if an active challenge already exists between these fighters
    const existingChallenge = await Challenge.existsBetweenUsers(challengerId, challengedId);
    if (existingChallenge) {
        return next(new AppError(
            'An active challenge already exists between you and this fighter',
            409,
            'CHALLENGE_EXISTS'
        ));
    }

    // Create the challenge
    const challenge = await Challenge.create({
        challenger: challengerId,
        challenged: challengedId,
        fightDetails: fightDetails || {},
        messages: [{
            sender: challengerId,
            message: message,
            isSystemMessage: false
        }]
    });

    // Populate the challenge for response
    await challenge.populate([
        { path: 'challenger', select: 'username profilePicture record location' },
        { path: 'challenged', select: 'username profilePicture record location' },
        { path: 'messages.sender', select: 'username' }
    ]);

    res.status(201).json({
        success: true,
        message: "Challenge sent successfully!",
        data: {
            challenge
        }
    });
});

/**
 * @desc  Accept a challenge
 * @route PATCH /api/challenges/:id/accept
 * @access Private (Challenged fighter only)
 * 
 * NOTE: req.body is pre-validated by validateInput('acceptChallenge') middleware
 */
export const acceptChallenge = catchAsync(async (req, res, next) => {
    const challengeId = req.params.id;
    const userId = req.user.id;
    const { responseMessage } = req.body;

    // Find the challenge
    const challenge = await Challenge.findById(challengeId)
        .populate('challenger', 'username profilePicture record location')
        .populate('challenged', 'username profilePicture record location');

    if (!challenge) {
        return next(new AppError(
            'Challenge not found',
            404,
            'CHALLENGE_NOT_FOUND'
        ));
    }

    // Verify the user is the challenged fighter
    if (challenge.challenged._id.toString() !== userId) {
        return next(new AppError(
            'You can only accept challenges sent to you',
            403,
            'NOT_AUTHORIZED'
        ));
    }

    // Use the model method to accept the challenge
    try {
        await challenge.accept(responseMessage);
        
        // Populate messages after accepting
        await challenge.populate('messages.sender', 'username');

        res.status(200).json({
            success: true,
            message: "Challenge accepted!",
            data: {
                challenge
            }
        });
    } catch (error) {
        return next(new AppError(
            error.message,
            400,
            'CHALLENGE_ACTION_ERROR'
        ));
    }
});

/**
 * @desc  Decline a challenge
 * @route PATCH /api/challenges/:id/decline
 * @access Private (Challenged fighter only)
 * 
 * NOTE: req.body is pre-validated by validateInput('declineChallenge') middleware
 */
export const declineChallenge = catchAsync(async (req, res, next) => {
    const challengeId = req.params.id;
    const userId = req.user.id;
    const { responseMessage } = req.body;

    // Find the challenge
    const challenge = await Challenge.findById(challengeId)
        .populate('challenger', 'username profilePicture record location')
        .populate('challenged', 'username profilePicture record location');

    if (!challenge) {
        return next(new AppError(
            'Challenge not found',
            404,
            'CHALLENGE_NOT_FOUND'
        ));
    }

    // Verify the user is the challenged fighter
    if (challenge.challenged._id.toString() !== userId) {
        return next(new AppError(
            'You can only decline challenges sent to you',
            403,
            'NOT_AUTHORIZED'
        ));
    }

    // Use the model method to decline the challenge
    try {
        await challenge.decline(responseMessage);
        
        // Populate messages after declining
        await challenge.populate('messages.sender', 'username');

        res.status(200).json({
            success: true,
            message: "Challenge declined",
            data: {
                challenge
            }
        });
    } catch (error) {
        return next(new AppError(
            error.message,
            400,
            'CHALLENGE_ACTION_ERROR'
        ));
    }
});

/**
 * @desc  Cancel a challenge
 * @route DELETE /api/challenges/:id
 * @access Private (Challenger only)
 * 
 * NOTE: req.body is pre-validated by validateInput('cancelChallenge') middleware
 */
export const cancelChallenge = catchAsync(async (req, res, next) => {
    const challengeId = req.params.id;
    const userId = req.user.id;
    const { reason } = req.body;

    // Find the challenge
    const challenge = await Challenge.findById(challengeId)
        .populate('challenger', 'username profilePicture record location')
        .populate('challenged', 'username profilePicture record location');

    if (!challenge) {
        return next(new AppError(
            'Challenge not found',
            404,
            'CHALLENGE_NOT_FOUND'
        ));
    }

    // Verify the user is the challenger
    if (challenge.challenger._id.toString() !== userId) {
        return next(new AppError(
            'You can only cancel challenges you created',
            403,
            'NOT_AUTHORIZED'
        ));
    }

    // Use the model method to cancel the challenge
    try {
        await challenge.cancel(reason);
        
        // Populate messages after cancelling
        await challenge.populate('messages.sender', 'username');

        res.status(200).json({
            success: true,
            message: "Challenge cancelled",
            data: {
                challenge
            }
        });
    } catch (error) {
        return next(new AppError(
            error.message,
            400,
            'CHALLENGE_ACTION_ERROR'
        ));
    }
});

/**
 * @desc  Update challenge fight details
 * @route PATCH /api/challenges/:id/details
 * @access Private (Both participants)
 * 
 * NOTE: req.body is pre-validated by validateInput('updateChallengeDetails') middleware
 */
export const updateChallengeDetails = catchAsync(async (req, res, next) => {
    const challengeId = req.params.id;
    const userId = req.user.id;
    const { fightDetails } = req.body;

    // Find the challenge
    const challenge = await Challenge.findById(challengeId)
        .populate('challenger', 'username profilePicture record location')
        .populate('challenged', 'username profilePicture record location');

    if (!challenge) {
        return next(new AppError(
            'Challenge not found',
            404,
            'CHALLENGE_NOT_FOUND'
        ));
    }

    // Verify the user is a participant
    const isParticipant = challenge.challenger._id.toString() === userId || 
                         challenge.challenged._id.toString() === userId;
    
    if (!isParticipant) {
        return next(new AppError(
            'You can only update challenges you are part of',
            403,
            'NOT_AUTHORIZED'
        ));
    }

    // Can only update details for pending or accepted challenges
    if (!['pending', 'accepted'].includes(challenge.status)) {
        return next(new AppError(
            'Challenge details can only be updated for pending or accepted challenges',
            400,
            'INVALID_STATUS'
        ));
    }

    // Update the fight details
    challenge.fightDetails = { ...challenge.fightDetails, ...fightDetails };
    
    // Add a system message about the update
    const updaterName = challenge.challenger._id.toString() === userId ? 
                       challenge.challenger.username : challenge.challenged.username;
    
    challenge.messages.push({
        sender: userId,
        message: `${updaterName} updated the fight details`,
        isSystemMessage: true
    });

    await challenge.save();
    
    // Populate messages after updating
    await challenge.populate('messages.sender', 'username');

    res.status(200).json({
        success: true,
        message: "Challenge details updated successfully",
        data: {
            challenge
        }
    });
});

/**
 * @desc  Add a message to a challenge conversation
 * @route POST /api/challenges/:id/messages
 * @access Private (Both participants)
 * 
 * NOTE: req.body is pre-validated by validateInput('addChallengeMessage') middleware
 */
export const addMessageToChallenge = catchAsync(async (req, res, next) => {
    const challengeId = req.params.id;
    const userId = req.user.id;
    const { message } = req.body;

    // Find the challenge
    const challenge = await Challenge.findById(challengeId)
        .populate('challenger', 'username profilePicture record location')
        .populate('challenged', 'username profilePicture record location');

    if (!challenge) {
        return next(new AppError(
            'Challenge not found',
            404,
            'CHALLENGE_NOT_FOUND'
        ));
    }

    // Verify the user is a participant
    const isParticipant = challenge.challenger._id.toString() === userId || 
                         challenge.challenged._id.toString() === userId;
    
    if (!isParticipant) {
        return next(new AppError(
            'You can only send messages in challenges you are part of',
            403,
            'NOT_AUTHORIZED'
        ));
    }

    // Can only add messages to active challenges
    if (!['pending', 'accepted'].includes(challenge.status)) {
        return next(new AppError(
            'Messages can only be sent in pending or accepted challenges',
            400,
            'INVALID_STATUS'
        ));
    }

    // Use the model method to add the message
    await challenge.addMessage(userId, message);
    
    // Populate messages after adding
    await challenge.populate('messages.sender', 'username');

    res.status(201).json({
        success: true,
        message: "Message sent successfully",
        data: {
            challenge
        }
    });
});

/**
 * @desc  Get all challenges for the current user
 * @route GET /api/challenges/my
 * @access Private
 * 
 * NOTE: req.query is pre-validated by validateInput('challengeQuery', 'query') middleware
 */
export const getMyChallenges = catchAsync(async (req, res, next) => {
    const userId = req.user.id;
    const { status, role, page, limit, sort } = req.query;

    let query = {};

    // Build query based on role filter
    if (role === 'challenger') {
        query.challenger = userId;
    } else if (role === 'challenged') {
        query.challenged = userId;
    } else {
        // Default: get all challenges where user is either challenger or challenged
        query.$or = [
            { challenger: userId },
            { challenged: userId }
        ];
    }

    // Add status filter if provided
    if (status) {
        query.status = status;
    }

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Execute query with pagination
    const challenges = await Challenge.find(query)
        .populate('challenger', 'username profilePicture record location')
        .populate('challenged', 'username profilePicture record location')
        .populate('messages.sender', 'username')
        .sort(sort)
        .skip(skip)
        .limit(limitNum);

    // Get total count for pagination
    const total = await Challenge.countDocuments(query);

    res.status(200).json({
        success: true,
        data: {
            challenges,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum),
                hasNext: pageNum < Math.ceil(total / limitNum),
                hasPrev: pageNum > 1
            }
        }
    });
});

/**
 * @desc  Get pending challenges that need user's response
 * @route GET /api/challenges/pending
 * @access Private
 */
export const getPendingChallenges = catchAsync(async (req, res, next) => {
    const userId = req.user.id;

    // Get challenges where current user is challenged and status is pending
    const pendingChallenges = await Challenge.getPendingChallengesForUser(userId);

    res.status(200).json({
        success: true,
        data: {
            challenges: pendingChallenges,
            count: pendingChallenges.length
        }
    });
});

/**
 * @desc  Get a specific challenge by ID
 * @route GET /api/challenges/:id
 * @access Private (Participants only)
 */
export const getChallengeById = catchAsync(async (req, res, next) => {
    const challengeId = req.params.id;
    const userId = req.user.id;

    // Find the challenge with full population
    const challenge = await Challenge.findById(challengeId)
        .populate('challenger', 'username profilePicture record location')
        .populate('challenged', 'username profilePicture record location')
        .populate('messages.sender', 'username');

    if (!challenge) {
        return next(new AppError(
            'Challenge not found',
            404,
            'CHALLENGE_NOT_FOUND'
        ));
    }

    // Verify the user is a participant
    const isParticipant = challenge.challenger._id.toString() === userId || 
                         challenge.challenged._id.toString() === userId;
    
    if (!isParticipant) {
        return next(new AppError(
            'You can only view challenges you are part of',
            403,
            'NOT_AUTHORIZED'
        ));
    }

    res.status(200).json({
        success: true,
        data: {
            challenge
        }
    });
});

/**
 * FUTURE IMPLEMENTATIONS
 * These functions are ready for when fight completion is implemented
 */

/**
 * @desc  Complete a challenge (when fight is finished)
 * @route PATCH /api/challenges/:id/complete
 * @access Private (Admin or when fight system is implemented)
 */
// export const completeChallenge = catchAsync(async (req, res, next) => {
//     const challengeId = req.params.id;
//     const { fightId } = req.body;
    
//     const challenge = await Challenge.findById(challengeId);
//     if (!challenge) {
//         return next(new AppError('Challenge not found', 404, 'CHALLENGE_NOT_FOUND'));
//     }
    
//     await challenge.complete(fightId);
//     await challenge.populate([
//         { path: 'challenger', select: 'username profilePicture record location' },
//         { path: 'challenged', select: 'username profilePicture record location' },
//         { path: 'messages.sender', select: 'username' }
//     ]);
    
//     res.status(200).json({
//         success: true,
//         message: "Challenge marked as completed",
//         data: { challenge }
//     });
// });