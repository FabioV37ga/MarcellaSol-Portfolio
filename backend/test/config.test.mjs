import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
    applicationConfigFromEnvironment,
    loadApplicationConfig
} from "../dist/src/config/application-config.js";

const validEnvironment = {
    DB_CONNECTION_STRING: "mongodb://localhost:27017/test",
    AUTH_TOKEN_SECRET: "test-only-session-secret-with-at-least-32-characters",
    PIX_RECEIVER_KEY: "configured@example.com",
    PIX_RECEIVER_NAME: "CONFIGURED RECEIVER",
    PIX_RECEIVER_CITY: "SAO PAULO",
    PORT: "3456",
    TRUST_PROXY_HOPS: "1",
    NODE_ENV: "production"
};

test("configuração obrigatória do Pix é validada sem fallback", () => {
    const config = applicationConfigFromEnvironment({ ...validEnvironment });
    assert.deepEqual(config.pixReceiver, {
        key: "configured@example.com",
        name: "CONFIGURED RECEIVER",
        city: "SAO PAULO"
    });
    assert.equal(config.port, 3456);
    assert.equal(config.trustProxyHops, 1);
    assert.equal(config.isProduction, true);

    assert.throws(
        () => applicationConfigFromEnvironment({ ...validEnvironment, PIX_RECEIVER_KEY: "" }),
        /PIX_RECEIVER_KEY deve ser configurado/
    );
});

test("arquivo .env é carregado antes da composição da aplicação", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "marcellasol-config-"));
    const backendDirectory = path.join(root, "backend");
    await mkdir(backendDirectory);
    await writeFile(path.join(backendDirectory, ".env"), Object.entries(validEnvironment)
        .map(([name, value]) => `${name}=${value}`)
        .join("\n"));

    const environment = {};
    const config = loadApplicationConfig({ cwd: root, environment });
    assert.equal(config.pixReceiver.key, "configured@example.com");
    assert.equal(environment.PIX_RECEIVER_KEY, "configured@example.com");
    assert.equal(config.environmentPath, path.join(backendDirectory, ".env"));
});

test("configuração injetada pelo processo dispensa arquivo .env", () => {
    const config = loadApplicationConfig({
        cwd: path.join(tmpdir(), "diretorio-sem-env"),
        environment: { ...validEnvironment, PIX_RECEIVER_KEY: "process@example.com" }
    });

    assert.equal(config.pixReceiver.key, "process@example.com");
    assert.equal(config.environmentPath, "variáveis do processo");
});
