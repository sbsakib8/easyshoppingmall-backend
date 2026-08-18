import { Router } from "express";
import { isAuth } from "../../middlewares/isAuth";
import { isDashboardAccess } from "../../middlewares/isDashboardAccess";
import { getTeamSystem } from "./teamSystem.controller";
import { getAdminTeamSystem } from "./teamSystem.admin.controller";

const teamSystemRoutes = Router();

teamSystemRoutes.get("/", isAuth, getTeamSystem);
teamSystemRoutes.get("/admin/all", isAuth, isDashboardAccess("dropshipping"), getAdminTeamSystem);

export default teamSystemRoutes;
