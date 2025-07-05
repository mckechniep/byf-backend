// middleware/security.js
import rateLimit from "express-rate-limit";
import helmet from "helmet";

/**
 * WHY WE NEED THIS:
 * - Prevents brute force attacks and spam
 * - Adds security headers to protect against common vulnerabilities
 * - Controls request frequency to prevent server overload
 * - Protects against various web attacks (XSS, clickjacking, etc.)
 */

/**
 * General API rate limiting
 * Applies to all requests to prevent abuse
 */
export const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        error: "Too many requests from this IP, please try again later.",
        code: "RATE_LIMIT_EXCEEDED",
        retryAfter: "15 minutes"
    },
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false, // Disable legacy headers
    // Skip successful requests to static files
    skip: (req) => {
        return req.url.startsWith('/static/') || 
               req.url.startsWith('/images/') || 
               req.url.startsWith('/favicon.ico');
    }
});

/**
 * Strict rate limiting for authentication endpoints
 * Prevents brute force login attacks
 */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login attempts per windowMs
    message: {
        error: "Too many login attempts, please try again in 15 minutes.",
        code: "AUTH_RATE_LIMIT_EXCEEDED",
        retryAfter: "15 minutes"
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Only apply to auth endpoints
    skip: (req) => {
        const authPaths = ['/signin', '/signup', '/forgot-password', '/reset-password'];
        return !authPaths.some(path => req.path.includes(path));
    }
});

/**
 * API creation rate limiting
 * Prevents spam creation of challenges, comments, etc.
 */
export const createLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10, // Limit each IP to 10 creation requests per 5 minutes
    message: {
        error: "Too many creation requests, please slow down.",
        code: "CREATE_RATE_LIMIT_EXCEEDED",
        retryAfter: "5 minutes"
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Apply to POST requests for creating resources
    skip: (req) => {
        return req.method !== 'POST' || 
               req.path.includes('/signin') || 
               req.path.includes('/signup');
    }
});

/**
 * Security headers configuration using Helmet
 * Protects against various web vulnerabilities
 */
export const securityHeaders = helmet({
    // Content Security Policy
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https://res.cloudinary.com"], // Allow Cloudinary for profile pics
            scriptSrc: ["'self'"],
            connectSrc: ["'self'", "https://api.stripe.com"], // Allow Stripe for payments
            frameSrc: ["'none'"], // Prevent clickjacking
            objectSrc: ["'none'"], // Prevent plugin exploitation
        },
    },
    
    // HTTP Strict Transport Security
    hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
    },
    
    // Prevent MIME type sniffing
    noSniff: true,
    
    // Prevent framejacking
    frameguard: { action: 'deny' },
    
    // XSS Protection
    xssFilter: true,
    
    // Hide X-Powered-By header
    hidePoweredBy: true,
    
    // Referrer Policy
    referrerPolicy: { policy: "same-origin" }
});

/**
 * CORS configuration
 * Controls which domains can access your API
 */
export const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
            'http://localhost:3000', // React dev server
            'http://localhost:5173', // Vite dev server
            'https://your-frontend-domain.com', // Your production frontend
            // Add more domains as needed
        ];
        
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS policy'));
        }
    },
    credentials: true, // Allow cookies and auth headers
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'Cache-Control',
        'X-CSRF-Token'
    ],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining'],
    maxAge: 86400 // Cache preflight for 24 hours
};

/**
 * Request size limiting
 * Prevents large payload attacks
 */
export const requestSizeLimit = {
    // JSON payload limit
    jsonLimit: '10mb',
    
    // URL-encoded payload limit
    urlencodedLimit: '10mb',
    
    // File upload limit (when implemented)
    fileUploadLimit: '50mb'
};

/**
 * Security middleware setup function
 * Call this in your main server file
 */
export const setupSecurity = (app) => {
    // Security headers
    app.use(securityHeaders);
    
    // Request size limiting
    app.use(express.json({ limit: requestSizeLimit.jsonLimit }));
    app.use(express.urlencoded({ 
        extended: true, 
        limit: requestSizeLimit.urlencodedLimit 
    }));
    
    // Rate limiting
    app.use('/api/', generalLimiter);
    app.use('/api/users/signin', authLimiter);
    app.use('/api/users/signup', authLimiter);
    
    console.log('🔒 Security middleware configured');
};

export default {
    generalLimiter,
    authLimiter,
    createLimiter,
    securityHeaders,
    corsOptions,
    requestSizeLimit,
    setupSecurity
};