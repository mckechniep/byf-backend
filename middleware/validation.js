import Joi from "joi";

// Enhanced validation schemas that sync with userController.js and userModel.js
const schemas = {
    // User registration validation - matches signup controller expectations
    signup: Joi.object({
        username: Joi.string()
            .alphanum()
            .min(3)
            .max(30)
            .required()
            .messages({
                'string.alphanum': 'Username should only contain alphanumeric characters',
                'string.min': 'Username should have at least 3 characters',
                'string.max': 'Username should have at most 30 characters',
                'any.required': 'Username is required'
            }),
        email: Joi.string()
            .email()
            .required()
            .messages({
                'string.email': 'Invalid email format',
                'any.required': 'Email is required'
            }),
        password: Joi.string()
            .min(6)
            .max(128)
            .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'))
            .required()
            .messages({
                'string.min': 'Password should have at least 6 characters',
                'string.max': 'Password should have at most 128 characters',
                'string.pattern.base': 'Password should contain at least one uppercase letter, one lowercase letter, one digit, and one special character (@$!%*?&)',
                'any.required': 'Password is required'
        })
    }),

    // User login validation - matches signin controller expectations
    signin: Joi.object({
        username: Joi.string()
            .required()
            .messages({
                'any.required': 'Username is required'
            }),
        password: Joi.string()
            .required()
            .messages({
                'any.required': 'Password is required'
            })
    }),

   // General profile update validation - matches updateMyProfile controller
    updateProfile: Joi.object({
        username: Joi.string()
            .alphanum()
            .min(3)
            .max(30)
            .optional()
            .messages({
                'string.alphanum': 'Username should only contain alphanumeric characters',
                'string.min': 'Username should have at least 3 characters',
                'string.max': 'Username should have at most 30 characters'
            }),
        email: Joi.string()
            .email()
            .optional()
            .messages({
                'string.email': 'Invalid email format'
            }),
        socialLinks: Joi.object({
            twitter: Joi.string().uri().allow('').optional(),
            instagram: Joi.string().uri().allow('').optional(),
            youtube: Joi.string().uri().allow('').optional()
        }).optional()
    }),

    // Enhanced fighter profile validation - matches ALL fighter fields in userModel.js
    updateFighterProfile: Joi.object({
        // Physical stats
        weight: Joi.number()
            .min(100)
            .max(400)
            .optional()
            .messages({
                'number.min': 'Weight must be at least 100 lbs',
                'number.max': 'Weight cannot exceed 400 lbs',
                'number.base': 'Weight must be a valid number'
            }),
        height: Joi.number()
            .min(48)
            .max(84)
            .optional()
            .messages({
                'number.min': 'Height must be at least 48 inches',
                'number.max': 'Height cannot exceed 84 inches',
                'number.base': 'Height must be a valid number'
            }),
        age: Joi.number()
            .min(18)
            .max(65)
            .optional()
            .messages({
                'number.min': 'Age must be at least 18',
                'number.max': 'Age cannot exceed 65',
                'number.base': 'Age must be a valid number'
            }),

        // Fighting styles
        styles: Joi.array()
            .items(Joi.string().valid(
                'BJJ', 'Wrestling', 'Judo', 'Jiu-Jitsu', 'Boxing', 
                'Kickboxing', 'Muay Thai', 'Taekwondo', 'Karate', 'Krav Maga', 'Other'
            ))
            .optional()
            .messages({
                'array.includes': 'Invalid fighting style selected'
            }),
        customStyle: Joi.when('styles', {
            is: Joi.array().items(Joi.string().valid('Other')).min(1),
            then: Joi.string().min(2).max(50).required().messages({
                'any.required': 'Custom style is required when "Other" is selected',
                'string.min': 'Custom style must be at least 2 characters',
                'string.max': 'Custom style cannot exceed 50 characters'
            }),
            otherwise: Joi.string().optional()
        }),

        // Location information
        location: Joi.object({
            city: Joi.string().trim().max(100).optional(),
            state: Joi.string().trim().max(100).optional(),
            country: Joi.string().trim().max(100).optional()
        }).optional(),

        // Profile picture URL (for when file upload is implemented)
        profilePicture: Joi.string().uri().optional().messages({
            'string.uri': 'Profile picture must be a valid URL'
        }),

        // Social links (fighter-specific, can be different from general user social links)
        socialLinks: Joi.object({
            twitter: Joi.string().uri().allow('').optional(),
            instagram: Joi.string().uri().allow('').optional(),
            youtube: Joi.string().uri().allow('').optional()
        }).optional()
    }),

    // New validation for fighter query parameters (for getAllFighters)
    fighterQuery: Joi.object({
        weight: Joi.number().min(100).max(400).optional(),
        height: Joi.number().min(48).max(84).optional(),
        styles: Joi.string().optional(), // Comma-separated string
        city: Joi.string().max(100).optional(),
        state: Joi.string().max(100).optional(),
        country: Joi.string().max(100).optional(),
        page: Joi.number().min(1).optional(),
        limit: Joi.number().min(1).max(50).optional(),
        sort: Joi.string().valid('createdAt', '-createdAt', 'username', '-username', 'weight', '-weight').optional()
    }),

    // Validation for placing bets (for future betting system)
    placeBet: Joi.object({
        fighterId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required().messages({
            'string.pattern.base': 'Invalid fighter ID format',
            'any.required': 'Fighter ID is required'
        }),
        amount: Joi.number().min(1).max(10000).required().messages({
            'number.min': 'Bet amount must be at least $1',
            'number.max': 'Bet amount cannot exceed $10,000',
            'any.required': 'Bet amount is required'
        })
    }),

    // Validation for adding comments
    addComment: Joi.object({
        text: Joi.string().min(1).max(500).required().messages({
            'string.min': 'Comment cannot be empty',
            'string.max': 'Comment cannot exceed 500 characters',
            'any.required': 'Comment text is required'
        })
    })
};

