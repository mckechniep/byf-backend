import { Router } from "express";
import { signup, signin, stepIntoTheCage, getMyProfile, updateMyProfile, updateFighterProfile } from "../controllers/userController.js";
import verifyToken from "../middleware/verifyToken.js";

const router = Router();

router.post("/signup", signup);
router.post("/signin", signin);
router.post("/become-fighter", verifyToken, stepIntoTheCage);
router.get("/me", verifyToken, getMyProfile); // New route to get user profile
router.patch("/me", verifyToken, updateMyProfile);
router.patch("/me/fighter", verifyToken, updateFighterProfile);

export default router;
