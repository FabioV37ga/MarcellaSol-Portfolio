import assert from "node:assert/strict";
import test from "node:test";
import { mapBriefingReport } from "../dist/src/services/briefing-report.mapper.js";

test("mapper produz um view model seguro para documento incompleto", () => {
    assert.deepEqual(mapBriefingReport({}), {
        clientName: "Cliente",
        project: {
            category: undefined,
            type: undefined,
            name: undefined,
            adultAmount: undefined,
            childrenAmount: undefined
        },
        sections: [],
        rooms: [],
        submittedAt: undefined
    });
});

test("mapper converte residentAmount legado em adultos sem duplicar crianças", () => {
    const submittedAt = new Date("2026-09-17T12:00:00.000Z");
    const sections = [{ key: "routine", answers: [] }];
    const rooms = [{ name: "Cozinha", sections: [] }];

    assert.deepEqual(mapBriefingReport({
        briefingDefinition: {
            user: { name: "Cliente legado" },
            description: { name: "Definição antiga", residentAmount: 2 }
        },
        responses: {
            project: {
                category: "residencial",
                type: "apartamento",
                name: "Resposta persistida",
                residentAmount: 3
            },
            sections,
            rooms
        },
        submittedAt
    }), {
        clientName: "Cliente legado",
        project: {
            category: "residencial",
            type: "apartamento",
            name: "Resposta persistida",
            adultAmount: 3,
            childrenAmount: 0
        },
        sections,
        rooms,
        submittedAt: "2026-09-17T12:00:00.000Z"
    });
});

test("mapper preserva as quantidades atuais e a data de envio das respostas", () => {
    const mapped = mapBriefingReport({
        briefingDefinition: {
            user: { name: "  " },
            description: { residentAmount: 5 }
        },
        responses: {
            project: { adultAmount: 2, childrenAmount: 1 },
            submittedAt: "2026-09-18T10:00:00.000Z"
        },
        submittedAt: { $date: "2026-09-17T12:00:00.000Z" }
    });

    assert.equal(mapped.clientName, "Cliente");
    assert.equal(mapped.project.adultAmount, 2);
    assert.equal(mapped.project.childrenAmount, 1);
    assert.equal(mapped.submittedAt, "2026-09-18T10:00:00.000Z");
});
