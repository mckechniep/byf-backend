// middleware/errorHandler.js

/**
 * WHY WE NEED THIS:
 * - Prevents server crashes from unhandled errors
 * - Provides consistent error response format
 * - Hides sensitive error details in production
 * - Logs errors for debugging while keeping user-friendly messages
 * - Handles different types of errors (validation, database, etc.)
 */

/**
 * Custom error class for application-specific errors
 */
export class AppError extends Error {
    constructor(message, statusCode, code = null) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true; // Mark as expected/operational error
        
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Handle different types of MongoDB/Mongoose errors
 */
const handleMongoError = (error) => {
    if (error.code === 11000) {
        // Duplicate key error
        const field = Object.keys(error.keyValue)[0];
        const value = error.keyValue[field];
        return new AppError(
            `${field.charAt(0).toUpperCase() + field.slice(1)} '${value}' already exists`,
            409,
            'DUPLICATE_ERROR'
        );
    }
    
    if (error.name === 'ValidationError') {
        // Mongoose validation error
        const errors = Object.values(error.errors).map(err => err.message);
        return new AppError(
            `Invalid input data: ${errors.join('. ')}`,
            400,
            'VALIDATION_ERROR'
        );
    }
    
    if (error.name === 'CastError') {
        // Invalid ObjectId
        return new AppError(
            `Invalid ${error.path}: ${error.value}`,
            400,
            'CAST_ERROR'
        );
    }
    
    return error;
};

/**
 * Handle JWT errors
 */
const handleJWTError = (error) => {
    if (error.name === 'JsonWebTokenError') {
        return new AppError('Invalid token. Please log in again.', 401, 'INVALID_TOKEN');
    }
    
    if (error.name === 'TokenExpiredError') {
        return new AppError('Your token has expired. Please log in again.', 401, 'EXPIRED_TOKEN');
    }
    
    return error;
};

/**
 * Send error response in development
 * Includes full error details for debugging
 */
const sendErrorDev = (err, res) => {
    res.status(err.statusCode || 500).json({
        success: false,
        error: {
            message: err.message,
            code: err.code || 'INTERNAL_ERROR',
            stack: err.stack,
            details: err
        },
        timestamp: new Date().toISOString()
    });
};

/**
 * Send error response in production
 * Hides sensitive details from users
 */
const sendErrorProd = (err, res) => {
    // Operational, trusted error: send message to client
    if (err.isOperational) {
        res.status(err.statusCode).json({
            success: false,
            error: {
                message: err.message,
                code: err.code || 'CLIENT_ERROR'
            },
            timestamp: new Date().toISOString()
        });
    } else {
        // Programming or other unknown error: don't leak error details
        console.error('ERROR 💥:', err);
        
        res.status(500).json({
            success: false,
            error: {
                message: 'Something went wrong on our end. Please try again later.',
                code: 'INTERNAL_ERROR'
            },
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Global error handling middleware
 * Must be placed after all other middleware and routes
 */
export const globalErrorHandler = (err, req, res, next) => {
    // Set default values
    err.statusCode = err.statusCode || 500;
    
    // Log the error for debugging
    console.error(`Error ${err.statusCode}: ${err.message}`);
    
    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(err, res);
    } else {
        // Handle specific error types in production
        let error = { ...err };
        error.message = err.message;
        
        // MongoDB errors
        error = handleMongoError(error);
        
        // JWT errors
        error = handleJWTError(error);
        
        sendErrorProd(error, res);
    }
};

/**
 * Catch async errors wrapper
 * Eliminates need for try/catch in every async route handler
 */
export const catchAsync = (fn) => {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
};

/**
 * Handle 404 errors for undefined routes
 */
export const notFoundHandler = (req, res, next) => {
    const error = new AppError(
        `Route ${req.originalUrl} not found on this server`,
        404,
        'ROUTE_NOT_FOUND'
    );
    next(error);
};

export default {
    AppError,
    globalErrorHandler,
    catchAsync,
    notFoundHandler
};