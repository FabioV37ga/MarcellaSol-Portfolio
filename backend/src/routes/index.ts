import express from "express";
import testRoutes from "./testRoutes.js";

const routes = (app:any) => {
    app.use(express.json(), testRoutes);
}

export default routes;