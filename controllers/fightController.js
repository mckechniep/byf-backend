// controllers/fightController.js - Fight system controller
import Fight from "../models/fightModel.js";
import Challenge from "../models/challengeModel.js";
import User from "../models/userModel.js";
import { AppError, catchAsync } from "../middleware/errorHandler.js";

/**
 * @desc  Create a fight from an accepted challenge
 * @route POST /api/fights/from-challenge
 * @access Private (Both participants or admin)
 * 
 * NOTE: req.body is pre-validated by validateInput('createFightFromChallenge') middleware
 */
export const createFightFromChallenge = catchAsync(async (req, res, next) => {
    const userId = req.user.id;
    const { challengeId, fightDetails } = req.body;

    // Verify challenge exists and is accepted
    const challenge = await Challenge.findById(challengeId)
        .populate('challenger', 'username')
        .populate('challenged', 'username');

    if (!challenge) {
        return next(new AppError(
            'Challenge not found',
            404,
            'CHALLENGE_NOT_FOUND'
        ));
    }

    if (challenge.status !== 'accepted') {
        return next(new AppError(
            'Fight can only be created from accepted challenges',
            400,
            'CHALLENGE_NOT_ACCEPTED'
        ));
    }

    // Verify user is a participant
    const isParticipant = challenge.challenger._id.toString() === userId || 
                         challenge.challenged._id.toString() === userId;
    
    if (!isParticipant && req.user.role !== 'admin') {
        return next(new AppError(
            'Only challenge participants can create a fight',
            403,
            'NOT_AUTHORIZED'
        ));
    }

    // Check if fight already exists for this challenge
    const existingFight = await Fight.findOne({ fromChallenge: challengeId });
    if (existingFight) {
        return next(new AppError(
            'A fight has already been created for this challenge',
            409,
            'FIGHT_EXISTS'
        ));
    }

    try {
        // Create fight using the static method
        const fight = await Fight.createFromChallenge(challengeId);
        
        // Apply any additional fight details from request
        if (fightDetails) {
            if (fightDetails.scheduledDate) {
                fight.details.scheduledDate = fightDetails.scheduledDate;
            }
            if (fightDetails.venue) {
                fight.details.venue = { ...fight.details.venue, ...fightDetails.venue };
            }
            if (fightDetails.rules) {
                fight.details.rules = { ...fight.details.rules, ...fightDetails.rules };
            }
            await fight.save();
        }

        // Populate for response
        await fight.populate([
            { path: 'fighters.user', select: 'username profilePicture record location' },
            { path: 'fromChallenge' }
        ]);

        res.status(201).json({
            success: true,
            message: "Fight created successfully!",
            data: {
                fight
            }
        });
    } catch (error) {
        return next(new AppError(
            error.message,
            400,
            'FIGHT_CREATION_ERROR'
        ));
    }
});

/**
 * @desc  Update fight details (before fight happens)
 * @route PATCH /api/fights/:id/details
 * @access Private (Both participants or admin)
 * 
 * NOTE: req.body is pre-validated by validateInput('updateFightDetails') middleware
 */
export const updateFightDetails = catchAsync(async (req, res, next) => {
    const fightId = req.params.id;
    const userId = req.user.id;
    const { details } = req.body;

    // Find the fight
    const fight = await Fight.findById(fightId)
        .populate('fighters.user', 'username');

    if (!fight) {
        return next(new AppError(
            'Fight not found',
            404,
            'FIGHT_NOT_FOUND'
        ));
    }

    // Check if fight can be edited
    if (!fight.canEdit) {
        return next(new AppError(
            `Cannot edit ${fight.status} fights`,
            400,
            'FIGHT_NOT_EDITABLE'
        ));
    }

    // Verify user is a participant or admin
    const isParticipant = fight.participantIds.some(id => id.toString() === userId);
    
    if (!isParticipant && req.user.role !== 'admin') {
        return next(new AppError(
            'Only fight participants can update fight details',
            403,
            'NOT_AUTHORIZED'
        ));
    }

    // Update fight details
    if (details.scheduledDate) {
        fight.details.scheduledDate = details.scheduledDate;
    }
    if (details.venue) {
        fight.details.venue = { ...fight.details.venue, ...details.venue };
    }
    if (details.weightClass) {
        fight.details.weightClass = details.weightClass;
    }
    if (details.rules) {
        fight.details.rules = { ...fight.details.rules, ...details.rules };
    }

    await fight.save();

    // Populate for response
    await fight.populate([
        { path: 'fighters.user', select: 'username profilePicture record location' },
        { path: 'fromChallenge' }
    ]);

    res.status(200).json({
        success: true,
        message: "Fight details updated successfully",
        data: {
            fight
        }
    });
});

