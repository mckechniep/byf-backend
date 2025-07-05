// controllers/userController.js - Enhanced with proper validation sync
import User from "../models/userModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { AppError, catchAsync } from "../middleware/errorHandler.js";

dotenv.config();

/**
 * @desc  Sign up a new user (default: fan)
 * @route POST /api/users/signup
 * @access Public
 * 
 * NOTE: req.body is pre-validated by validateInput('signup') middleware
 */
export const signup = catchAsync(async (req, res, next) => {
    const { username, email, password } = req.body;

    // Check if user already exists (validation ensures these fields are present and valid)
    const existingUser = await User.findOne({ 
        $or: [{ username }, { email }] 
    });
    
    if (existingUser) {
        const field = existingUser.username === username ? 'username' : 'email';
        return next(new AppError(
            `A user with this ${field} already exists`,
            409,
            'DUPLICATE_USER'
        ));
    }

    // Hash password with high salt rounds for security
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Create new user
    const newUser = await User.create({ 
        username, 
        email, 
        password: hashedPassword 
    });

    // Don't send password in response
    const userResponse = {
        _id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        isFighter: newUser.isFighter,
        createdAt: newUser.createdAt
    };

    res.status(201).json({ 
        success: true,
        message: "User registered successfully!",
        data: {
            user: userResponse
        }
    });
});

/**
 * @desc  Sign in user
 * @route POST /api/users/signin
 * @access Public
 * 
 * NOTE: req.body is pre-validated by validateInput('signin') middleware
 */
export const signin = catchAsync(async (req, res, next) => {
    const { username, password } = req.body;

    // Find user and include password for comparison
    const user = await User.findOne({ username }).select('+password');
    
    if (!user) {
        return next(new AppError(
            'Invalid username or password',
            401,
            'INVALID_CREDENTIALS'
        ));
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
        return next(new AppError(
            'Invalid username or password',
            401,
            'INVALID_CREDENTIALS'
        ));
    }

    // Generate JWT token
    const token = jwt.sign(
        { 
            id: user._id, 
            role: user.role,
            username: user.username
        }, 
        process.env.JWT_SECRET, 
        { 
            expiresIn: process.env.JWT_EXPIRES_IN || "24h"
        }
    );

    // Remove password from user object
    user.password = undefined;

    res.status(200).json({ 
        success: true,
        message: "Signed in successfully",
        data: {
            token,
            user
        }
    });
});

/**
 * @desc  "Step Into The Cage" - Fan Becomes Fighter
 * @route POST /api/users/become-fighter
 * @access Private
 * 
 * NOTE: No body validation needed, only auth required
 */
export const stepIntoTheCage = catchAsync(async (req, res, next) => {
    const userId = req.user.id;
    
    const user = await User.findById(userId);
    
    if (!user) {
        return next(new AppError(
            'User not found',
            404,
            'USER_NOT_FOUND'
        ));
    }

    if (user.isFighter) {
        return next(new AppError(
            'You are already a fighter!',
            400,
            'ALREADY_FIGHTER'
        ));
    }

    // Update user to fighter status
    user.isFighter = true;
    user.role = "fighter";
    await user.save();

    res.status(200).json({ 
        success: true,
        message: "Welcome to the cage! You are now a fighter.",
        data: {
            user: {
                _id: user._id,
                username: user.username,
                role: user.role,
                isFighter: user.isFighter
            }
        }
    });
});

/**
 * @desc  Get the profile of the logged-in user
 * @route GET /api/users/me
 * @access Private
 */
export const getMyProfile = catchAsync(async (req, res, next) => {
    const userId = req.user.id;

    const user = await User.findById(userId)
        .select("-password")
        .populate('favoriteFighters', 'username profilePicture record')
        .populate('challenges');

    if (!user) {
        return next(new AppError(
            'User not found',
            404,
            'USER_NOT_FOUND'
        ));
    }

    res.status(200).json({
        success: true,
        data: {
            user
        }
    });
});

/**
 * @desc  Update the profile of the logged-in user
 * @route PATCH /api/users/me
 * @access Private
 * 
 * NOTE: req.body is pre-validated by validateInput('updateProfile') middleware
 */
