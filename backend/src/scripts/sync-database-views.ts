import "dotenv/config";
import { createHash } from "node:crypto";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import mongoose from "mongoose";
import { parseFragment, type ParserError } from "parse5";

type ViewType = "system" | "briefing" | "client" | "financial";

interface ViewFile {
    _id: { $oid: string };
    viewName: string;
    permission: string;
    type: ViewType;
    view: string;
}

interface StoredView {
    _id: mongoose.Types.ObjectId;
    viewName: string;
    permission: string;
    type: ViewType;
    view: string;
}

interface SelectorSource {
    file: string;
    functionName?: string;
    idsOnly?: boolean;
}

const knownViews = new Map<string, ViewType>([
    ["admin:base", "system"],
    ["admin:home", "system"],
    ["admin:client", "system"],
    ["admin:new-client", "system"],
    ["admin:client-management", "client"],
    ["admin:client-proposals", "system"],
    ["admin:client-financial", "financial"],
    ["admin:briefing-home", "briefing"],
    ["admin:briefing-investment", "briefing"],
    ["admin:briefing-rooms", "briefing"],
    ["admin:briefing-added-room", "briefing"],
    ["client:base", "system"],
    ["client:home", "system"],
    ["client:stages-approvals", "system"],
    ["client:financial", "financial"]
]);
const uniqueIndexName = "views_permission_viewName_unique";

// Apenas associa módulos às views. Os selectors são extraídos do TypeScript,
// portanto IDs e classes não ficam duplicados neste script.
const selectorSources = new Map<string, SelectorSource[]>([
    ["admin:base", [{ file: "src/admin/selectors/base.selector.ts" }]],
    ["admin:home", [{ file: "src/admin/selectors/home.selector.ts" }]],
    ["admin:client", [{ file: "src/admin/selectors/clients.selector.ts" }]],
    ["admin:new-client", [{ file: "src/admin/selectors/new-client.selector.ts" }]],
    ["admin:client-management", [{ file: "src/admin/selectors/client-management.selector.ts" }]],
    ["admin:client-proposals", [{ file: "src/admin/modules/admin-client-proposals.module.ts", idsOnly: true }]],
    ["admin:client-financial", [
        { file: "src/admin/selectors/client-financial.selector.ts" },
        { file: "src/admin/ui/client-financial-manager.ts", idsOnly: true }
    ]],
    ["admin:briefing-home", [{ file: "src/admin/selectors/newClient/briefing.selector.ts", functionName: "getBriefingHome" }]],
    ["admin:briefing-investment", [{ file: "src/admin/selectors/newClient/briefing.selector.ts", functionName: "getBriefingInvestment" }]],
    ["admin:briefing-rooms", [{ file: "src/admin/selectors/newClient/briefing.selector.ts", functionName: "getBriefingRooms" }]],
    ["admin:briefing-added-room", []],
    ["client:base", [{ file: "src/client/selectors/base.selector.ts" }]],
    ["client:home", [{ file: "src/client/selectors/home.selector.ts" }]],
    ["client:stages-approvals", [{ file: "src/client/selectors/stages-approvals.selector.ts" }]],
    ["client:financial", [{ file: "src/client/selectors/financial.selector.ts" }]]
]);

const applyChanges = process.argv.includes("--apply");
const validateOnly = process.argv.includes("--validate-only");

function identity(view: Pick<ViewFile, "permission" | "viewName">): string {
    return `${view.permission.trim().toLowerCase()}:${view.viewName.trim().toLowerCase()}`;
}

function checksum(view: Pick<ViewFile, "permission" | "viewName" | "type" | "view">): string {
    return createHash("sha256").update(JSON.stringify({
        permission: view.permission.trim(),
        viewName: view.viewName.trim(),
        type: view.type?.trim() ?? "",
        view: view.view
    })).digest("hex");
}