/**
 * @desc  Start a fight (change status to in-progress)
 * @route PATCH /api/fights/:id/start
 * @access Private (Admin or referee)
 * 
 * NOTE: No body validation needed
 */
export const startFight = catchAsync(async (req, res, next) => {
    const fightId = req.params.id;

    // Find the fight
    const fight = await Fight.findById(fightId);

    if (!fight) {
        return next(new AppError(
            'Fight not found',
            404,
            'FIGHT_NOT_FOUND'
        ));
    }

    try {
        await fight.start();
        
        // Populate for response
        await fight.populate([
            { path: 'fighters.user', select: 'username profilePicture record location' },
            { path: 'fromChallenge' }
        ]);

        res.status(200).json({
            success: true,
            message: "Fight started!",
            data: {
                fight
            }
        });
    } catch (error) {
        return next(new AppError(
            error.message,
            400,
            'FIGHT_ACTION_ERROR'
        ));
    }
});

/**
 * @desc  Record fight result
 * @route PATCH /api/fights/:id/result
 * @access Private (Admin or participants after fight)
 * 
 * NOTE: req.body is pre-validated by validateInput('recordFightResult') middleware
 */
export const recordFightResult = catchAsync(async (req, res, next) => {
    const fightId = req.params.id;
    const userId = req.user.id;
    const { winnerId, method, details } = req.body;

    // Find the fight
    const fight = await Fight.findById(fightId);

    if (!fight) {
        return next(new AppError(
            'Fight not found',
            404,
            'FIGHT_NOT_FOUND'
        ));
    }

    // For now, allow participants to record results (in production, might want admin only)
    const isParticipant = fight.participantIds.some(id => id.toString() === userId);
    
    if (!isParticipant && req.user.role !== 'admin') {
        return next(new AppError(
            'Only fight participants or admins can record results',
            403,
            'NOT_AUTHORIZED'
        ));
    }

    try {
        await fight.recordResult(winnerId, method, details);
        
        // Populate for response
        await fight.populate([
            { path: 'fighters.user', select: 'username profilePicture record location' },
            { path: 'outcome.winner', select: 'username' },
            { path: 'fromChallenge' }
        ]);

        // TODO: Trigger bet resolution here when betting system is implemented

        res.status(200).json({
            success: true,
            message: "Fight result recorded successfully",
            data: {
                fight
            }
        });
    } catch (error) {
        return next(new AppError(
            error.message,
            400,
            'RESULT_RECORDING_ERROR'
        ));
    }
});

/**
 * @desc  Cancel a fight
 * @route PATCH /api/fights/:id/cancel
 * @access Private (Admin or both participants)
 * 
 * NOTE: req.body is pre-validated by validateInput('cancelFight') middleware
 */
export const cancelFight = catchAsync(async (req, res, next) => {
    const fightId = req.params.id;
    const userId = req.user.id;
    const { reason } = req.body;

    // Find the fight
    const fight = await Fight.findById(fightId);

    if (!fight) {
        return next(new AppError(
            'Fight not found',
            404,
            'FIGHT_NOT_FOUND'
        ));
    }

    // Check authorization
    const isParticipant = fight.participantIds.some(id => id.toString() === userId);
    
    if (!isParticipant && req.user.role !== 'admin') {
        return next(new AppError(
            'Only fight participants or admins can cancel fights',
            403,
            'NOT_AUTHORIZED'
        ));
    }

    try {
        await fight.cancel(reason);
        
        // Populate for response
        await fight.populate([
            { path: 'fighters.user', select: 'username profilePicture record location' },
            { path: 'fromChallenge' }
        ]);

        res.status(200).json({
            success: true,
            message: "Fight cancelled",
            data: {
                fight
            }
        });
    } catch (error) {
        return next(new AppError(
            error.message,
            400,
            'CANCELLATION_ERROR'
        ));
    }
});

