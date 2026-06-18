import HomePageController from "./controllers/homePage.controller.js";
import { checkHealth, testApi } from "./utils/testRequisitions.js";

// checkHealth();
// testApi();

// alert(window.innerWidth + " x " + window.innerHeight);

document.addEventListener("DOMContentLoaded", () => {
    new HomePageController();
})