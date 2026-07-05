import { Router, type IRouter } from "express";
import healthRouter from "./health";
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

const router: IRouter = Router();

router.use(healthRouter);
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

export default router;
