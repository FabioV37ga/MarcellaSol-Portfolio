import HomePageController from "./controllers/homePage.controller.js";
import { checkHealth, testApi } from "../utils/testRequisitions.js";

// checkHealth();
// testApi();

// alert(window.innerWidth + " x " + window.innerHeight);

var page = window.location.pathname.split("/").pop()?.replace(".html", "") || "home";


if (page == "home"){
    document.addEventListener("DOMContentLoaded", async () => {
        new HomePageController();
        await checkHealth()
        await testApi()
        console.log("oi caralho")
    })
}