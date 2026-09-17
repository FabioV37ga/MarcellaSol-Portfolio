import test from "node:test";
import assert from "node:assert/strict";
import { GoogleDriveClientProvider } from "../dist/src/services/google-drive-client.js";

const validEnvironment = new Map([
    ["GOOGLE_OAUTH_CLIENT_ID", " client-id "],
    ["GOOGLE_OAUTH_CLIENT_SECRET", " client-secret "],
    ["GOOGLE_OAUTH_REFRESH_TOKEN", " refresh-token "],
    ["GOOGLE_OAUTH_REDIRECT_URI", " https://example.com/oauth "]
]);

test("cliente Google Drive é autenticado e criado somente uma vez", () => {
    const clients = [];
    const provider = new GoogleDriveClientProvider(
        name => validEnvironment.get(name),
        auth => {
            const client = { marker: clients.length + 1 };
            clients.push({ auth, client });
            return client;
        }
    );

    const first = provider.get();
    const second = provider.get();

    assert.equal(first, second);
    assert.equal(clients.length, 1);
    assert.equal(clients[0].auth.credentials.refresh_token, "refresh-token");
});

test("configuração obrigatória é validada antes de criar o cliente", () => {
    let factoryCalls = 0;
    const provider = new GoogleDriveClientProvider(
        name => name === "GOOGLE_OAUTH_CLIENT_ID" ? "client-id" : undefined,
        () => {
            factoryCalls += 1;
            return {};
        }
    );

    assert.throws(() => provider.get(), /GOOGLE_OAUTH_CLIENT_SECRET/);
    assert.equal(factoryCalls, 0);
});