/**
 * @desc  Postpone a fight
 * @route PATCH /api/fights/:id/postpone
 * @access Private (Admin or both participants)
 * 
 * NOTE: req.body is pre-validated by validateInput('postponeFight') middleware
 */
export const postponeFight = catchAsync(async (req, res, next) => {
    const fightId = req.params.id;
    const userId = req.user.id;
    const { newDate, reason } = req.body;

    // Find the fight
    const fight = await Fight.findById(fightId);

    if (!fight) {
        return next(new AppError(
            'Fight not found',
            404,
            'FIGHT_NOT_FOUND'
        ));
    }

    // Check authorization
    const isParticipant = fight.participantIds.some(id => id.toString() === userId);
    
    if (!isParticipant && req.user.role !== 'admin') {
        return next(new AppError(
            'Only fight participants or admins can postpone fights',
            403,
            'NOT_AUTHORIZED'
        ));
    }

    try {
        await fight.postpone(newDate, reason);
        
        // Populate for response
        await fight.populate([
            { path: 'fighters.user', select: 'username profilePicture record location' },
            { path: 'fromChallenge' }
        ]);

        res.status(200).json({
            success: true,
            message: "Fight postponed",
            data: {
                fight
            }
        });
    } catch (error) {
        return next(new AppError(
            error.message,
            400,
            'POSTPONE_ERROR'
        ));
    }
});

/**
 * @desc  Add fight statistics
 * @route PATCH /api/fights/:id/stats
 * @access Private (Admin only)
 * 
 * NOTE: req.body is pre-validated by validateInput('addFightStats') middleware
 */
export const addFightStats = catchAsync(async (req, res, next) => {
    const fightId = req.params.id;
    const { stats } = req.body;

    // Find the fight
    const fight = await Fight.findById(fightId);

    if (!fight) {
        return next(new AppError(
            'Fight not found',
            404,
            'FIGHT_NOT_FOUND'
        ));
    }

    if (fight.status !== 'completed') {
        return next(new AppError(
            'Can only add stats to completed fights',
            400,
            'FIGHT_NOT_COMPLETED'
        ));
    }

    try {
        await fight.addStats(stats);
        
        // Populate for response
        await fight.populate([
            { path: 'fighters.user', select: 'username profilePicture record location' },
            { path: 'outcome.stats.fighter', select: 'username' }
        ]);

        res.status(200).json({
            success: true,
            message: "Fight statistics added",
            data: {
                fight
            }
        });
    } catch (error) {
        return next(new AppError(
            error.message,
            400,
            'STATS_ERROR'
        ));
    }
});

/**
 * @desc  Get a specific fight by ID
 * @route GET /api/fights/:id
 * @access Public (with visibility restrictions)
 */
export const getFightById = catchAsync(async (req, res, next) => {
    const fightId = req.params.id;
    const userId = req.user?.id;

    // Find the fight with full population
    const fight = await Fight.findById(fightId)
        .populate('fighters.user', 'username profilePicture record location')
        .populate('outcome.winner', 'username')
        .populate('fromChallenge')
        .populate('verification.verifiedBy', 'username');

    if (!fight) {
        return next(new AppError(
            'Fight not found',
            404,
            'FIGHT_NOT_FOUND'
        ));
    }

    // Check visibility permissions
    if (fight.visibility === 'private') {
        const isParticipant = userId && fight.participantIds.some(id => id.toString() === userId);
        if (!isParticipant) {
            return next(new AppError(
                'This fight is private',
                403,
                'PRIVATE_FIGHT'
            ));
        }
    }

    res.status(200).json({
        success: true,
        data: {
            fight
        }
    });
});

