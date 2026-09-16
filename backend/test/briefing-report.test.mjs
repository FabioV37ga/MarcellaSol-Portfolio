import test from "node:test";
import assert from "node:assert/strict";
import { buildBriefingReportHtml } from "../dist/src/services/briefing-report.js";

test("relatório apresenta quantidades e dados dos adultos e crianças", () => {
    const html = buildBriefingReportHtml({
        briefingDefinition: { user: { name: "Família Teste" } },
        responses: {
            project: {
                category: "residencial",
                type: "apartamento",
                name: "Projeto Família",
                adultAmount: 2,
                childrenAmount: 1
            },
            sections: [{
                key: "about-property",
                title: "Sobre vocês e o imóvel",
                answers: [
                    { key: "adult-1-name", question: "Nome completo do responsável 1", value: "Pessoa Adulta" },
                    { key: "adult-1-birth-date", question: "Data de nascimento", value: "1990-10-20" },
                    { key: "adult-1-height", question: "Altura", value: 175 },
                    { key: "adult-1-mail", question: "E-mail", value: "adulto@example.com" },
                    { key: "adult-1-phone", question: "Telefone", value: "+55 11 99999-9999" },
                    { key: "child-1-name", question: "Nome completo da criança 1", value: "Pessoa Criança" },
                    { key: "child-1-birth-date", question: "Data de nascimento", value: "2020-09-16" },
                    { key: "child-1-height", question: "Altura", value: 120 },
                    { key: "property-address", question: "Endereço completo do imóvel", value: "Rua Teste, 10" }
                ]
            }],
            rooms: []
        },
        submittedAt: new Date("2026-09-16T12:00:00.000Z")
    }, { generatedAt: new Date("2026-09-16T12:00:00.000Z") });

    assert.match(html, /<span>Adultos<\/span><strong>2<\/strong>/);
    assert.match(html, /<span>Crianças<\/span><strong>1<\/strong>/);
    assert.match(html, /class="person-card"/);
    assert.match(html, /Responsável 1/);
    assert.match(html, /Pessoa Adulta/);
    assert.match(html, /Criança 1/);
    assert.match(html, /Pessoa Criança/);
    assert.match(html, /20\/10\/1990 \(35 anos\)/);
    assert.match(html, /16\/09\/2020 \(6 anos\)/);
    assert.match(html, /175 cm/);
    assert.match(html, /adulto@example.com/);
    assert.match(html, /Outras informações sobre vocês e o imóvel/);
    assert.match(html, /Rua Teste, 10/);
    assert.doesNotMatch(html, /Pessoa Adulta<span class="answer-separator">/);
});
