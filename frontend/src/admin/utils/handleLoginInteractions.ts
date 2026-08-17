// Imports -----------------------------------------------------------------------------------------

import { config } from "../../utils/connection.js";
import u from "umbrellajs";
import AdminSystem from "../controllers/adminSystem.controller.js";


// Elementos da página de login. -------------------------------------------------------------------

const login = u("#admin-login").first() as HTMLInputElement;
const password = u("#admin-password").first() as HTMLInputElement;
const loginButton = u("#admin-login-button").first() as HTMLButtonElement;
const statusLog = u("#request-log").first() as HTMLDivElement;
const togglePasswordVisibilityBtn = u("#toggle-password-visibility").first() as HTMLElement;
const eyeIcon = u("#toggle-password-visibility i").first() as HTMLElement;
const rememberMeCheckbox = u("#remember-me").first() as HTMLInputElement;
const rememberMeActive = u("#remember-me-active").first() as HTMLDivElement;

// Inicialização ------------------------------------------------------------------------------------
export function initializeAdminPanel() {

    // Adiciona eventos de interação do formulário de login de administrador

    // Clicar no botão para submeter login ----------------------------------------------------------
    loginButton.addEventListener("click", async () => {
        await submitLogin(login.value, password.value);
    })

    // Apertar ENTER para submeter login ------------------------------------------------------------
    password.addEventListener("keydown", async (event) => {
        if (event.key === "Enter") {
            event.preventDefault()
            await submitLogin(login.value, password.value);
        }
    })

    // Alternar visibilidade da senha ----------------------------------------------------------------
    u(togglePasswordVisibilityBtn).on("click", () => {
        togglePasswordVisibility()
    })

    // Alternar salvamento da sessão no dispositivo --------------------------------------------------
    u(rememberMeCheckbox).on("click", () => {
        toggleRememberSession()
    })
}


// Função p/ alternar a visibilidade da senha --------------------------------------------------------
function togglePasswordVisibility() {
    if (u(password).hasClass("password-hidden")) {
        u(password).removeClass("password-hidden");
        u(eyeIcon).removeClass("fa-eye").addClass("fa-eye-slash");
    } else {
        u(password).addClass("password-hidden");
        u(eyeIcon).removeClass("fa-eye-slash").addClass("fa-eye");
    }
}


var rememberSection: boolean = false;
// Função p/ alternar salvamento da sessão no dispositivo --------------------------------------------
function toggleRememberSession() {
    if (u(rememberMeActive).hasClass("remember-me-active-on")) {
        u(rememberMeActive).removeClass("remember-me-active-on").addClass("remember-me-active-off");
        rememberSection = false;
    } else {
        u(rememberMeActive).removeClass("remember-me-active-off").addClass("remember-me-active-on");
        rememberSection = true;
    }
}

function checkSection() {
    var section = localStorage.getItem("Admin-Section")
    var currentTimestamp = Number(Date.now())
    var validPeriod = 604800000
    // var validPeriod = 60000


    if (section) {

        var jsonSection = JSON.parse(section)

        if (
            currentTimestamp - validPeriod < Number(jsonSection.timestamp)
        ) {
            submitLogin(
                jsonSection.login,
                jsonSection.password
            )
        } else {

            localStorage.removeItem("Admin-Section")
        }
    } else {

    }
}
checkSection()


async function submitLogin(login: string, password: string) {

    if (rememberSection) {
        var timestamp = Date.now()
        localStorage.setItem("Admin-Section", JSON.stringify({
            login,
            password,
            timestamp
        }))
    }


    try {

        // Requisição de login
        const response = await fetch(`${config.apiBaseUrl}/admin/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ login: login, password: password })
        });

        // se login bem-sucedido...
        if (response.ok) {

            // Log visual
            logLoginMessage("Login bem-sucedido!");

            var name = await response.json()
            name = name.name

            new AdminSystem(login, password, name)
        } else {
            logLoginMessage("Login ou senha incorretos.");
        }
    } catch (error) {

    }
}

function logLoginMessage(message: string) {
    statusLog.textContent = message;
    setTimeout(() => {
        statusLog.textContent = "";
    }, 3000);
}