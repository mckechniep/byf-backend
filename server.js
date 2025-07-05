// server.js - Updated with security middleware
import express from "express";
import logger from "morgan";
import mongoose from "mongoose";
import cors from "cors";
import compression from "compression";
import dotenv from "dotenv";

// Import route files
import userRoutes from "./routes/userRoutes.js";
import fighterRouter from "./routes/fighterRoutes.js";

// Import security middleware
import { corsOptions, generalLimiter, authLimiter } from "./middleware/security.js";
import { globalErrorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { sanitizeInput } from "./middleware/validation.js";
import helmet from "helmet";

// Load environment variables (from .env file)
// dotenv.config() reads the .env file and merges variables into process.env.
// You can then access them in your code with process.env.JWT_SECRET, for example, to sign or verify JWTs.
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ==================== SECURITY MIDDLEWARE ====================
console.log('🔒 Setting up security middleware...');

// Security headers (must be first)
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
            scriptSrc: ["'self'"],
            connectSrc: ["'self'"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));

// CORS configuration
app.use(cors(corsOptions));

// Compression middleware for better performance
app.use(compression());

// ==================== BASIC MIDDLEWARE ====================

// Body parsing with size limits
app.use(express.json({ 
    limit: '10mb',
    verify: (req, res, buf) => {
        // Store raw body for webhook verification if needed
        req.rawBody = buf;
    }
}));

app.use(express.urlencoded({ 
    extended: true, 
    limit: '10mb' 
}));

// Request logging
if (process.env.NODE_ENV === 'development') {
    app.use(logger("dev"));
} else {
    app.use(logger("combined"));
}

// Input sanitization (prevent XSS)
app.use(sanitizeInput);

// ==================== RATE LIMITING ====================

// General rate limiting for all API routes
app.use('/api/', generalLimiter);

// Stricter rate limiting for authentication routes
app.use('/api/users/signin', authLimiter);
app.use('/api/users/signup', authLimiter);

// ==================== DATABASE CONNECTION ====================

mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('✅ Connected to MongoDB database');
    })
    .catch((err) => {
        console.error('❌ Database connection error:', err);
        process.exit(1); // Exit if database connection fails
    });

// ==================== HEALTH CHECK ROUTE ====================

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        message: 'LaPointe API is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0'
    });
});

// ==================== API ROUTES ====================

app.use("/api/users", userRoutes);
app.use("/api/fighters", fighterRouter);

// ==================== ERROR HANDLING ====================

// Handle 404 errors for undefined routes
app.use(notFoundHandler);

// Global error handling middleware (must be last)
app.use(globalErrorHandler);

// ==================== GRACEFUL SHUTDOWN ====================

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('💥 UNHANDLED PROMISE REJECTION! Shutting down...');
    console.error(err);
    server.close(() => {
        process.exit(1);
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('💥 UNCAUGHT EXCEPTION! Shutting down...');
    console.error(err);
    process.exit(1);
});

// ==================== START SERVER ====================

const server = app.listen(PORT, () => {
    console.log('\n🚀 LaPointe API Server Status:');
    console.log(`   ▶ Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   ▶ Port: ${PORT}`);
    console.log(`   ▶ URL: http://localhost:${PORT}`);
    console.log(`   ▶ Health Check: http://localhost:${PORT}/health`);
    console.log('   ▶ Security: Enabled ✅');
    console.log('   ▶ Rate Limiting: Active ✅');
    console.log('   ▶ Input Validation: Ready ✅\n');
});

// Handle SIGTERM gracefully
process.on('SIGTERM', () => {
    console.log('👋 SIGTERM received. Shutting down gracefully');
    server.close(() => {
        console.log('💤 Process terminated');
    });
});

export default app;