function validateHtml(html: string, filename: string, selectors: string[]): void {
    const errors: ParserError[] = [];
    const fragment = parseFragment(html, { onParseError: error => errors.push(error) });
    if (errors.length > 0) {
        const details = errors
            .slice(0, 3)
            .map(error => `${error.code} (${error.startLine}:${error.startCol})`)
            .join(", ");
        throw new Error(`${filename}: HTML inválido: ${details}.`);
    }
    const roots = fragment.childNodes.filter(node => node.nodeName !== "#text" && node.nodeName !== "#comment");
    if (roots.length !== 1) {
        throw new Error(`${filename}: view deve possuir exatamente um elemento HTML raiz; encontrados ${roots.length}.`);
    }
    validateSelectorTokens(fragment as HtmlNode, selectors, filename);
}

interface HtmlNode {
    attrs?: Array<{ name: string; value: string }>;
    childNodes?: HtmlNode[];
}

function validateSelectorTokens(root: HtmlNode, selectors: string[], filename: string): void {
    const ids = new Set<string>();
    const classes = new Set<string>();
    const visit = (node: HtmlNode): void => {
        for (const attribute of node.attrs ?? []) {
            if (attribute.name === "id") ids.add(attribute.value);
            if (attribute.name === "class") attribute.value.split(/\s+/).filter(Boolean).forEach(value => classes.add(value));
        }
        (node.childNodes ?? []).forEach(visit);
    };
    visit(root);

    const missing = selectors.filter(selector => {
        const token = selector.slice(1);
        return selector.startsWith("#") ? !ids.has(token) : !classes.has(token);
    });
    if (missing.length > 0) {
        throw new Error(`${filename}: selectors ausentes no HTML: ${missing.join(", ")}.`);
    }
}

function validateViewFile(value: unknown, filename: string, selectors: string[]): ViewFile {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new Error(`${filename}: o conteúdo deve ser um objeto JSON.`);
    }
    const candidate = value as Partial<ViewFile>;
    const objectId = candidate._id?.$oid;
    if (typeof objectId !== "string" || !mongoose.isValidObjectId(objectId)) {
        throw new Error(`${filename}: _id.$oid inválido.`);
    }
    for (const field of ["viewName", "permission", "type", "view"] as const) {
        if (typeof candidate[field] !== "string" || !candidate[field]!.trim()) {
            throw new Error(`${filename}: ${field} é obrigatório.`);
        }
    }
    const view = candidate as ViewFile;
    const key = identity(view);
    const expectedType = knownViews.get(key);
    if (!expectedType) {
        throw new Error(`${filename}: view desconhecida (${key}).`);
    }
    if (view.type.trim() !== expectedType) {
        throw new Error(`${filename}: type inválido para ${key}; esperado "${expectedType}".`);
    }
    validateHtml(view.view, filename, selectors);
    return view;
}

async function databaseDirectory(): Promise<string> {
    const explicitDirectory = process.argv.find(argument => argument.startsWith("--dir="))?.slice(6);
    const candidates = explicitDirectory
        ? [path.resolve(explicitDirectory)]
        : [path.resolve(process.cwd(), "dev/database"), path.resolve(process.cwd(), "../dev/database")];

    for (const candidate of candidates) {
        try {
            await access(candidate);
            return candidate;
        } catch {
            // Tenta o próximo caminho compatível com execução pela raiz ou por backend/.
        }
    }
    throw new Error("Diretório dev/database não encontrado. Use --dir=<caminho>.");
}