/**
 * @desc  Get user's fight history
 * @route GET /api/fights/user/:userId
 * @access Public
 * 
 * NOTE: req.query is pre-validated by validateInput('fightQuery', 'query') middleware
 */
export const getUserFights = catchAsync(async (req, res, next) => {
    const userId = req.params.userId;
    const { status, page, limit, sort } = req.query;

    // Verify user exists and is a fighter
    const user = await User.findById(userId);
    if (!user) {
        return next(new AppError(
            'User not found',
            404,
            'USER_NOT_FOUND'
        ));
    }

    if (!user.isFighter) {
        return next(new AppError(
            'User is not a fighter',
            400,
            'NOT_FIGHTER'
        ));
    }

    // Build query
    const query = { 'fighters.user': userId };
    if (status) {
        query.status = status;
    }

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Execute query
    const fights = await Fight.find(query)
        .populate('fighters.user', 'username profilePicture record location')
        .populate('outcome.winner', 'username')
        .sort(sort)
        .skip(skip)
        .limit(limitNum);

    // Get total count
    const total = await Fight.countDocuments(query);

    res.status(200).json({
        success: true,
        data: {
            fights,
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
 * @desc  Get upcoming fights
 * @route GET /api/fights/upcoming
 * @access Public
 * 
 * NOTE: req.query is pre-validated by validateInput('upcomingFightsQuery', 'query') middleware
 */
export const getUpcomingFights = catchAsync(async (req, res, next) => {
    const { limit } = req.query;

    const fights = await Fight.getUpcomingFights(limit);

    res.status(200).json({
        success: true,
        data: {
            fights,
            count: fights.length
        }
    });
});

/**
 * @desc  Get recent fight results
 * @route GET /api/fights/recent-results
 * @access Public
 * 
 * NOTE: req.query is pre-validated by validateInput('recentResultsQuery', 'query') middleware
 */
export const getRecentResults = catchAsync(async (req, res, next) => {
    const { limit } = req.query;

    const fights = await Fight.getRecentResults(limit);

    res.status(200).json({
        success: true,
        data: {
            fights,
            count: fights.length
        }
    });
});

/**
 * @desc  Verify fight result (admin function)
 * @route PATCH /api/fights/:id/verify
 * @access Private (Admin only)
 * 
 * NOTE: req.body is pre-validated by validateInput('verifyFight') middleware
 */
export const verifyFight = catchAsync(async (req, res, next) => {
    const fightId = req.params.id;
    const verifierId = req.user.id;
    const { notes } = req.body;

    // Find the fight
    const fight = await Fight.findById(fightId);

    if (!fight) {
        return next(new AppError(
            'Fight not found',
            404,
            'FIGHT_NOT_FOUND'
        ));
    }

    if (fight.status !== 'completed') {
        return next(new AppError(
            'Can only verify completed fights',
            400,
            'FIGHT_NOT_COMPLETED'
        ));
    }

    try {
        await fight.verify(verifierId, notes);
        
        // Populate for response
        await fight.populate([
            { path: 'fighters.user', select: 'username profilePicture record location' },
            { path: 'outcome.winner', select: 'username' },
            { path: 'verification.verifiedBy', select: 'username' }
        ]);

        res.status(200).json({
            success: true,
            message: "Fight verified successfully",
            data: {
                fight
            }
        });
    } catch (error) {
        return next(new AppError(
            error.message,
            400,
            'VERIFICATION_ERROR'
        ));
    }
});

/**
 * FUTURE IMPLEMENTATIONS
 * These are ready for when additional features are needed
 */

/**
 * @desc  Get fights by weight class
 * @route GET /api/fights/weight-class/:weightClass
 * @access Public
 */
// export const getFightsByWeightClass = catchAsync(async (req, res, next) => {
//     const { weightClass } = req.params;
//     const { page, limit, sort } = req.query;
//     
//     // Implementation would go here
// });

/**
 * @desc  Search fights
 * @route GET /api/fights/search
 * @access Public
 */
// export const searchFights = catchAsync(async (req, res, next) => {
//     const { query, filters } = req.query;
//     
//     // Implementation would go here
// });