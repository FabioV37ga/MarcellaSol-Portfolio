// Imports -----------------------------------------------------------------------------------------

import { config } from "../../utils/connection.js";
import u from "umbrellajs";
// import AdminSystem from "../controllers/adminSystem.controller.js";
import ClientSystem from "../controllers/clientSystem.controller.js";


// Elementos da página de login. -------------------------------------------------------------------

const login = u("#client-login").first() as HTMLInputElement;
const password = u("#client-password").first() as HTMLInputElement;
const loginButton = u("#client-login-button").first() as HTMLButtonElement;
const statusLog = u("#request-log").first() as HTMLDivElement;
const togglePasswordVisibilityBtn = u("#toggle-password-visibility").first() as HTMLElement;
const eyeIcon = u("#toggle-password-visibility i").first() as HTMLElement;
const rememberMeCheckbox = u("#remember-me").first() as HTMLInputElement;
const rememberMeActive = u("#remember-me-active").first() as HTMLDivElement;

// Inicialização ------------------------------------------------------------------------------------
export function initializeClientPanel() {

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
    var section = localStorage.getItem("Client-Section")
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

            localStorage.removeItem("Client-Section")
        }
    } else {

    }
}
checkSection()



async function submitLogin(login: string, password: string) {
    console.log("logging in")

    if (rememberSection) {
        var timestamp = Date.now()
        localStorage.setItem("Client-Section", JSON.stringify({
            login,
            password,
            timestamp
        }))
    }

    try {

        // Requisição de login
        const response = await fetch(`${config.apiBaseUrl}/client/login`, {
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

            var client = await response.json()
            var name = client.name
            var hasBriefing = client.hasBriefing

            console.log(name)
            // new AdminSystem(loginValue, passwordValue, name)
            new ClientSystem(login, password, name, hasBriefing)
        } else {
            logLoginMessage("Login ou senha incorretos.");
        }
    } catch (error) {
        console.error("Erro ao fazer login:", error);
    }
}

function logLoginMessage(message: string) {
    statusLog.textContent = message;
    setTimeout(() => {
        statusLog.textContent = "";
    }, 3000);
}