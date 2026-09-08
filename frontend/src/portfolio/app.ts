import HomePageController from "./controllers/homePage.controller.js";

// alert(window.innerWidth + " x " + window.innerHeight);

var page = window.location.pathname.split("/").pop()?.replace(".html", "") || "home";


if (page == "home"){
    document.addEventListener("DOMContentLoaded", () => {
        new HomePageController();
    })
}
import "font-awesome/css/font-awesome.min.css";
