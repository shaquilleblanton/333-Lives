import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import messagesRouter from "./messages";
import vaultRouter from "./vault";
import eventsRouter from "./events";
import habitsRouter from "./habits";
import intentionsRouter from "./intentions";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(messagesRouter);
router.use(vaultRouter);
router.use(eventsRouter);
router.use(habitsRouter);
router.use(intentionsRouter);
router.use(dashboardRouter);

export default router;
