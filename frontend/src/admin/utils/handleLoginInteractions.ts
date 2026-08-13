import { config } from "../../utils/connection.js";
import u from "umbrellajs";

const loginContainer = u(".admin-login").first() as HTMLElement;

const login = document.getElementById("admin-login") as HTMLInputElement;
const password = document.getElementById("admin-password") as HTMLInputElement;

const loginButton = document.getElementById("admin-login-button") as HTMLButtonElement;

const statusLog = document.getElementById("request-log") as HTMLDivElement;

const togglePasswordVisibility = u("#toggle-password-visibility").first() as HTMLElement;
const eyeIcon = u("#toggle-password-visibility i").first() as HTMLElement;

const rememberMeCheckbox = u("#remember-me").first() as HTMLInputElement;
const rememberMeActive = u("#remember-me-active").first() as HTMLDivElement;


export function initializeAdminPanel() {
    console.log(config.apiBaseUrl)
    loginButton.addEventListener("click", async () => {
        await submitLogin();
    })

    password.addEventListener("keydown", async (event) => {
        if (event.key === "Enter") {
            await submitLogin();
        }
    })

    // todo: refatorar em outra função, separando a lógica de exibição da sessão de eventos
    u(togglePasswordVisibility).on("click", () => {
        if (u(password).hasClass("password-hidden")) {
            u(password).removeClass("password-hidden");
            u(eyeIcon).removeClass("fa-eye").addClass("fa-eye-slash");
        } else {
            u(password).addClass("password-hidden");
            u(eyeIcon).removeClass("fa-eye-slash").addClass("fa-eye");
        }
    })

    u(rememberMeCheckbox).on("click", () => {
        if (u(rememberMeActive).hasClass("remember-me-active-on")) {
            u(rememberMeActive).removeClass("remember-me-active-on").addClass("remember-me-active-off");
        } else {
            u(rememberMeActive).removeClass("remember-me-active-off").addClass("remember-me-active-on");
        }
    })
}

async function submitLogin() {
    const loginValue = login.value;
    const passwordValue = password.value;

    try {
        const response = await fetch(`${config.apiBaseUrl}/admin/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ login: loginValue, password: passwordValue })
        });

        if (response.ok) {
            const data = await response.json();
            logLoginMessage("Login bem-sucedido!");
            setTimeout(async () => {


                const response = await fetch(`${config.apiBaseUrl}/view/admin/home`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json"
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    console.log(data)
                    logLoginMessage("Acesso à view home concedido");
                }


                // u(loginContainer).remove()
            }, 1000);
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