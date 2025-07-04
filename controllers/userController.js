import User from "../models/userModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

/**
 * @desc  Sign up a new user (default: fan)
 */
export const signup = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ error: "All fields are required." });
        }

        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            return res.status(409).json({ error: "Username or email is already registered." });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const newUser = await User.create({ username, email, password: hashedPassword });

        res.status(201).json({ message: "User registered successfully!", userId: newUser._id });
    } catch (error) {
        console.error("Signup error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

/**
 * @desc  Sign in
 */
export const signin = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: "Username and password are required." });
        }

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid credentials." });
        }

        // Generates JWT token
        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1h" });

        res.status(200).json({ message: "User signed in successfully", token, user });
    } catch (error) {
        console.error("Signin error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

/**
 * @desc  "Step Into The Cage" - Fan Becomes Fighter
 */
export const stepIntoTheCage = async (req, res) => {
    try {
        const userId = req.user.id; 
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }

        if (user.isFighter) {
            return res.status(400).json({ error: "You are already a fighter!" });
        }

        user.isFighter = true;
        user.role = "fighter";
        await user.save();

        res.status(200).json({ message: "Welcome to the cage! You are now a fighter." });
    } catch (error) {
        console.error("Step into the cage error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};


/**
 * @desc  Get the profile of the logged-in user
 * @route GET /api/users/me
 * @access Private (Requires Authentication)
 */
export const getMyProfile = async (req, res) => {
    try {
        // Get the user ID from the JWT (set by verifyToken middleware)
        const userId = req.user.id;

        // Find the user in the database, but exclude the password field for security
        const user = await User.findById(userId).select("-password");

        // If the user doesn't exist, return an error
        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }

        // Send back the user's profile data
        res.status(200).json(user);
    } catch (error) {
        console.error("Error fetching user profile:", error);
        res.status(500).json({ error: "Internal server error." });
    }
};

/**
 * @desc  Update the profile of the logged-in user
 * @route PATCH /api/users/me
 * @access Private (Requires Authentication)
 */
export const updateMyProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        // Define allowed fields for updating
        const allowedUpdates = ["username", "email", "socialLinks"];
        const updates = {};

        // Loop through req.body and filter for allowed fields
        Object.keys(req.body).forEach((key) => {
            if (allowedUpdates.includes(key)) {
                updates[key] = req.body[key]; // Add valid fields to updates object
            }
        });

        // Ensure at least 1 valid field is provided
        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: "No valid fields to udpate" })
        }

        // Find and update the user, return new version
        const updatedUser = await User.findByIdAndUpdate(userId, updates, { new: true, select: "-password" }); // { new: true } because findByIdAndUpdate by default returns the old document

        if (!updatedUser) {
            return res.status(404).json({ error: "User not found" });
        }

        res.status(200).json(updatedUser);
    } catch (error) {
        console.error("Error updating profile:", error);
        res.status(500).json({ error: "Internal server error." });
    }
};

/**
 * @desc  Update fighter-specific details (Only for users who are fighters)
 * @route PATCH /api/users/me/fighter
 * @access Private (Requires Authentication)
 */
export const updateFighterProfile = async (req, res) => {
    try {
        // Get the user ID from JWT
        const userId = req.user.id;

        // Find the user in the database
        const user = await User.findById(userId);

        // If the user doesn't exist, return an error
        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }

        // Ensure the user is a fighter before allowing updates
        if (!user.isFighter) {
            return res.status(403).json({ error: "Only fighters can update fighter details." });
        }

        // Define the allowed fighter-specific fields
        const allowedFighterUpdates = ["weight", "height", "styles", "customStyle"];
        const fighterUpdates = {};

        // Loop through the request body and filter out allowed fields
        Object.keys(req.body).forEach((key) => {
            if (allowedFighterUpdates.includes(key)) {
                fighterUpdates[key] = req.body[key];
            }
        });

        // Ensure at least one valid field is provided
        if (Object.keys(fighterUpdates).length === 0) {
            return res.status(400).json({ error: "No valid fighter fields to update." });
        }

        // Update the fighter's profile in the database
        const updatedFighter = await User.findByIdAndUpdate(userId, fighterUpdates, { new: true, select: "-password" });

        // Return the updated fighter profile
        res.status(200).json(updatedFighter);
    } catch (error) {
        console.error("Error updating fighter profile:", error);
        res.status(500).json({ error: "Internal server error." });
    }
};

/**
 * @desc  Get all fighters (with optional search filters)
 * @route GET /api/fighters
 * @access Public (Anyone can access)
 */
export const getAllFighters = async (req, res) => {
    try {
        // Build a query object for searching
        let query = { isFighter: true };

        // Apply filters if they exist in the query parameters
        if (req.query.weight) {
            query.weight = req.query.weight;
        }
        if (req.query.height) {
            query.height = req.query.height;
        }
        if (req.query.styles) {
            // Convert styles query into an array for searching (e.g., "Boxing,Muay Thai")
            query.styles = { $in: req.query.styles.split(",") };
        }
        if (req.query.city) {
            query["location.city"] = new RegExp(req.query.city, "i"); // Case insensitive search
        }
        if (req.query.state) {
            query["location.state"] = new RegExp(req.query.state, "i");
        }
        if (req.query.country) {
            query["location.country"] = new RegExp(req.query.country, "i");
        }

        // Fetch fighters that match the query, excluding passwords for security
        const fighters = await User.find(query).select("-password");

        res.status(200).json(fighters);
    } catch (error) {
        console.error("Error fetching fighters:", error);
        res.status(500).json({ error: "Internal server error." });
    }
};
