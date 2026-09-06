import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import { proposalStatuses } from "../dist/src/models/clientProposal.js";
import { projectStageKeys, projectStageStatuses } from "../dist/src/models/projectStage.js";

async function sourceFile(relativePath) {
    const filename = path.resolve("../frontend/src", relativePath);
    const source = await readFile(filename, "utf8");
    return ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

function objectKeys(file, variableName) {
    for (const statement of file.statements) {
        if (!ts.isVariableStatement(statement)) continue;
        for (const declaration of statement.declarationList.declarations) {
            if (!ts.isIdentifier(declaration.name) || declaration.name.text !== variableName
                || !declaration.initializer) continue;
            let initializer = declaration.initializer;
            while (ts.isAsExpression(initializer) || ts.isSatisfiesExpression(initializer)
                || ts.isParenthesizedExpression(initializer)) {
                initializer = initializer.expression;
            }
            if (!ts.isObjectLiteralExpression(initializer)) continue;
            return initializer.properties.map(property => {
                if (!property.name) return undefined;
                if (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)) return property.name.text;
                return undefined;
            }).filter(Boolean);
        }
    }
    throw new Error(`Contrato ${variableName} não encontrado em ${file.fileName}`);
}

function stringUnion(file, typeName) {
    const declaration = file.statements.find(statement =>
        ts.isTypeAliasDeclaration(statement) && statement.name.text === typeName
    );
    if (!declaration || !ts.isTypeAliasDeclaration(declaration) || !ts.isUnionTypeNode(declaration.type)) {
        throw new Error(`Contrato ${typeName} não encontrado em ${file.fileName}`);
    }
    return declaration.type.types.map(type => {
        if (!ts.isLiteralTypeNode(type) || !ts.isStringLiteral(type.literal)) {
            throw new Error(`${typeName} deve conter apenas strings literais`);
        }
        return type.literal.text;
    });
}

test("etapas e status são compatíveis entre backend e frontend", async () => {
    const frontend = await sourceFile("shared/project-stages.ts");
    assert.deepEqual(objectKeys(frontend, "projectStageLabels"), [...projectStageKeys]);
    assert.deepEqual(objectKeys(frontend, "projectStageStatusLabels"), [...projectStageStatuses]);
});

test("status de proposta são compatíveis entre backend e frontends", async () => {
    const admin = await sourceFile("admin/infrastructure/admin-system.api.ts");
    const client = await sourceFile("client/infrastructure/client-system.api.ts");
    assert.deepEqual(stringUnion(admin, "ProposalStatus"), [...proposalStatuses]);
    assert.deepEqual(stringUnion(client, "ClientProposalStatus"), [...proposalStatuses]);
});
