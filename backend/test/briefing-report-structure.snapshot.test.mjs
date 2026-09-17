import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parse } from "parse5";
import { buildBriefingReportHtml } from "../dist/src/services/briefing-report.template.js";

function elements(node, predicate, found = []) {
    if (node?.tagName && predicate(node)) found.push(node);
    for (const child of node?.childNodes ?? []) elements(child, predicate, found);
    return found;
}

function attribute(node, name) {
    return node.attrs?.find(item => item.name === name)?.value ?? "";
}

function hasClass(node, className) {
    return attribute(node, "class").split(/\s+/).includes(className);
}

function textContent(node) {
    if (node.nodeName === "#text") return node.value;
    return (node.childNodes ?? []).map(textContent).join("").replace(/\s+/g, " ").trim();
}

function firstDescendantText(node, tagName) {
    return textContent(elements(node, child => child.tagName === tagName)[0]);
}

function reportStructure(html) {
    const document = parse(html);
    const title = elements(document, node => node.tagName === "title")[0];
    const cover = elements(document, node => node.tagName === "header" && hasClass(node, "cover"))[0];
    const people = elements(document, node => hasClass(node, "person-card"));
    const finishes = elements(document, node => hasClass(node, "report-surface-finishes"))[0];
    const finishRows = finishes
        ? elements(finishes, node => node.tagName === "tbody")
            .flatMap(body => elements(body, node => node.tagName === "tr"))
            .map(row => elements(row, node => node.tagName === "th" || node.tagName === "td").map(textContent))
        : [];

    return {
        language: attribute(elements(document, node => node.tagName === "html")[0], "lang"),
        title: textContent(title),
        cover: {
            project: firstDescendantText(cover, "h1"),
            client: firstDescendantText(cover, "h2"),
            metadata: elements(cover, node => hasClass(node, "cover-meta"))
                .flatMap(grid => elements(grid, node => node.tagName === "div" && !hasClass(node, "cover-meta")))
                .map(item => textContent(item))
        },
        chapters: elements(document, node => hasClass(node, "chapter-heading"))
            .map(node => firstDescendantText(node, "h1")),
        sections: elements(document, node => hasClass(node, "report-section"))
            .map(node => firstDescendantText(node, "h2")),
        people: people.map(person => ({
            role: firstDescendantText(person, "span"),
            name: firstDescendantText(person, "h3")
        })),
        surfaceFinishes: finishRows,
        roomIndex: elements(document, node => hasClass(node, "room-index"))
            .flatMap(node => elements(node, child => child.tagName === "li"))
            .map(textContent),
        rooms: elements(document, node => hasClass(node, "room"))
            .map(node => firstDescendantText(node, "h2"))
    };
}

test("estrutura do HTML do relatório permanece compatível durante a refatoração", async () => {
    const html = buildBriefingReportHtml({
        briefingDefinition: { user: { name: "Família Snapshot" } },
        responses: {
            project: {
                category: "residencial",
                type: "apartamento",
                name: "Projeto Snapshot",
                adultAmount: 1,
                childrenAmount: 1
            },
            submittedAt: "2026-09-17T12:00:00.000Z",
            sections: [{
                key: "about-property",
                title: "Sobre vocês e o imóvel — parte 1",
                answers: [
                    { key: "adult-1-name", question: "Nome completo do responsável 1", value: "Pessoa Adulta" },
                    { key: "adult-1-birth-date", question: "Data de nascimento", value: "1990-10-20" },
                    { key: "child-1-name", question: "Nome completo da criança 1", value: "Pessoa Criança" },
                    { key: "property-area", question: "Metragem aproximada", value: 80 }
                ]
            }, {
                key: "routine",
                title: "Rotina",
                answers: [{ key: "routine-description", question: "Como é a rotina?", value: "Tranquila" }]
            }, {
                key: "preferences-materials",
                title: "Preferências — texturas, materiais e referências",
                answers: [
                    { key: "surface-finish-cabinetry", question: "Marcenaria", value: "fosco" },
                    { key: "surface-finish-floor", question: "Pisos e revestimentos", value: "acetinado" }
                ]
            }],
            rooms: [{
                name: "Cozinha",
                type: "cozinha",
                sections: [{
                    key: "room-1",
                    title: "Cozinha",
                    answers: [{ key: "storage", question: "Armazenamento", value: "mantimentos" }]
                }]
            }]
        }
    }, {
        assetBaseUrl: "https://assets.example/briefing",
        generatedAt: new Date("2026-09-17T12:00:00.000Z")
    });
    const snapshot = JSON.parse(await readFile(
        new URL("fixtures/briefing-report-structure.snapshot.json", import.meta.url),
        "utf8"
    ));

    assert.deepEqual(reportStructure(html), snapshot);
});
