import express from "express";
import testRoutes from "./testRoutes.js";
import adminRoutes from "./adminRoutes.js";
import viewRoutes from "./viewRoutes.js";
import clientRoutes from "./clientRoutes.js"


const routes = (app:any) => {
    app.use(express.json(), testRoutes, adminRoutes, clientRoutes, viewRoutes);
}

export default routes;