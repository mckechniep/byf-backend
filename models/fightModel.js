// models/fightModel.js - Fight/Match system for recording actual fights
import mongoose from "mongoose";

/**
 * Fight Schema - Represents actual fights between fighters
 * 
 * WORKFLOW:
 * 1. Fight is created from an accepted challenge
 * 2. Fight is scheduled with date/location/rules
 * 3. Fight happens and results are recorded
 * 4. User records are updated automatically
 * 5. Bets are resolved based on outcome
 */
const fightSchema = new mongoose.Schema({
    // Fight participants
    fighters: [{
        user: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: "User", 
            required: true 
        },
        corner: {
            type: String,
            enum: ["red", "blue"],
            required: true
        },
        // Pre-fight stats snapshot (for historical record)
        preStats: {
            weight: Number,
            record: {
                wins: { type: Number, default: 0 },
                losses: { type: Number, default: 0 },
                draws: { type: Number, default: 0 }
            }
        },
        // Fight performance
        result: { 
            type: String, 
            enum: ["win", "loss", "draw", "no-contest", null],
            default: null 
        }
    }],

    // Reference to the challenge that created this fight
    fromChallenge: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Challenge",
        required: true,
        index: true
    },

    // Fight status
    status: { 
        type: String, 
        enum: ["scheduled", "in-progress", "completed", "cancelled", "postponed"],
        default: "scheduled",
        index: true
    },

    // Fight details
    details: {
        scheduledDate: {
            type: Date,
            required: true,
            validate: {
                validator: function(date) {
                    // Only validate future dates for scheduled fights
                    if (this.status === 'scheduled') {
                        return date > new Date();
                    }
                    return true;
                },
                message: "Scheduled date must be in the future"
            }
        },
        actualDate: Date, // When the fight actually happened
        venue: {
            name: { type: String, trim: true },
            address: { type: String, trim: true },
            city: { type: String, trim: true },
            state: { type: String, trim: true },
            country: { type: String, trim: true }
        },
        weightClass: { 
            type: String,
            enum: [
                "Flyweight", "Bantamweight", "Featherweight", "Lightweight", 
                "Welterweight", "Middleweight", "Light Heavyweight", "Heavyweight",
                "Catchweight", "Open Weight"
            ],
            required: true
        },
        rules: {
            rounds: { type: Number, default: 3, min: 1, max: 12 },
            roundDuration: { type: Number, default: 300 }, // seconds (5 minutes default)
            format: {
                type: String,
                enum: ["MMA", "Boxing", "Kickboxing", "Grappling", "Custom"],
                default: "MMA"
            },
            customRules: { type: String, trim: true }
        }
    },

    // Fight outcome
    outcome: {
        winner: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: "User",
            default: null
        },
        method: { 
            type: String, 
            enum: ["KO", "TKO", "Submission", "Decision", "DQ", "No Contest", null],
            default: null
        },
        methodDetails: {
            type: String,
            trim: true,
            maxlength: [500, "Method details cannot exceed 500 characters"]
        },
        round: { type: Number, min: 1 },
        time: { type: String }, // Format: "MM:SS"
        
        // For decisions
        judges: [{
            name: { type: String, trim: true },
            scorecard: {
                fighterA: { type: Number },
                fighterB: { type: Number }
            }
        }],
        
        // Fight statistics
        stats: [{
            fighter: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            strikes: {
                landed: { type: Number, default: 0 },
                thrown: { type: Number, default: 0 }
            },
            takedowns: {
                successful: { type: Number, default: 0 },
                attempted: { type: Number, default: 0 }
            },
            submissions: {
                attempted: { type: Number, default: 0 }
            },
            controlTime: { type: Number, default: 0 } // seconds
        }]
    },

    // Event information (if part of an organized event)
    event: {
        name: { type: String, trim: true },
        date: Date,
        isMainEvent: { type: Boolean, default: false }
    },

    // Media and documentation
    media: {
        videoUrl: { type: String, trim: true },
        photoUrls: [{ type: String, trim: true }],
        highlights: [{ type: String, trim: true }]
    },

    // Officials
    officials: {
        referee: { type: String, trim: true },
        judges: [{ type: String, trim: true }],
        timekeeper: { type: String, trim: true }
    },

    // Betting information
    betting: {
        totalPot: { type: Number, default: 0 },
        betsCount: { type: Number, default: 0 },
        payoutCompleted: { type: Boolean, default: false }
    },

    // Verification
    verification: {
        isVerified: { type: Boolean, default: false },
        verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        verifiedAt: Date,
        verificationNotes: { type: String, trim: true }
    },

    // Metadata
    visibility: {
        type: String,
        enum: ["public", "private", "friends-only"],
        default: "public"
    },
    
    notes: {
        type: String,
        trim: true,
        maxlength: [2000, "Notes cannot exceed 2000 characters"]
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ==================== INDEXES ====================

// Compound indexes for common queries
fightSchema.index({ 'fighters.user': 1, status: 1 });
fightSchema.index({ status: 1, 'details.scheduledDate': 1 });
fightSchema.index({ 'outcome.winner': 1, createdAt: -1 });
fightSchema.index({ 'details.weightClass': 1, status: 1 });

// ==================== VIRTUAL FIELDS ====================

// Virtual for getting fight duration (if completed)
fightSchema.virtual('duration').get(function() {
    if (this.outcome.round && this.outcome.time) {
        const [minutes, seconds] = this.outcome.time.split(':').map(Number);
        const completedRounds = this.outcome.round - 1;
        const totalSeconds = (completedRounds * this.details.rules.roundDuration) + 
                           (minutes * 60) + seconds;
        return totalSeconds;
    }
    return null;
});

// Virtual for checking if fight can be edited
fightSchema.virtual('canEdit').get(function() {
    return ['scheduled', 'postponed'].includes(this.status);
});

// Virtual for getting participant IDs
fightSchema.virtual('participantIds').get(function() {
    return this.fighters.map(f => f.user);
});

// ==================== MIDDLEWARE ====================

// Pre-save validation
fightSchema.pre('save', async function(next) {
    // Ensure exactly 2 fighters
    if (this.fighters.length !== 2) {
        return next(new Error('A fight must have exactly 2 fighters'));
    }

    // Ensure fighters are different
    if (this.fighters[0].user.toString() === this.fighters[1].user.toString()) {
        return next(new Error('A fighter cannot fight themselves'));
    }

    // Ensure corners are different
    const corners = this.fighters.map(f => f.corner);
    if (corners[0] === corners[1]) {
        return next(new Error('Fighters must be in different corners'));
    }

    // Auto-set actualDate when fight is completed
    if (this.isModified('status') && this.status === 'completed' && !this.details.actualDate) {
        this.details.actualDate = new Date();
    }

    next();
});

// Post-save middleware: Update fighter records
fightSchema.post('save', async function(doc) {
    if (doc.status === 'completed' && doc.outcome.winner) {
        try {
            const User = mongoose.model('User');
            
            // Update fighter records
            for (const fighter of doc.fighters) {
                const update = {};
                
                if (fighter.result === 'win') {
                    update['record.wins'] = 1;
                } else if (fighter.result === 'loss') {
                    update['record.losses'] = 1;
                } else if (fighter.result === 'draw') {
                    update['record.draws'] = 1;
                }
                
                if (Object.keys(update).length > 0) {
                    await User.findByIdAndUpdate(
                        fighter.user,
                        { $inc: update }
                    );
                }
            }

            // Update the related challenge
            const Challenge = mongoose.model('Challenge');
            await Challenge.findByIdAndUpdate(
                doc.fromChallenge,
                { 
                    status: 'completed',
                    relatedFight: doc._id
                }
            );

        } catch (error) {
            console.error('Error updating fighter records:', error);
        }
    }
});

// ==================== INSTANCE METHODS ====================

// Method to record fight result
fightSchema.methods.recordResult = async function(winnerId, method, details = {}) {
    if (this.status !== 'in-progress' && this.status !== 'scheduled') {
        throw new Error('Can only record results for scheduled or in-progress fights');
    }

    // Validate winner is a participant
    const winnerIndex = this.fighters.findIndex(f => 
        f.user.toString() === winnerId.toString()
    );
    
    if (winnerIndex === -1 && method !== 'No Contest') {
        throw new Error('Winner must be one of the fight participants');
    }

    // Set outcome
    this.outcome.winner = winnerId;
    this.outcome.method = method;
    this.outcome.methodDetails = details.methodDetails || '';
    this.outcome.round = details.round || null;
    this.outcome.time = details.time || null;

    // Update fighter results
    if (method === 'No Contest') {
        this.fighters.forEach(f => { f.result = 'no-contest'; });
    } else if (method === 'Draw' || (method === 'Decision' && !winnerId)) {
        this.fighters.forEach(f => { f.result = 'draw'; });
    } else {
        this.fighters.forEach((f, index) => {
            f.result = index === winnerIndex ? 'win' : 'loss';
        });
    }

    // Update status
    this.status = 'completed';
    this.details.actualDate = new Date();

    return this.save();
};

// Method to start fight
fightSchema.methods.start = function() {
    if (this.status !== 'scheduled') {
        throw new Error('Can only start scheduled fights');
    }
    
    this.status = 'in-progress';
    return this.save();
};

// Method to cancel fight
fightSchema.methods.cancel = function(reason = '') {
    if (['completed', 'cancelled'].includes(this.status)) {
        throw new Error('Cannot cancel a ' + this.status + ' fight');
    }
    
    this.status = 'cancelled';
    this.notes = `Cancelled: ${reason}`.trim();
    return this.save();
};

// Method to postpone fight
fightSchema.methods.postpone = function(newDate, reason = '') {
    if (!['scheduled', 'in-progress'].includes(this.status)) {
        throw new Error('Can only postpone scheduled or in-progress fights');
    }
    
    this.status = 'postponed';
    this.details.scheduledDate = newDate;
    this.notes = `Postponed: ${reason}`.trim();
    return this.save();
};

// Method to add fight statistics
fightSchema.methods.addStats = function(fighterStats) {
    this.outcome.stats = fighterStats;
    return this.save();
};

// Method to verify fight result
fightSchema.methods.verify = function(verifierId, notes = '') {
    this.verification = {
        isVerified: true,
        verifiedBy: verifierId,
        verifiedAt: new Date(),
        verificationNotes: notes
    };
    return this.save();
};

// ==================== STATIC METHODS ====================

// Create fight from accepted challenge
fightSchema.statics.createFromChallenge = async function(challengeId) {
    const Challenge = mongoose.model('Challenge');
    const challenge = await Challenge.findById(challengeId)
        .populate('challenger challenged');
    
    if (!challenge) {
        throw new Error('Challenge not found');
    }
    
    if (challenge.status !== 'accepted') {
        throw new Error('Challenge must be accepted to create a fight');
    }

    // Get fighter records for pre-stats snapshot
    const User = mongoose.model('User');
    const [challenger, challenged] = await Promise.all([
        User.findById(challenge.challenger),
        User.findById(challenge.challenged)
    ]);

    const fight = new this({
        fighters: [
            {
                user: challenge.challenger,
                corner: 'red',
                preStats: {
                    weight: challenger.weight,
                    record: { ...challenger.record }
                }
            },
            {
                user: challenge.challenged,
                corner: 'blue',
                preStats: {
                    weight: challenged.weight,
                    record: { ...challenged.record }
                }
            }
        ],
        fromChallenge: challengeId,
        details: {
            scheduledDate: challenge.fightDetails.proposedDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default 1 week
            venue: {
                city: challenge.fightDetails.location
            },
            weightClass: challenge.fightDetails.weightClass || 'Open Weight',
            rules: {
                customRules: challenge.fightDetails.rules
            }
        }
    });

    return fight.save();
};

// Get user's fight history
fightSchema.statics.getUserFights = function(userId, options = {}) {
    const query = { 'fighters.user': userId };
    
    if (options.status) {
        query.status = options.status;
    }
    
    return this.find(query)
        .populate('fighters.user', 'username profilePicture record')
        .populate('outcome.winner', 'username')
        .populate('fromChallenge')
        .sort({ 'details.scheduledDate': -1 });
};

// Get upcoming fights
fightSchema.statics.getUpcomingFights = function(limit = 10) {
    return this.find({
        status: 'scheduled',
        'details.scheduledDate': { $gte: new Date() }
    })
    .populate('fighters.user', 'username profilePicture record location')
    .sort({ 'details.scheduledDate': 1 })
    .limit(limit);
};

// Get recent results
fightSchema.statics.getRecentResults = function(limit = 10) {
    return this.find({
        status: 'completed'
    })
    .populate('fighters.user', 'username profilePicture record location')
    .populate('outcome.winner', 'username')
    .sort({ 'details.actualDate': -1 })
    .limit(limit);
};

// ==================== EXPORT ====================

const Fight = mongoose.model("Fight", fightSchema);
export default Fight;