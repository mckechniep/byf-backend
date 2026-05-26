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
    }),

    // ==================== CHALLENGE VALIDATION SCHEMAS ====================

    // Create new challenge validation
    createChallenge: Joi.object({
        challengedId: Joi.string()
            .pattern(/^[0-9a-fA-F]{24}$/)
            .required()
            .messages({
                'string.pattern.base': 'Invalid fighter ID format',
                'any.required': 'Challenged fighter ID is required'
            }),
        
        // Fight details (all optional for initial challenge)
        fightDetails: Joi.object({
            proposedDate: Joi.date()
                .min('now')
                .optional()
                .messages({
                    'date.min': 'Proposed date must be in the future'
                }),
            location: Joi.string()
                .trim()
                .max(200)
                .optional()
                .messages({
                    'string.max': 'Location cannot exceed 200 characters'
                }),
            rules: Joi.string()
                .trim()
                .max(1000)
                .optional()
                .messages({
                    'string.max': 'Rules cannot exceed 1000 characters'
                }),
            weightClass: Joi.string()
                .valid(
                    'Flyweight', 'Bantamweight', 'Featherweight', 'Lightweight',
                    'Welterweight', 'Middleweight', 'Light Heavyweight', 'Heavyweight',
                    'Catchweight', 'Open Weight'
                )
                .optional()
                .messages({
                    'any.only': 'Invalid weight class selected'
                }),
            stakes: Joi.string()
                .trim()
                .max(500)
                .optional()
                .messages({
                    'string.max': 'Stakes description cannot exceed 500 characters'
                })
        }).optional(),

        // Initial challenge message
        message: Joi.string()
            .trim()
            .min(10)
            .max(1000)
            .required()
            .messages({
                'string.min': 'Challenge message must be at least 10 characters',
                'string.max': 'Challenge message cannot exceed 1000 characters',
                'any.required': 'Challenge message is required'
            })
    }),

    // Accept challenge validation
    acceptChallenge: Joi.object({
        responseMessage: Joi.string()
            .trim()
            .max(500)
            .optional()
            .messages({
                'string.max': 'Response message cannot exceed 500 characters'
            })
    }),

    // Decline challenge validation
    declineChallenge: Joi.object({
        responseMessage: Joi.string()
            .trim()
            .min(5)
            .max(500)
            .optional()
            .messages({
                'string.min': 'Please provide a reason for declining (at least 5 characters)',
                'string.max': 'Response message cannot exceed 500 characters'
            })
    }),

    // Cancel challenge validation
    cancelChallenge: Joi.object({
        reason: Joi.string()
            .trim()
            .max(500)
            .optional()
            .messages({
                'string.max': 'Cancellation reason cannot exceed 500 characters'
            })
    }),

    // Update challenge details validation
    updateChallengeDetails: Joi.object({
        fightDetails: Joi.object({
            proposedDate: Joi.date()
                .min('now')
                .optional()
                .messages({
                    'date.min': 'Proposed date must be in the future'
                }),
            location: Joi.string()
                .trim()
                .max(200)
                .optional()
                .messages({
                    'string.max': 'Location cannot exceed 200 characters'
                }),
            rules: Joi.string()
                .trim()
                .max(1000)
                .optional()
                .messages({
                    'string.max': 'Rules cannot exceed 1000 characters'
                }),
            weightClass: Joi.string()
                .valid(
                    'Flyweight', 'Bantamweight', 'Featherweight', 'Lightweight',
                    'Welterweight', 'Middleweight', 'Light Heavyweight', 'Heavyweight',
                    'Catchweight', 'Open Weight'
                )
                .optional()
                .messages({
                    'any.only': 'Invalid weight class selected'
                }),
            stakes: Joi.string()
                .trim()
                .max(500)
                .optional()
                .messages({
                    'string.max': 'Stakes description cannot exceed 500 characters'
                })
        }).min(1).required().messages({
            'object.min': 'At least one fight detail must be provided',
            'any.required': 'Fight details are required'
        })
    }),

    // Add message to challenge validation
    addChallengeMessage: Joi.object({
        message: Joi.string()
            .trim()
            .min(1)
            .max(1000)
            .required()
            .messages({
                'string.min': 'Message cannot be empty',
                'string.max': 'Message cannot exceed 1000 characters',
                'any.required': 'Message is required'
            })
    }),

    // Query validation for getting challenges
    challengeQuery: Joi.object({
        status: Joi.string()
            .valid('pending', 'accepted', 'declined', 'completed', 'cancelled')
            .optional()
            .messages({
                'any.only': 'Invalid status filter'
            }),
        role: Joi.string()
            .valid('challenger', 'challenged', 'all')
            .default('all')
            .optional()
            .messages({
                'any.only': 'Role must be challenger, challenged, or all'
            }),
        page: Joi.number().min(1).default(1).optional(),
        limit: Joi.number().min(1).max(50).default(10).optional(),
        sort: Joi.string()
            .valid('createdAt', '-createdAt', 'updatedAt', '-updatedAt', 'status')
            .default('-updatedAt')
            .optional()
    }),

    // ==================== FIGHT VALIDATION SCHEMAS ====================

    // Create fight from accepted challenge
    createFightFromChallenge: Joi.object({
        challengeId: Joi.string()
            .pattern(/^[0-9a-fA-F]{24}$/)
            .required()
            .messages({
                'string.pattern.base': 'Invalid challenge ID format',
                'any.required': 'Challenge ID is required'
            }),
        fightDetails: Joi.object({
            scheduledDate: Joi.date()
                .min('now')
                .optional()
                .messages({
                    'date.min': 'Scheduled date must be in the future'
                }),
            venue: Joi.object({
                name: Joi.string().trim().max(200).optional(),
                address: Joi.string().trim().max(300).optional(),
                city: Joi.string().trim().max(100).optional(),
                state: Joi.string().trim().max(100).optional(),
                country: Joi.string().trim().max(100).optional()
            }).optional(),
            rules: Joi.object({
                rounds: Joi.number().min(1).max(12).optional(),
                roundDuration: Joi.number().min(60).max(1800).optional(),
                format: Joi.string().valid('MMA', 'Boxing', 'Kickboxing', 'Grappling', 'Custom').optional(),
                customRules: Joi.string().trim().max(1000).optional()
            }).optional()
        }).optional()
    }),

    // Update fight details
    updateFightDetails: Joi.object({
        details: Joi.object({
            scheduledDate: Joi.date()
                .min('now')
                .optional()
                .messages({
                    'date.min': 'Scheduled date must be in the future'
                }),
            venue: Joi.object({
                name: Joi.string().trim().max(200).optional(),
                address: Joi.string().trim().max(300).optional(),
                city: Joi.string().trim().max(100).optional(),
                state: Joi.string().trim().max(100).optional(),
                country: Joi.string().trim().max(100).optional()
            }).optional(),
            weightClass: Joi.string()
                .valid(
                    'Flyweight', 'Bantamweight', 'Featherweight', 'Lightweight',
                    'Welterweight', 'Middleweight', 'Light Heavyweight', 'Heavyweight',
                    'Catchweight', 'Open Weight'
                )
                .optional(),
            rules: Joi.object({
                rounds: Joi.number().min(1).max(12).optional(),
                roundDuration: Joi.number().min(60).max(1800).optional(),
                format: Joi.string().valid('MMA', 'Boxing', 'Kickboxing', 'Grappling', 'Custom').optional(),
                customRules: Joi.string().trim().max(1000).optional()
            }).optional()
        }).min(1).required().messages({
            'object.min': 'At least one detail must be provided',
            'any.required': 'Fight details are required'
        })
    }),

    // Record fight result
    recordFightResult: Joi.object({
        winnerId: Joi.string()
            .pattern(/^[0-9a-fA-F]{24}$/)
            .when('method', {
                is: Joi.valid('No Contest', 'Draw'),
                then: Joi.optional(),
                otherwise: Joi.required()
            })
            .messages({
                'string.pattern.base': 'Invalid winner ID format',
                'any.required': 'Winner ID is required for this outcome'
            }),
        method: Joi.string()
            .valid('KO', 'TKO', 'Submission', 'Decision', 'DQ', 'No Contest', 'Draw')
            .required()
            .messages({
                'any.only': 'Invalid fight outcome method',
                'any.required': 'Fight outcome method is required'
            }),
        details: Joi.object({
            methodDetails: Joi.string().trim().max(500).optional(),
            round: Joi.number().min(1).max(12).optional(),
            time: Joi.string().pattern(/^[0-9]{1,2}:[0-9]{2}$/).optional().messages({
                'string.pattern.base': 'Time must be in format MM:SS'
            })
        }).optional()
    }),

    // Cancel fight
    cancelFight: Joi.object({
        reason: Joi.string()
            .trim()
            .max(500)
            .optional()
            .messages({
                'string.max': 'Cancellation reason cannot exceed 500 characters'
            })
    }),

    // Postpone fight
    postponeFight: Joi.object({
        newDate: Joi.date()
            .min('now')
            .required()
            .messages({
                'date.min': 'New date must be in the future',
                'any.required': 'New date is required'
            }),
        reason: Joi.string()
            .trim()
            .max(500)
            .optional()
            .messages({
                'string.max': 'Postponement reason cannot exceed 500 characters'
            })
    }),

    // Add fight statistics
    addFightStats: Joi.object({
        stats: Joi.array()
            .items(Joi.object({
                fighter: Joi.string()
                    .pattern(/^[0-9a-fA-F]{24}$/)
                    .required()
                    .messages({
                        'string.pattern.base': 'Invalid fighter ID format',
                        'any.required': 'Fighter ID is required'
                    }),
                strikes: Joi.object({
                    landed: Joi.number().min(0).default(0),
                    thrown: Joi.number().min(0).default(0)
                }).optional(),
                takedowns: Joi.object({
                    successful: Joi.number().min(0).default(0),
                    attempted: Joi.number().min(0).default(0)
                }).optional(),
                submissions: Joi.object({
                    attempted: Joi.number().min(0).default(0)
                }).optional(),
                controlTime: Joi.number().min(0).default(0)
            }))
            .min(1)
            .max(2)
            .required()
            .messages({
                'array.min': 'At least one fighter stat is required',
                'array.max': 'Maximum 2 fighter stats allowed',
                'any.required': 'Fight statistics are required'
            })
    }),

    // Verify fight result
    verifyFight: Joi.object({
        notes: Joi.string()
            .trim()
            .max(1000)
            .optional()
            .messages({
                'string.max': 'Verification notes cannot exceed 1000 characters'
            })
    }),

    // Fight query parameters
    fightQuery: Joi.object({
        status: Joi.string()
            .valid('scheduled', 'in-progress', 'completed', 'cancelled', 'postponed')
            .optional(),
        page: Joi.number().min(1).default(1).optional(),
        limit: Joi.number().min(1).max(50).default(10).optional(),
        sort: Joi.string()
            .valid('createdAt', '-createdAt', 'scheduledDate', '-scheduledDate', 'actualDate', '-actualDate')
            .default('-createdAt')
            .optional()
    }),

    // Upcoming fights query
    upcomingFightsQuery: Joi.object({
        limit: Joi.number().min(1).max(50).default(10).optional()
    }),

    // Recent results query
    recentResultsQuery: Joi.object({
        limit: Joi.number().min(1).max(50).default(10).optional()
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