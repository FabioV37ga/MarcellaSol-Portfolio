import "dotenv/config";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import mongoose from "mongoose";

interface ViewFile {
    _id: { $oid: string };
    viewName: string;
    permission: string;
    type: string;
    view: string;
}

interface StoredView {
    _id: mongoose.Types.ObjectId;
    viewName: string;
    permission: string;
    type: string;
    view: string;
}

const applyChanges = process.argv.includes("--apply");
const validateOnly = process.argv.includes("--validate-only");

function identity(view: Pick<ViewFile, "permission" | "viewName">): string {
    return `${view.permission.trim().toLowerCase()}:${view.viewName.trim().toLowerCase()}`;
}

function validateViewFile(value: unknown, filename: string): ViewFile {
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
    return candidate as ViewFile;
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
        return { filename, data: validateViewFile(parsed, filename) };
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
    return loaded;
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

    const operations: mongoose.mongo.AnyBulkWriteOperation<StoredView>[] = [];
    let unchanged = 0;
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
                type: data.type.trim(),
                view: data.view
            } } });
            console.log(`[CRIAR] ${key} <- ${filename}`);
            continue;
        }

        const changed = existing.viewName !== data.viewName.trim()
            || existing.permission !== data.permission.trim()
            || existing.type !== data.type.trim()
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
                type: data.type.trim(),
                view: data.view
            } }
        } });
        console.log(`[ATUALIZAR] ${key} <- ${filename}`);
    }

    if (!applyChanges) {
        console.log(`Conferência concluída: ${operations.length} alteração(ões), ${unchanged} sem mudança.`);
        console.log("Nenhum dado foi alterado. Execute novamente com --apply para sincronizar.");
        return;
    }
    if (operations.length === 0) {
        console.log(`Banco já sincronizado: ${unchanged} view(s) sem mudança.`);
        return;
    }

    const result = await collection.bulkWrite(operations, { ordered: true, maxTimeMS: 10_000 });
    console.log(`Sincronização concluída: ${result.insertedCount} criada(s), ${result.modifiedCount} atualizada(s).`);
}

main()
    .catch(error => {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
