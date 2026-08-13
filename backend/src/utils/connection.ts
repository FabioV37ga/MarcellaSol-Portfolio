
// Detecta o ambiente de execução e mantém compatibilidade com Node e navegador
function isDevelopment() {
  if (typeof window !== "undefined" && window.location) {
    const hostname = window.location.hostname;
    return hostname === "localhost" ||
      hostname.startsWith("127.") ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      hostname === "[::1]";
  }

  return process.env.NODE_ENV !== "production";
}

const environment = isDevelopment() ? "development" : "production";

export const config = {
  environment,
  apiBaseUrl: environment === "development"
    ? process.env.API_BASE_URL_DEV || "http://localhost:3000/api"
    : process.env.API_BASE_URL || "https://marcellasol.com.br/api",
};