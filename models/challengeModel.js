// models/challengeModel.js - Challenge system for fight proposals
import mongoose from "mongoose";

/**
 * Challenge Schema - Represents fight proposals between fighters
 * 
 * WORKFLOW:
 * 1. Fighter A challenges Fighter B (status: "pending")
 * 2. Fighter B can accept/decline (status: "accepted"/"declined")
 * 3. If accepted, fight details can be negotiated
 * 4. Challenge can be completed when fight happens (status: "completed")
 * 5. Challenge can be cancelled anytime (status: "cancelled")
 */
const challengeSchema = new mongoose.Schema({
    // Core challenge participants
    challenger: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User", 
        required: true,
        index: true // Index for faster queries
    },
    challenged: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User", 
        required: true,
        index: true // Index for faster queries
    },

    // Challenge status tracking
    status: { 
        type: String, 
        enum: ["pending", "accepted", "declined", "completed", "cancelled"],
        default: "pending",
        index: true // Index for status-based queries
    },

    // Fight proposal details
    fightDetails: {
        proposedDate: { 
            type: Date,
            validate: {
                validator: function(date) {
                    return !date || date > new Date();
                },
                message: "Proposed date must be in the future"
            }
        },
        location: { 
            type: String, 
            trim: true,
            maxlength: [200, "Location cannot exceed 200 characters"]
        },
        rules: { 
            type: String, 
            trim: true,
            maxlength: [1000, "Rules cannot exceed 1000 characters"]
        },
        weightClass: { 
            type: String,
            enum: [
                "Flyweight", "Bantamweight", "Featherweight", "Lightweight", 
                "Welterweight", "Middleweight", "Light Heavyweight", "Heavyweight",
                "Catchweight", "Open Weight"
            ]
        },
        stakes: {
            type: String,
            trim: true,
            maxlength: [500, "Stakes description cannot exceed 500 characters"]
        }
    },

    // Communication between fighters
    messages: [{
        sender: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: "User", 
            required: true 
        },
        message: { 
            type: String, 
            required: true,
            trim: true,
            maxlength: [1000, "Message cannot exceed 1000 characters"]
        },
        timestamp: { 
            type: Date, 
            default: Date.now 
        },
        isSystemMessage: { 
            type: Boolean, 
            default: false 
        }
    }],

    // Challenge response details
    responseDetails: {
        respondedAt: Date,
        responseMessage: {
            type: String,
            trim: true,
            maxlength: [500, "Response message cannot exceed 500 characters"]
        }
    },

    // Metadata
    createdAt: { 
        type: Date, 
        default: Date.now,
        index: true // Index for date-based queries
    },
    updatedAt: { 
        type: Date, 
        default: Date.now 
    },

    // Related fight record (when challenge is completed)
    relatedFight: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Fight" // For future Fight model integration
    }
}, {
    timestamps: true, // Automatically manage createdAt and updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ==================== INDEXES ====================

// Compound indexes for common queries
challengeSchema.index({ challenger: 1, status: 1 });
challengeSchema.index({ challenged: 1, status: 1 });
challengeSchema.index({ status: 1, createdAt: -1 });

// ==================== VIRTUAL FIELDS ====================

// Virtual for getting all participants
challengeSchema.virtual('participants').get(function() {
    return [this.challenger, this.challenged];
});

// Virtual for checking if challenge is active (can be modified)
challengeSchema.virtual('isActive').get(function() {
    return ['pending', 'accepted'].includes(this.status);
});

// Virtual for checking if challenge needs response
challengeSchema.virtual('needsResponse').get(function() {
    return this.status === 'pending';
});

// ==================== MIDDLEWARE ====================

// Pre-save middleware to update the updatedAt field
challengeSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

// Pre-save validation: prevent self-challenges
challengeSchema.pre('save', function(next) {
    if (this.challenger.toString() === this.challenged.toString()) {
        const error = new Error('A fighter cannot challenge themselves');
        error.name = 'ValidationError';
        return next(error);
    }
    next();
});

// Post-save middleware: Update user's challenges array
challengeSchema.post('save', async function(doc) {
    try {
        const User = mongoose.model('User');
        
        // Add challenge to both users' challenges arrays if not already present
        await User.updateOne(
            { 
                _id: doc.challenger,
                challenges: { $ne: doc._id }
            },
            { $addToSet: { challenges: doc._id } }
        );
        
        await User.updateOne(
            { 
                _id: doc.challenged,
                challenges: { $ne: doc._id }
            },
            { $addToSet: { challenges: doc._id } }
        );
    } catch (error) {
        console.error('Error updating user challenges:', error);
    }
});

// ==================== INSTANCE METHODS ====================

// Method to add a message to the challenge
challengeSchema.methods.addMessage = function(senderId, messageText, isSystemMessage = false) {
    this.messages.push({
        sender: senderId,
        message: messageText,
        isSystemMessage
    });
    return this.save();
};

// Method to accept challenge
challengeSchema.methods.accept = function(responseMessage = '') {
    if (this.status !== 'pending') {
        throw new Error('Challenge cannot be accepted - current status: ' + this.status);
    }
    
    this.status = 'accepted';
    this.responseDetails = {
        respondedAt: new Date(),
        responseMessage
    };
    
    // Add system message
    this.messages.push({
        sender: this.challenged,
        message: `Challenge accepted! ${responseMessage}`.trim(),
        isSystemMessage: true
    });
    
    return this.save();
};

// Method to decline challenge
challengeSchema.methods.decline = function(responseMessage = '') {
    if (this.status !== 'pending') {
        throw new Error('Challenge cannot be declined - current status: ' + this.status);
    }
    
    this.status = 'declined';
    this.responseDetails = {
        respondedAt: new Date(),
        responseMessage
    };
    
    // Add system message
    this.messages.push({
        sender: this.challenged,
        message: `Challenge declined. ${responseMessage}`.trim(),
        isSystemMessage: true
    });
    
    return this.save();
};

// Method to cancel challenge
challengeSchema.methods.cancel = function(reason = '') {
    if (!['pending', 'accepted'].includes(this.status)) {
        throw new Error('Challenge cannot be cancelled - current status: ' + this.status);
    }
    
    this.status = 'cancelled';
    
    // Add system message
    this.messages.push({
        sender: this.challenger,
        message: `Challenge cancelled. ${reason}`.trim(),
        isSystemMessage: true
    });
    
    return this.save();
};

// Method to complete challenge
challengeSchema.methods.complete = function(fightId = null) {
    if (this.status !== 'accepted') {
        throw new Error('Challenge cannot be completed - must be accepted first');
    }
    
    this.status = 'completed';
    if (fightId) {
        this.relatedFight = fightId;
    }
    
    // Add system message
    this.messages.push({
        sender: null, // System message
        message: 'Challenge completed - fight has taken place!',
        isSystemMessage: true
    });
    
    return this.save();
};

// ==================== STATIC METHODS ====================

// Get challenges for a specific user
challengeSchema.statics.getUserChallenges = function(userId, status = null) {
    const query = {
        $or: [
            { challenger: userId },
            { challenged: userId }
        ]
    };
    
    if (status) {
        query.status = status;
    }
    
    return this.find(query)
        .populate('challenger', 'username profilePicture record location')
        .populate('challenged', 'username profilePicture record location')
        .populate('messages.sender', 'username')
        .sort({ updatedAt: -1 });
};

// Get pending challenges for a user (challenges they need to respond to)
challengeSchema.statics.getPendingChallengesForUser = function(userId) {
    return this.find({
        challenged: userId,
        status: 'pending'
    })
    .populate('challenger', 'username profilePicture record location')
    .populate('challenged', 'username profilePicture record location')
    .sort({ createdAt: -1 });
};

// Check if a challenge already exists between two users
challengeSchema.statics.existsBetweenUsers = function(user1Id, user2Id) {
    return this.findOne({
        $or: [
            { challenger: user1Id, challenged: user2Id },
            { challenger: user2Id, challenged: user1Id }
        ],
        status: { $in: ['pending', 'accepted'] }
    });
};

// ==================== EXPORT ====================

const Challenge = mongoose.model("Challenge", challengeSchema);
export default Challenge;