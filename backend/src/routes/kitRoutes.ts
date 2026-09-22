import { Router } from "express";
import { createKit, listKits, getKit, deleteKit } from "../controllers/kitController";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

router.use(requireAuth); // every kit route requires a logged-in user

router.post("/", createKit);
router.get("/", listKits);
router.get("/:id", getKit);
router.delete("/:id", deleteKit);

export default router;