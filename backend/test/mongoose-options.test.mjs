import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const repositoryFiles = [
    "client-briefing.repository.ts",
    "client.repository.ts",
    "client-proposal.repository.ts",
    "client-payment.repository.ts"
];

test("mutações Mongoose usam a opção atual para devolver o documento atualizado", async () => {
    const sources = await Promise.all(repositoryFiles.map(file =>
        readFile(path.resolve("src/repositories", file), "utf8")
    ));

    for (const [index, source] of sources.entries()) {
        assert.doesNotMatch(
            source,
            /\bnew\s*:\s*(?:true|false)\b/,
            `${repositoryFiles[index]} ainda usa a opção depreciada new`
        );
    }

    assert.ok(
        sources.some(source => source.includes('returnDocument: "after"')),
        "os repositórios devem solicitar explicitamente o documento posterior à mutação"
    );
});
