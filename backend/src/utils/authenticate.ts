import { config } from "./connection.js";

export async function authenticateAdmin(req: JSON) {
    const response = await fetch(`${config.apiBaseUrl}/admin/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(req)
    });

    return response
}