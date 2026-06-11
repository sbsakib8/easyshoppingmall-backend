import { Router } from "express";
import { isAuth } from "../../middlewares/isAuth";
import { getTeamSystem } from "./teamSystem.controller";

const teamSystemRoutes = Router();

teamSystemRoutes.get("/", isAuth, getTeamSystem);

export default teamSystemRoutes;