export const updateMyProfile = catchAsync(async (req, res, next) => {
    const userId = req.user.id;
    const updates = req.body; // Already validated and sanitized

    // Check if trying to update username/email that already exists
    if (updates.username || updates.email) {
        const query = {
            _id: { $ne: userId }, // Exclude current user
            $or: []
        };

        if (updates.username) {
            query.$or.push({ username: updates.username });
        }
        if (updates.email) {
            query.$or.push({ email: updates.email });
        }

        const existingUser = await User.findOne(query);

        if (existingUser) {
            const field = existingUser.username === updates.username ? 'username' : 'email';
            return next(new AppError(
                `This ${field} is already taken`,
                409,
                'DUPLICATE_FIELD'
            ));
        }
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
        userId, 
        updates, 
        { 
            new: true, 
            runValidators: true,
            select: "-password" 
        }
    );

    if (!updatedUser) {
        return next(new AppError(
            'User not found',
            404,
            'USER_NOT_FOUND'
        ));
    }

    res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        data: {
            user: updatedUser
        }
    });
});

/**
 * @desc  Update fighter-specific details
 * @route PATCH /api/users/me/fighter
 * @access Private (Fighters only)
 * 
 * NOTE: req.body is pre-validated by validateInput('updateFighterProfile') middleware
 */
export const updateFighterProfile = catchAsync(async (req, res, next) => {
    const userId = req.user.id;
    const updates = req.body; // Already validated and sanitized

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
            'Only fighters can update fighter details',
            403,
            'NOT_FIGHTER'
        ));
    }

    // Update fighter profile
    const updatedFighter = await User.findByIdAndUpdate(
        userId, 
        updates, 
        { 
            new: true, 
            runValidators: true,
            select: "-password" 
        }
    );

    res.status(200).json({
        success: true,
        message: "Fighter profile updated successfully",
        data: {
            user: updatedFighter
        }
    });
});

/**
 * @desc  Get all fighters with optional search filters
 * @route GET /api/users/fighters
 * @access Public
 * 
 * NOTE: req.query is pre-validated by validateInput('fighterQuery', 'query') middleware
 */
export const getAllFighters = catchAsync(async (req, res, next) => {
    // Build query object - validation middleware ensures all values are properly formatted
    let query = { isFighter: true };
    
    // Extract validated query parameters
    const { 
        weight, 
        height, 
        styles, 
        city, 
        state, 
        country,
        page = 1,
        limit = 10,
        sort = '-createdAt'
    } = req.query;

    // Apply filters (validation middleware ensures these are valid numbers/strings)
    if (weight) {
        query.weight = weight;
    }

    if (height) {
        query.height = height;
    }

    if (styles) {
        const stylesArray = styles.split(',').map(s => s.trim());
        query.styles = { $in: stylesArray };
    }

    if (city) {
        query["location.city"] = new RegExp(city, "i");
    }

    if (state) {
        query["location.state"] = new RegExp(state, "i");
    }

    if (country) {
        query["location.country"] = new RegExp(country, "i");
    }

    // Pagination (validation middleware ensures these are valid numbers)
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Execute query with pagination
    const fighters = await User.find(query)
        .select("-password -email")
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .populate('challenges', 'status createdAt');

    // Get total count for pagination
    const total = await User.countDocuments(query);

    res.status(200).json({
        success: true,
        data: {
            fighters,
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
 * FUTURE IMPLEMENTATIONS
 * These functions are ready for when betting and social features are added
 */

/**
 * @desc  Place a bet on a fighter
 * @route POST /api/users/bets
 * @access Private
 * 
 * NOTE: Ready for implementation when betting system is built
 */
// export const placeBet = catchAsync(async (req, res, next) => {
//     const userId = req.user.id;
//     const { fighterId, amount } = req.body; // Pre-validated by validateInput('placeBet')
    
//     // Implementation would go here
// });

/**
 * @desc  Add a comment/review
 * @route POST /api/users/comments
 * @access Private
 */
// export const addComment = catchAsync(async (req, res, next) => {
//     const userId = req.user.id;
//     const { text } = req.body; // Pre-validated by validateInput('addComment')
    
//     // Implementation would go here
// });