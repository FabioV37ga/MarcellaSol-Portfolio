import express from "express";
import testRoutes from "./testRoutes.js";
import adminRoutes from "./adminRoutes.js";

const routes = (app:any) => {
    app.use(express.json());
    
    const prefix = process.env.NODE_ENV === 'production' ? '/api' : '';
    app.use(prefix, testRoutes, adminRoutes);
}

export default routes;