/**
 * Validation middleware factory
 * Creates middleware that validates request body against a schema
 */
export const validateInput = (schemaName, source = 'body') => {
    return (req, res, next) => {
        const schema = schemas[schemaName];
        
        if (!schema) {
            return res.status(500).json({ 
                success: false,
                error: {
                    message: "Validation schema not found",
                    code: "SCHEMA_ERROR"
                }
            });
        }

        // Choose validation source (body, query, params)
        let dataToValidate;
        switch (source) {
            case 'query':
                dataToValidate = req.query;
                break;
            case 'params':
                dataToValidate = req.params;
                break;
            default:
                dataToValidate = req.body;
        }

        const { error, value } = schema.validate(dataToValidate, {
            abortEarly: false, // Return all errors, not just the first one
            stripUnknown: true, // Remove unknown fields
            allowUnknown: false // Don't allow extra fields
        });

        if (error) {
            const validationErrors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message,
                value: detail.context?.value
            }));

            return res.status(400).json({
                success: false,
                error: {
                    message: "Validation failed",
                    code: "VALIDATION_ERROR",
                    details: validationErrors
                }
            });
        }

        // Replace the source data with validated and sanitized data
        if (source === 'query') {
            req.query = value;
        } else if (source === 'params') {
            req.params = value;
        } else {
            req.body = value;
        }
        
        next();
    };
};

/**
 * Enhanced input sanitization to prevent XSS attacks
 * Removes potentially dangerous HTML/script tags and normalizes data
 */
export const sanitizeInput = (req, res, next) => {
    const sanitize = (obj) => {
        for (let key in obj) {
            if (typeof obj[key] === 'string') {
                // Remove HTML tags and script content
                obj[key] = obj[key]
                    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                    .replace(/<[^>]*>/g, '')
                    .trim();
                
                // Normalize whitespace
                obj[key] = obj[key].replace(/\s+/g, ' ');
            } else if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                sanitize(obj[key]);
            } else if (Array.isArray(obj[key])) {
                obj[key] = obj[key].map(item => 
                    typeof item === 'string' ? 
                    item.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                        .replace(/<[^>]*>/g, '')
                        .trim() : item
                );
            }
        }
    };

    if (req.body) sanitize(req.body);
    if (req.query) sanitize(req.query);
    if (req.params) sanitize(req.params);
    
    next();
};

/**
 * Middleware to validate MongoDB ObjectId format
 */
export const validateObjectId = (paramName = 'id') => {
    return (req, res, next) => {
        const id = req.params[paramName];
        
        if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
            return res.status(400).json({
                success: false,
                error: {
                    message: `Invalid ${paramName} format`,
                    code: "INVALID_ID"
                }
            });
        }
        
        next();
    };
};

export default { 
    validateInput, 
    sanitizeInput, 
    validateObjectId,
    schemas // Export schemas for testing purposes
};