import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

/**
 * Middleware to verify JWT and attach user info to 'req.user'
 */

export const verifyToken = (req, res, next) => {
    try {
        // Get token from the request headers (format: "Bearer <token>")
        const token = req.headers.authorization?.split(" ")[1];
        
        if (!token) {
            return res.status(401).json({ error: "Access denied. No token provided" });
        }

        // Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Attach the user data (id, role) to req.user (the request)
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ error: "Invalid or expired token." });
    }
};

export default verifyToken;