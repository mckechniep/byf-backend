import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    role: { 
        type: String, 
        enum: ["fan", "fighter"], 
        default: "fan" 
    },
    favoriteFighters: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Fans can follow fighters
    bets: [
        {
            fighterId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
            amount: { type: Number, required: true, min: 1 },
            status: { type: String, enum: ["Pending", "Won", "Lost"], default: "Pending" },
        }
    ],
    comments: [
        {
            text: { type: String, required: true },
            createdAt: { type: Date, default: Date.now },
        }
    ],

    // Fighter-specific fields (only relevant if role === "fighter")
    isFighter: { type: Boolean, default: false }, // Indicates if they have chosen to be a fighter
    profilePicture: { type: String, required: false }, // Image URL
    age: { type: Number, min: 18 }, // Fighters must be 18+
    weight: { type: Number },
    height: { type: Number },
    record: {
        wins: { type: Number, default: 0, min: 0 },
        losses: { type: Number, default: 0, min: 0 },
        draws: { type: Number, default: 0, min: 0 },
    },
    challenges: [{ type: mongoose.Schema.Types.ObjectId, ref: "Challenge" }],
    location: {
        city: { type: String, trim: true },
        state: { type: String, trim: true },
        country: { type: String, trim: true },
    },
    styles: {
        type: [String], // List of fighting styles
        enum: ["BJJ", "Wrestling", "Judo", "Jiu-Jitsu", "Boxing", "Kickboxing", "Muay Thai", "Taekwondo", "Karate", "Krav Maga", "Other"],
    },
    customStyle: {
      type: String,
      required: function () {
          return this.styles.includes("Other");
      },
      trim: true,
    },
    socialLinks: {
        twitter: { type: String, trim: true },
        instagram: { type: String, trim: true },
        youtube: { type: String, trim: true },
    }
});

// Create the User model
const User = mongoose.model("User", userSchema);
export default User;
