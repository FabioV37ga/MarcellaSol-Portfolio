import express from "express";
import testRoutes from "./testRoutes.js";
import adminRoutes from "./adminRoutes.js";

const routes = (app:any) => {
    app.use(express.json(), testRoutes, adminRoutes);
}

export default routes;