import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";

const execute = promisify(execFile);
const script = path.resolve("dist/src/scripts/sync-database-views.js");
const fixtures = path.resolve("../dev/database");

async function validate(directory) {
    return execute(process.execPath, [script, "--validate-only", `--dir=${directory}`]);
}

async function fixtureCopy() {
    const directory = await mkdtemp(path.join(os.tmpdir(), "marcellasol-views-"));
    await cp(fixtures, directory, {
        recursive: true,
        filter: source => !path.extname(source) || source.endsWith("-view.json")
    });
    return directory;
}

test("valida o inventário completo das views", async () => {
    const result = await validate(fixtures);
    assert.match(result.stdout, /15 arquivo\(s\) de view válido\(s\)/);
});

test("rejeita nomes de view desconhecidos", async t => {
    const directory = await fixtureCopy();
    t.after(() => rm(directory, { recursive: true, force: true }));
    const filename = path.join(directory, "admin-home-view.json");
    const document = JSON.parse(await readFile(filename, "utf8"));
    document.viewName = "home-unknown";
    await writeFile(filename, JSON.stringify(document));

    await assert.rejects(validate(directory), error => {
        assert.match(error.stderr, /view desconhecida \(admin:home-unknown\)/);
        return true;
    });
});

test("rejeita HTML com mais de um elemento raiz", async t => {
    const directory = await fixtureCopy();
    t.after(() => rm(directory, { recursive: true, force: true }));
    const filename = path.join(directory, "admin-home-view.json");
    const document = JSON.parse(await readFile(filename, "utf8"));
    document.view = "<section></section><section></section>";
    await writeFile(filename, JSON.stringify(document));

    await assert.rejects(validate(directory), error => {
        assert.match(error.stderr, /exatamente um elemento HTML raiz/);
        return true;
    });
});
