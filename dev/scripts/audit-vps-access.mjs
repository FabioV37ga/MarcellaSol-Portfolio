#!/usr/bin/env node

const DEFAULT_URL = "https://marcellasol.com.br";
const TIMEOUT_MS = 10_000;
const commandArguments = process.argv.slice(2);
const targetUrl = commandArguments.find(argument => !argument.startsWith("--"));
const baseUrl = normalizedBaseUrl(targetUrl ?? process.env.VPS_AUDIT_URL ?? DEFAULT_URL);
const adminToken = process.env.VPS_AUDIT_ADMIN_TOKEN?.trim();
const clientToken = process.env.VPS_AUDIT_CLIENT_TOKEN?.trim();
const requireAuthenticatedChecks = commandArguments.includes("--require-auth");

const results = [];

await checkHiddenSource("/dev/database/client-proposals-view.json", ["viewName", "permission", "proposals-management-container"]);
await checkHiddenSource("/dev/agent-relatories/2026-09-03-checkup-arquitetura.md", ["checkup", "arquitetura", "ARQ-"]);

for (const path of ["/api/view/admin", "/api/view/admin/briefing", "/api/view/client"]) {
    await expectStatus(`Sem autenticação: ${path}`, path, 401, { method: "POST" });
}
await expectStatus("Token inválido não acessa view administrativa", "/api/view/admin", 401, {
    method: "POST",
    headers: authorization("token-invalido-de-auditoria")
});

if (clientToken) {
    await expectStatus("Cliente acessa suas views", "/api/view/client", 200, {
        method: "POST",
        headers: authorization(clientToken)
    });
    await expectStatus("Cliente não acessa views administrativas", "/api/view/admin", 401, {
        method: "POST",
        headers: authorization(clientToken)
    });
} else {
    skipped("Testes autenticados de cliente", "VPS_AUDIT_CLIENT_TOKEN não informado");
}

if (adminToken) {
    await expectStatus("Administrador acessa suas views", "/api/view/admin", 200, {
        method: "POST",
        headers: authorization(adminToken)
    });
    await expectStatus("Administrador não acessa views de cliente", "/api/view/client", 401, {
        method: "POST",
        headers: authorization(adminToken)
    });
} else {
    skipped("Testes autenticados de administrador", "VPS_AUDIT_ADMIN_TOKEN não informado");
}

await expectStatus("Health do processo", "/api/health", 200);
await expectStatus("Readiness do MongoDB", "/api/ready", 200);
await expectStatus("Rota de teste ausente em produção", "/api/test", 404);

const failures = results.filter(result => result.status === "fail");
const skippedChecks = results.filter(result => result.status === "skip");
console.log(`\nAuditoria concluída em ${baseUrl}`);
console.log(`${results.length - failures.length - skippedChecks.length} aprovado(s), ${failures.length} falha(s), ${skippedChecks.length} ignorado(s).`);

if (requireAuthenticatedChecks && (!adminToken || !clientToken)) {
    console.error("Falha: --require-auth exige VPS_AUDIT_ADMIN_TOKEN e VPS_AUDIT_CLIENT_TOKEN.");
    process.exitCode = 1;
} else if (failures.length > 0) {
    process.exitCode = 1;
}

async function checkHiddenSource(path, fingerprints) {
    const response = await request(path);
    if (!response) return;
    const body = await response.text();
    const exposedFingerprint = fingerprints.find(value => body.toLowerCase().includes(value.toLowerCase()));
    const protectedStatus = response.status === 403 || response.status === 404;
    if (protectedStatus || !exposedFingerprint) {
        passed(`Fonte não exposta: ${path}`, `${response.status}${response.status === 200 ? " (fallback sem conteúdo sensível)" : ""}`);
        return;
    }
    failed(`Fonte não exposta: ${path}`, `${response.status}; conteúdo reconhecível encontrado`);
}

async function expectStatus(name, path, expected, init = {}) {
    const response = await request(path, init);
    if (!response) return;
    if (response.status === expected) passed(name, String(response.status));
    else failed(name, `esperado ${expected}, recebido ${response.status}`);
}

async function request(path, init = {}) {
    try {
        return await fetch(`${baseUrl}${path}`, {
            redirect: "follow",
            signal: AbortSignal.timeout(TIMEOUT_MS),
            ...init
        });
    } catch (error) {
        failed(`Requisição ${path}`, error instanceof Error ? error.message : "erro desconhecido");
        return undefined;
    }
}

function authorization(token) {
    return { Authorization: `Bearer ${token}` };
}

function normalizedBaseUrl(value) {
    let url;
    try {
        url = new URL(value);
    } catch {
        throw new Error(`URL de auditoria inválida: ${value}`);
    }
    if (url.protocol !== "https:" && !isLocalhost(url.hostname)) {
        throw new Error("A auditoria exige HTTPS, exceto para localhost.");
    }
    return url.toString().replace(/\/$/, "");
}

function isLocalhost(hostname) {
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

function passed(name, detail) {
    results.push({ status: "pass", name });
    console.log(`✓ ${name} (${detail})`);
}

function failed(name, detail) {
    results.push({ status: "fail", name });
    console.error(`✗ ${name}: ${detail}`);
}

function skipped(name, detail) {
    results.push({ status: "skip", name });
    console.log(`- ${name}: ignorado (${detail})`);
}
