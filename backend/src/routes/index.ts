import express from "express";
import testRoutes from "./testRoutes.js";
import adminRoutes from "./adminRoutes.js";
import viewRoutes from "./viewRoutes.js";

const routes = (app:any) => {
    app.use(express.json(), testRoutes, adminRoutes, viewRoutes);
}

export default routes;