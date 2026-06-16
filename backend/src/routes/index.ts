import express from "express";
// import refeicoes from "./RefeicoesRouter.js";
// import contas from "./authRoutes.js";
// import metas from "./metasRoutes.js"

const routes = (app:any) => {
    app.use(express.json())
}

export default routes;