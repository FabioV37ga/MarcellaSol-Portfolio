const login = document.getElementById("admin-login") as HTMLInputElement;
const password = document.getElementById("admin-password") as HTMLInputElement;

const loginButton = document.getElementById("admin-confirm-login") as HTMLButtonElement;

const statusLog = document.getElementById("status-log") as HTMLDivElement;


export function initializeAdminPanel() {
    loginButton.addEventListener("click", async () => {
        const loginValue = login.value;
        const passwordValue = password.value;

        try {
            const response = await fetch("http://localhost:3000/admin/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ login: loginValue, password: passwordValue })
            });

            if (response.ok) {
                const data = await response.json();
                statusLog.textContent = data.message;
            } else {
                statusLog.textContent = "Login ou senha incorretos";
            }
        } catch (error) {
            console.error("Erro ao fazer login:", error);
        }
    })
}