import Joi from "joi";

// common validation schemas
const schemas = {
    // user registration validation
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
            .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)'))
            .required()
            .messages({
                'string.min': 'Password should have at least 6 characters',
                'string.max': 'Password should have at most 128 characters',
                'string.pattern.base': 'Password should contain at least one uppercase letter, one lowercase letter, and one digit',
                'any.required': 'Password is required'
        })
    }),

    // user login validation
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

   // Profile update validation
    updateProfile: Joi.object({
        username: Joi.string()
            .alphanum()
            .min(3)
            .max(30)
            .optional(),
        email: Joi.string()
            .email()
            .optional(),
        socialLinks: Joi.object({
            twitter: Joi.string().uri().allow('').optional(),
            instagram: Joi.string().uri().allow('').optional(),
            youtube: Joi.string().uri().allow('').optional()
        }).optional()
    }),

    // Fighter profile update validation
    updateFighterProfile: Joi.object({
        weight: Joi.number()
            .min(100)
            .max(400)
            .optional()
            .messages({
                'number.min': 'Weight must be at least 100 lbs',
                'number.max': 'Weight cannot exceed 400 lbs'
            }),
        height: Joi.number()
            .min(48)
            .max(84)
            .optional()
            .messages({
                'number.min': 'Height must be at least 48 inches',
                'number.max': 'Height cannot exceed 84 inches'
            }),
        styles: Joi.array()
            .items(Joi.string().valid(
                'BJJ', 'Wrestling', 'Judo', 'Jiu-Jitsu', 'Boxing', 
                'Kickboxing', 'Muay Thai', 'Taekwondo', 'Karate', 'Krav Maga', 'Other'
            ))
            .optional(),
        customStyle: Joi.when('styles', {
            is: Joi.array().items(Joi.string().valid('Other')),
            then: Joi.string().required(),
            otherwise: Joi.string().optional()
        })
    })
};

/**
 * Validation middleware factory
 * Creates middleware that validates request body against a schema
 */
export const validateInput = (schemaName) => {
    return (req, res, next) => {
        const schema = schemas[schemaName];
        
        if (!schema) {
            return res.status(500).json({ 
                error: "Validation schema not found",
                code: "SCHEMA_ERROR"
            });
        }

        const { error, value } = schema.validate(req.body, {
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
                error: "Validation failed",
                code: "VALIDATION_ERROR",
                details: validationErrors
            });
        }

        // Replace req.body with validated and sanitized data
        req.body = value;
        next();
    };
};

/**
 * Sanitize input to prevent XSS attacks
 * Removes potentially dangerous HTML/script tags
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
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                sanitize(obj[key]);
            }
        }
    };

    if (req.body) sanitize(req.body);
    if (req.query) sanitize(req.query);
    if (req.params) sanitize(req.params);
    
    next();
};

export default { validateInput, sanitizeInput };