async function loadFiles(directory: string): Promise<Array<{ filename: string; data: ViewFile }>> {
    const requirements = await loadSelectorRequirements();
    const filenames = (await readdir(directory))
        .filter(filename => filename.endsWith("-view.json"))
        .sort((left, right) => left.localeCompare(right));
    if (filenames.length === 0) throw new Error(`Nenhum arquivo *-view.json encontrado em ${directory}.`);

    const loaded = await Promise.all(filenames.map(async filename => {
        const source = await readFile(path.join(directory, filename), "utf8");
        let parsed: unknown;
        try {
            parsed = JSON.parse(source);
        } catch {
            throw new Error(`${filename}: JSON inválido.`);
        }
        const candidate = parsed as Partial<ViewFile>;
        const key = typeof candidate.permission === "string" && typeof candidate.viewName === "string"
            ? `${candidate.permission.trim().toLowerCase()}:${candidate.viewName.trim().toLowerCase()}`
            : "";
        return { filename, data: validateViewFile(parsed, filename, requirements.get(key) ?? []) };
    }));

    const identities = new Set<string>();
    const objectIds = new Set<string>();
    for (const { filename, data } of loaded) {
        const key = identity(data);
        if (identities.has(key)) throw new Error(`${filename}: permission + viewName duplicados (${key}).`);
        if (objectIds.has(data._id.$oid)) throw new Error(`${filename}: _id duplicado (${data._id.$oid}).`);
        identities.add(key);
        objectIds.add(data._id.$oid);
    }
    const missing = Array.from(knownViews.keys()).filter(key => !identities.has(key));
    if (missing.length > 0) {
        throw new Error(`Views obrigatórias ausentes em dev/database: ${missing.join(", ")}.`);
    }
    return loaded;
}

async function loadSelectorRequirements(): Promise<Map<string, string[]>> {
    const candidates = [path.resolve(process.cwd(), "frontend"), path.resolve(process.cwd(), "../frontend")];
    let frontendRoot: string | undefined;
    for (const candidate of candidates) {
        try {
            await access(path.join(candidate, "src"));
            frontendRoot = candidate;
            break;
        } catch {
            // Compatível com execução pela raiz ou por backend/.
        }
    }
    if (!frontendRoot) throw new Error("Diretório frontend/src não encontrado.");
    const missingMappings = [...knownViews.keys()].filter(key => !selectorSources.has(key));
    if (missingMappings.length > 0) {
        throw new Error(`Mapeamento de selectors ausente para: ${missingMappings.join(", ")}.`);
    }
    const requirements = new Map<string, string[]>();
    for (const [viewIdentity, sources] of selectorSources) {
        const selectors = new Set<string>();
        for (const source of sources) {
            const filename = path.join(frontendRoot, source.file);
            const code = source.functionName
                ? functionSource(await readFile(filename, "utf8"), source.functionName, source.file)
                : await readFile(filename, "utf8");
            extractSelectors(code)
                .filter(selector => !source.idsOnly || selector.startsWith("#"))
                .forEach(selector => selectors.add(selector));
        }
        requirements.set(viewIdentity, [...selectors].sort());
    }
    return requirements;
}

function functionSource(code: string, functionName: string, filename: string): string {
    const start = code.indexOf(`function ${functionName}`);
    if (start < 0) throw new Error(`${filename}: função ${functionName} não encontrada.`);
    const nextFunction = code.indexOf("\nfunction ", start + 1);
    const nextInterface = code.indexOf("\ninterface ", start + 1);
    const candidates = [nextFunction, nextInterface].filter(index => index >= 0);
    return code.slice(start, candidates.length > 0 ? Math.min(...candidates) : code.length);
}

