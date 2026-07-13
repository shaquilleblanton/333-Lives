import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/auth";
import healthRouter from "./health";
import storageRouter from "./storage";
import usersRouter from "./users";
import messagesRouter from "./messages";
import vaultRouter from "./vault";
import eventsRouter from "./events";
import habitsRouter from "./habits";
import intentionsRouter from "./intentions";
import dashboardRouter from "./dashboard";
import journalRouter from "./journal";
import goalsRouter from "./goals";
import affirmationsRouter from "./affirmations";
import gratitudeRouter from "./gratitude";
import peopleRouter from "./people";
import communityRouter from "./community";
import legacyLettersRouter from "./legacy-letters";
import relationshipMomentsRouter from "./relationship-moments";
import workoutsRouter from "./workouts";
import tasksRouter from "./tasks";
import shopRouter from "./shop";
import voiceMemosRouter from "./voice-memos";
import feedbackRouter from "./feedback";
import familyMembersRouter from "./family-members";
import storyAnswersRouter from "./story-answers";
import lifeEventsRouter from "./life-events";
import pulseRouter from "./pulse";
import memoryCollectionsRouter from "./memory-collections";
import reviewRouter from "./review";

const router: IRouter = Router();

// Public routes: health checks, storage (handles its own auth per-route so
// public assets stay public), and the read-only shop catalog.
router.use(healthRouter);
router.use(storageRouter);
router.use(shopRouter);

// Everything below is per-user data and requires a signed-in user.
router.use(requireAuth);
router.use(usersRouter);
router.use(messagesRouter);
router.use(vaultRouter);
router.use(eventsRouter);
router.use(habitsRouter);
router.use(intentionsRouter);
router.use(dashboardRouter);
router.use(journalRouter);
router.use(goalsRouter);
router.use(affirmationsRouter);
router.use(gratitudeRouter);
router.use(peopleRouter);
router.use(communityRouter);
router.use(legacyLettersRouter);
router.use(relationshipMomentsRouter);
router.use(workoutsRouter);
router.use(tasksRouter);
router.use(voiceMemosRouter);
router.use(feedbackRouter);
router.use(familyMembersRouter);
router.use(storyAnswersRouter);
router.use(lifeEventsRouter);
router.use(pulseRouter);
router.use(memoryCollectionsRouter);
router.use(reviewRouter);

export default router;