function extractSelectors(code: string): string[] {
    const selectors = new Set<string>();
    const callPatterns = [
        /\bu\s*\(\s*["'`]([^"'`]+)["'`]/g,
        /\brequiredElement(?:<[^>]+>)?\s*\(\s*["'`]([^"'`]+)["'`]/g,
        /\brequired(?:<[^>]+>)?\s*\([^,]+,\s*["'`]([^"'`]+)["'`]/g,
        /\.querySelector(?:All)?(?:<[^>]+>)?\s*\(\s*["'`]([^"'`]+)["'`]/g
    ];
    for (const pattern of callPatterns) {
        for (const match of code.matchAll(pattern)) {
            for (const token of match[1].match(/#[A-Za-z][\w-]*|\.[A-Za-z][\w-]*/g) ?? []) selectors.add(token);
        }
    }
    return [...selectors];
}

async function main(): Promise<void> {
    const directory = await databaseDirectory();
    const files = await loadFiles(directory);
    if (validateOnly) {
        console.log(`Validação concluída: ${files.length} arquivo(s) de view válido(s).`);
        return;
    }

    const uri = process.env.DB_CONNECTION_STRING?.trim();
    if (!uri) throw new Error("DB_CONNECTION_STRING não está configurada.");
    await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10_000,
        connectTimeoutMS: 10_000,
        socketTimeoutMS: 10_000
    });

    const collection = mongoose.connection.collection<StoredView>("views");
    const stored = await collection.find({}).maxTimeMS(10_000).toArray();
    const storedByIdentity = new Map<string, StoredView[]>();
    const storedById = new Map(stored.map(view => [view._id.toString(), view]));
    for (const view of stored) {
        const key = identity(view);
        storedByIdentity.set(key, [...(storedByIdentity.get(key) ?? []), view]);
    }
    const duplicatedStoredViews = Array.from(storedByIdentity.entries())
        .filter(([, matches]) => matches.length > 1)
        .map(([key, matches]) => `${key} (${matches.length})`);
    if (duplicatedStoredViews.length > 0) {
        throw new Error(`Views duplicadas no banco: ${duplicatedStoredViews.join(", ")}.`);
    }

    const operations: mongoose.mongo.AnyBulkWriteOperation<StoredView>[] = [];
    let unchanged = 0;
    const localIdentities = new Set(files.map(({ data }) => identity(data)));
    for (const { filename, data } of files) {
        const key = identity(data);
        const matches = storedByIdentity.get(key) ?? [];
        if (matches.length > 1) throw new Error(`${filename}: existem ${matches.length} views no banco para ${key}.`);

        const existing = matches[0];
        if (!existing) {
            const idCollision = storedById.get(data._id.$oid);
            if (idCollision) {
                throw new Error(`${filename}: o _id já pertence a ${identity(idCollision)} no banco.`);
            }
            operations.push({ insertOne: { document: {
                _id: new mongoose.Types.ObjectId(data._id.$oid),
                viewName: data.viewName.trim(),
                permission: data.permission.trim(),
                type: data.type,
                view: data.view
            } } });
            console.log(`[CRIAR] ${key} <- ${filename}`);
            continue;
        }

        const changed = existing.viewName !== data.viewName.trim()
            || existing.permission !== data.permission.trim()
            || existing.type !== data.type
            || existing.view !== data.view;
        if (!changed) {
            unchanged += 1;
            console.log(`[IGUAL] ${key}`);
            continue;
        }
        operations.push({ updateOne: {
            filter: { _id: existing._id },
            update: { $set: {
                viewName: data.viewName.trim(),
                permission: data.permission.trim(),
                type: data.type,
                view: data.view
            } }
        } });
        console.log(`[ATUALIZAR] ${key} <- ${filename} (${checksum(existing).slice(0, 12)} → ${checksum(data).slice(0, 12)})`);
    }

    const extraStoredViews = stored.filter(view => !localIdentities.has(identity(view)));
    extraStoredViews.forEach(view => console.log(`[EXTRA NO BANCO] ${identity(view)} (${view._id})`));
    const indexes = await collection.indexes();
    const hasUniqueIdentityIndex = indexes.some(index => index.unique === true
        && index.key.permission === 1
        && index.key.viewName === 1
        && index.collation?.strength === 2);
    if (!hasUniqueIdentityIndex) console.log(`[ÍNDICE AUSENTE] ${uniqueIndexName}`);

    if (!applyChanges) {
        console.log(`Conferência concluída: ${operations.length} alteração(ões), ${extraStoredViews.length} extra(s), ${unchanged} sem mudança.`);
        console.log("Nenhum dado foi alterado. Execute novamente com --apply para sincronizar.");
        return;
    }
    let insertedCount = 0;
    let modifiedCount = 0;
    if (operations.length > 0) {
        const result = await collection.bulkWrite(operations, { ordered: true, maxTimeMS: 10_000 });
        insertedCount = result.insertedCount;
        modifiedCount = result.modifiedCount;
    }
    if (!hasUniqueIdentityIndex) {
        await collection.createIndex(
            { permission: 1, viewName: 1 },
            { name: uniqueIndexName, unique: true, collation: { locale: "en", strength: 2 } }
        );
    }
    console.log(`Sincronização concluída: ${insertedCount} criada(s), ${modifiedCount} atualizada(s), índice único verificado.`);
}

main()
    .catch(error => {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
