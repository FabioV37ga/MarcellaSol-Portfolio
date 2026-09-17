import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import puppeteer from "puppeteer";
import {
    mapBriefingReport,
    type BriefingAnswer,
    type BriefingReportDocument,
    type BriefingReportViewModel,
    type BriefingRoom,
    type BriefingSection
} from "./briefing-report.mapper.js";

export type { BriefingReportDocument } from "./briefing-report.mapper.js";

export interface BriefingReportOptions {
    assetBaseUrl?: string;
    temporaryDirectory?: string;
    generatedAt?: Date;
}

const visualOptions: Record<string, { label: string; image: string }> = {
    "contemporaneo-brasileiro": { label: "Contemporâneo brasileiro", image: "styles/contemporaneo-brasileiro.png" },
    japandi: { label: "Japandi", image: "styles/japandi.png" },
    rustico: { label: "Rústico", image: "styles/rustico.png" },
    moderno: { label: "Moderno", image: "styles/moderno.png" },
    industrial: { label: "Industrial", image: "styles/industrial.png" },
    boho: { label: "Boho", image: "styles/boho.png" },
    "neutros-quentes": { label: "Neutros quentes", image: "palettes/neutros-quentes.png" },
    "neutros-frios": { label: "Neutros frios", image: "palettes/neutros-frios.png" },
    "tons-terrosos-naturais": { label: "Tons terrosos e naturais", image: "palettes/tons-terrosos.png" },
    "cores-suaves": { label: "Cores suaves", image: "palettes/cores-suaves.png" },
    "cores-profundas": { label: "Cores profundas", image: "palettes/cores-profundas.png" },
    "mistura-equilibrada": { label: "Mistura equilibrada de formas", image: "shapes/mistura-equilibrada.png" },
    retas: { label: "Linhas retas", image: "shapes/retas.png" },
    curvas: { label: "Linhas curvas", image: "shapes/curvas.png" },
    "curvas-em-destaque": { label: "Curvas em destaque", image: "shapes/curvas-em-destaque.png" },
    "palhinha-fibra-natural": { label: "Palhinha e fibra natural", image: "elements/palhinha-fibra-natural.png" },
    "marcenaria-curva": { label: "Marcenaria curva", image: "elements/marcenaria-curva.png" },
    "paineis-lisos": { label: "Painéis lisos", image: "elements/paineis-lisos.png" },
    cama: { label: "Cama", image: "bedroom/cama.png" },
    tv: { label: "TV", image: "bedroom/tv.png" },
    "guarda-roupa": { label: "Guarda-roupa", image: "bedroom/guarda-roupa.png" },
    "estar-descanso": { label: "Estar e descanso", image: "balcony/estar-descanso.png" },
    "churrasco-gourmet": { label: "Churrasco e espaço gourmet", image: "balcony/churrasco-gourmet.png" }
};

for (const wood of ["1", "2", "3", "6", "7", "8", "9", "10"]) {
    visualOptions[`madeira-${wood}`] = { label: `Madeira ${wood}`, image: `woods/madeira-${wood}.png` };
}

function escapeHtml(value: unknown): string {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function humanize(value: string): string {
    const labels: Record<string, string> = {
        sim: "Sim", nao: "Não", propria: "Própria", preco: "Preço", qualidade: "Qualidade", tempo: "Tempo", "sem-preferencia": "N/A", "em-construcao": "Em construção",
        "mais-5-anos": "Mais de 5 anos", "ate-250-mil": "Até R$ 250 mil",
        "a-definir": "A definir", "apenas-refeicoes": "Apenas refeições",
        "uso-compartilhado": "Uso compartilhado", multiuso: "Multiuso"
    };
    return labels[value] ?? value.split("-").map(word => word ? word[0].toUpperCase() + word.slice(1) : "").join(" ");
}

function displayString(value: string): string {
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) ? humanize(value) : value;
}

function meaningful(value: unknown): boolean {
    if (value === undefined || value === null || value === "") return false;
    if (Array.isArray(value)) return value.some(item => item !== "nao-considerar" && meaningful(item));
    return true;
}

function renderText(value: string): string {
    const parts = value.trim().split(/(https?:\/\/[^\s]+)/gi);
    return parts.map(part => {
        if (/^https?:\/\//i.test(part)) {
            return `<a href="${escapeHtml(part)}" target="_blank" rel="noopener noreferrer">[link]</a>`;
        }
        return escapeHtml(part).replace(/\n/g, "<br>");
    }).join("");
}

function renderFile(value: Record<string, unknown>): string {
    const driveFile = value.driveFile as Record<string, unknown> | undefined;
    const name = String(driveFile?.name ?? value.name ?? "Imagem anexada");
    const id = typeof driveFile?.id === "string" ? driveFile.id : undefined;
    const link = typeof driveFile?.webViewLink === "string" ? driveFile.webViewLink : undefined;
    const localImageUrl = typeof driveFile?.localImageUrl === "string" ? driveFile.localImageUrl : undefined;
    const preview = localImageUrl;
    if (!preview && !link) return escapeHtml(name);
    return `<figure class="attachment">
        ${preview ? `<img src="${preview}" alt="${escapeHtml(name)}">` : ""}
        <figcaption>${escapeHtml(name)}${link ? ` · <a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">Abrir original</a>` : ""}</figcaption>
    </figure>`;
}

function renderValue(value: unknown): string {
    if (Array.isArray(value)) {
        const values = value.filter(item => item !== "nao-considerar" && meaningful(item));
        if (values.every(item => typeof item === "string")) {
            return `<ul>${values.map(item => `<li>${escapeHtml(displayString(String(item)))}</li>`).join("")}</ul>`;
        }
        return values.map(item => item && typeof item === "object" ? renderFile(item as Record<string, unknown>) : renderText(String(item))).join("");
    }
    if (typeof value === "string") return renderText(displayString(value));
    if (typeof value === "number") return escapeHtml(value);
    if (value && typeof value === "object") return renderFile(value as Record<string, unknown>);
    return escapeHtml(value);
}

function renderBirthDate(value: unknown, generatedAt: Date): string {
    if (typeof value !== "string") return renderValue(value);
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return renderValue(value);
    const [, yearText, monthText, dayText] = match;
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    const birthDate = new Date(Date.UTC(year, month - 1, day));
    if (birthDate.getUTCFullYear() !== year || birthDate.getUTCMonth() !== month - 1 || birthDate.getUTCDate() !== day) {
        return renderValue(value);
    }

    let age = generatedAt.getUTCFullYear() - year;
    const birthdayOccurred = generatedAt.getUTCMonth() > month - 1
        || (generatedAt.getUTCMonth() === month - 1 && generatedAt.getUTCDate() >= day);
    if (!birthdayOccurred) age -= 1;
    const formatted = `${dayText}/${monthText}/${yearText}`;
    return age >= 0 ? `${formatted} (${age} ${age === 1 ? "ano" : "anos"})` : formatted;
}

function collectSelectedVisuals(value: unknown, selected = new Set<string>()): Set<string> {
    if (Array.isArray(value)) {
        value.forEach(item => collectSelectedVisuals(item, selected));
    } else if (value && typeof value === "object") {
        Object.values(value).forEach(item => collectSelectedVisuals(item, selected));
    } else if (typeof value === "string" && visualOptions[value]) {
        selected.add(value);
    }
    return selected;
}

function renderVisualGallery(section: BriefingSection, assetBaseUrl: string): string {
    const selected = new Set<string>();
    for (const answer of section.answers ?? []) collectSelectedVisuals(answer.value, selected);
    if (selected.size === 0) return "";

    const figures = [...selected].map(key => {
        const option = visualOptions[key];
        const imageSource = resolveImageSource(assetBaseUrl, option.image);
        return `<figure><img src="${imageSource}" alt="${escapeHtml(option.label)}"><figcaption>${escapeHtml(option.label)}</figcaption></figure>`;
    }).join("");
    return `<div class="section-visuals"><h3>Referências selecionadas</h3><div class="visual-grid">${figures}</div></div>`;
}

type PersonField = "name" | "birth-date" | "height" | "phone" | "mail";

interface ReportPerson {
    kind: "adult" | "child";
    index: number;
    fields: Partial<Record<PersonField, unknown>>;
}

function personAnswer(answer: BriefingAnswer): { person: string; kind: "adult" | "child"; index: number; field: PersonField } | undefined {
    const match = /^(adult|child|resident)-(\d+)-(name|birth-date|height|phone|mail)$/.exec(answer.key ?? "");
    if (!match) return undefined;
    const [, rawKind, indexText, field] = match;
    const kind = rawKind === "child" ? "child" : "adult";
    return { person: `${kind}-${indexText}`, kind, index: Number(indexText), field: field as PersonField };
}

function renderAnswerGrid(answers: BriefingAnswer[], generatedAt: Date): string {
    const grouped = new Map<string, unknown[]>();
    for (const answer of answers) {
        if (!answer.question || !meaningful(answer.value)) continue;
        const values = grouped.get(answer.question) ?? [];
        values.push(answer.value);
        grouped.set(answer.question, values);
    }

    return [...grouped.entries()].map(([question, values]) => `
        <article class="answer">
            <h3>${escapeHtml(question.replace(/^\d+\.\s*/, ""))}</h3>
            <div>${values.map(value => question === "Data de nascimento"
                ? renderBirthDate(value, generatedAt)
                : renderValue(value)).join('<span class="answer-separator"> · </span>')}</div>
        </article>`).join("");
}

function renderSurfaceFinishesTable(answers: BriefingAnswer[]): string {
    const rows = answers.filter(answer =>
        answer.key?.startsWith("surface-finish-")
        && answer.question
        && meaningful(answer.value)
    );
    if (rows.length === 0) return "";

    return `<div class="report-surface-finishes">
        <h3>Preferências de acabamentos das superfícies</h3>
        <table>
            <thead><tr><th scope="col">Superfície</th><th scope="col">Acabamento</th></tr></thead>
            <tbody>${rows.map(answer => `<tr>
                <th scope="row">${escapeHtml(answer.question)}</th>
                <td>${renderValue(answer.value)}</td>
            </tr>`).join("")}</tbody>
        </table>
    </div>`;
}

function personDetail(label: string, value: unknown, formatter = renderValue): string {
    if (!meaningful(value)) return "";
    return `<div class="person-detail"><span>${escapeHtml(label)}</span><strong>${formatter(value)}</strong></div>`;
}

function renderPeopleSection(section: BriefingSection, generatedAt: Date): string {
    const people = new Map<string, ReportPerson>();
    const remainingAnswers: BriefingAnswer[] = [];
    for (const answer of section.answers ?? []) {
        const parsed = personAnswer(answer);
        if (!parsed) {
            remainingAnswers.push(answer);
            continue;
        }
        const person = people.get(parsed.person) ?? { kind: parsed.kind, index: parsed.index, fields: {} };
        person.fields[parsed.field] = answer.value;
        people.set(parsed.person, person);
    }

    const orderedPeople = [...people.values()].sort((left, right) => {
        if (left.kind !== right.kind) return left.kind === "adult" ? -1 : 1;
        return left.index - right.index;
    });
    const peopleHtml = orderedPeople.map(person => {
        const role = person.kind === "adult" ? `Responsável ${person.index}` : `Criança ${person.index}`;
        const name = meaningful(person.fields.name) ? renderValue(person.fields.name) : "Não informado";
        return `<article class="person-card">
            <header><span>${role}</span><h3>${name}</h3></header>
            <div class="person-details">
                ${personDetail("Data de nascimento / idade", person.fields["birth-date"], value => renderBirthDate(value, generatedAt))}
                ${personDetail("Altura", person.fields.height, value => `${renderValue(value)} cm`)}
                ${personDetail("E-mail", person.fields.mail)}
                ${personDetail("Telefone", person.fields.phone)}
            </div>
        </article>`;
    }).join("");
    const remaining = renderAnswerGrid(remainingAnswers, generatedAt);

    return `<section class="report-section people-section">
        <h2>${escapeHtml(section.title ?? "Sobre vocês e o imóvel")}</h2>
        ${peopleHtml ? `<div class="people-list">${peopleHtml}</div>` : ""}
        ${remaining ? `<div class="other-information"><h3>Outras informações sobre vocês e o imóvel</h3><div class="answer-grid">${remaining}</div></div>` : ""}
    </section>`;
}

function renderSection(section: BriefingSection, assetBaseUrl: string, generatedAt: Date, heading?: string): string {
    if (section.key === "about-property") return renderPeopleSection(section, generatedAt);
    const sectionAnswers = section.answers ?? [];
    const surfaceFinishes = renderSurfaceFinishesTable(sectionAnswers);
    const answers = renderAnswerGrid(
        sectionAnswers.filter(answer => !answer.key?.startsWith("surface-finish-")),
        generatedAt
    );
    if (!answers && !surfaceFinishes) return "";

    return `<section class="report-section">
        <h2>${escapeHtml(heading ?? section.title ?? "Informações")}</h2>
        ${answers ? `<div class="answer-grid">${answers}</div>` : ""}
        ${surfaceFinishes}
        ${renderVisualGallery(section, assetBaseUrl)}
    </section>`;
}

function resolveAssetBaseUrl(explicit?: string): string {
    if (explicit) return explicit.replace(/\/$/, "");
    const candidates = [
        path.resolve(process.cwd(), "frontend", "dist", "images", "briefing"),
        path.resolve(process.cwd(), "frontend", "src", "public", "images", "briefing"),
        path.resolve(process.cwd(), "..", "frontend", "dist", "images", "briefing"),
        path.resolve(process.cwd(), "..", "frontend", "src", "public", "images", "briefing")
    ];
    const directory = candidates.find(candidate => fs.existsSync(candidate));
    return directory ? pathToFileURL(directory).href.replace(/\/$/, "") : "/images/briefing";
}

function resolveImageSource(assetBaseUrl: string, relativePath: string): string {
    if (!assetBaseUrl.startsWith("file:")) return `${assetBaseUrl}/${relativePath}`;

    try {
        const filePath = fileURLToPath(new URL(relativePath, `${assetBaseUrl}/`));
        if (!fs.existsSync(filePath)) return `${assetBaseUrl}/${relativePath}`;

        const extension = path.extname(filePath).slice(1).toLowerCase();
        const mimeType = extension === "jpg" || extension === "jpeg"
            ? "image/jpeg"
            : extension === "webp"
                ? "image/webp"
                : "image/png";
        return `data:${mimeType};base64,${fs.readFileSync(filePath).toString("base64")}`;
    } catch {
        return `${assetBaseUrl}/${relativePath}`;
    }
}

function reportDate(raw: string | undefined): string {
    if (!raw) return "Data não informada";
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? "Data não informada" : new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "long", timeZone: "America/Sao_Paulo"
    }).format(date);
}

function answerValue(sections: BriefingSection[], key: string): unknown {
    for (const section of sections) {
        const answer = section.answers?.find(item => item.key === key);
        if (answer && meaningful(answer.value)) return answer.value;
    }
    return undefined;
}

function summaryText(value: unknown): string {
    if (Array.isArray(value)) {
        return value
            .filter(item => item !== "nao-considerar" && meaningful(item))
            .map(item => summaryText(item))
            .join(", ");
    }
    return typeof value === "string" ? displayString(value) : String(value ?? "Não informado");
}

function renderProjectSummary(sections: BriefingSection[], rooms: BriefingRoom[]): string {
    const items = [
        ["Área", answerValue(sections, "property-area"), " m²"],
        ["Propriedade", answerValue(sections, "property-ownership")],
        ["Situação do imóvel", answerValue(sections, "property-status")],
        ["Investimento", answerValue(sections, "investment-range")],
        ["Ar-condicionado", answerValue(sections, "air-conditioning-room")],
        ["Automação", answerValue(sections, "automation-types")]
    ].filter(([, value]) => meaningful(value));
    const environments = rooms.map(room => room.name).filter(Boolean).join(" · ");

    return `<section class="project-summary">
        <h2>Síntese do projeto</h2>
        ${environments ? `<div class="summary-environments"><span>Ambientes incluídos</span><p>${escapeHtml(environments)}</p></div>` : ""}
        <div class="summary-grid">${items.map(([label, value, suffix]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(summaryText(value))}${suffix ?? ""}</strong></div>`).join("")}</div>
    </section>`;
}

function sectionGroup(section: BriefingSection): string {
    const key = section.key ?? "";
    if (key.startsWith("preferences-") || key === "existing-furniture" || key === "ending") {
        return "Diretrizes do projeto";
    }
    return "Informações gerais";
}

function renderGeneralSections(sections: BriefingSection[], assetBaseUrl: string, generatedAt: Date): string {
    let activeGroup = "";
    return sections.map(section => {
        const rendered = renderSection(section, assetBaseUrl, generatedAt);
        if (!rendered) return "";
        const group = sectionGroup(section);
        const heading = group === activeGroup ? "" : `<header class="chapter-heading"><span>Briefing</span><h1>${group}</h1></header>`;
        activeGroup = group;
        return `${heading}${rendered}`;
    }).join("");
}

function renderRooms(rooms: BriefingRoom[], assetBaseUrl: string, generatedAt: Date): string {
    if (rooms.length === 0) return "";
    const index = `<section class="room-index"><h2>Ambientes</h2><ol>${rooms.map(room => `<li>${escapeHtml(room.name ?? "Ambiente")}</li>`).join("")}</ol></section>`;
    const details = rooms.map((room, index) => {
        const sections = (room.sections ?? []).map(section => {
            const heading = section.key?.endsWith("-considerations")
                ? "Considerações técnicas / equipamentos"
                : section.title;
            return renderSection(section, assetBaseUrl, generatedAt, heading);
        }).join("");
        if (!sections) return "";
        const roomType = room.subtype || room.type;
        return `<section class="room"><header><span>Ambiente ${String(index + 1).padStart(2, "0")}</span><h2>${escapeHtml(room.name ?? "Ambiente")}</h2>${roomType ? `<p>${escapeHtml(humanize(roomType))}</p>` : ""}</header>${sections}</section>`;
    }).join("");
    return `<div class="rooms"><header class="chapter-heading"><span>Projeto</span><h1>Briefing por cômodo</h1></header>${index}${details}</div>`;
}

export function buildBriefingReportHtml(
    document: BriefingReportDocument,
    options: BriefingReportOptions = {}
): string {
    const report: BriefingReportViewModel = mapBriefingReport(document);
    const project = report.project;
    const clientName = report.clientName;
    const assetBaseUrl = resolveAssetBaseUrl(options.assetBaseUrl);
    const generatedAt = options.generatedAt ?? new Date();
    const sourceSections = report.sections;
    const sourceRooms = report.rooms;
    const projectSummary = renderProjectSummary(sourceSections, sourceRooms);
    const generalSections = renderGeneralSections(sourceSections, assetBaseUrl, generatedAt);
    const rooms = renderRooms(sourceRooms, assetBaseUrl, generatedAt);

    return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório de briefing — ${escapeHtml(clientName)}</title><style>
        @page{size:A4;margin:15mm 14mm 17mm}*{box-sizing:border-box}body{margin:0;color:#292524;background:#fff;font-family:Arial,sans-serif;font-size:10.5pt;line-height:1.45}a{color:#a8471b}header.cover{padding:18mm 12mm;background:#fdf3ef;border-bottom:3px solid #b34f1e;border-radius:14px;margin-bottom:18px}.brand{color:#b34f1e;font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase}.cover h1{margin:18px 0 5px;font-size:28px}.cover h2{margin:0;color:#6b625f;font-size:16px;font-weight:400}.cover-meta{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-top:22px}.cover-meta div{padding:10px;background:#fff;border:1px solid #eadbd4;border-radius:8px}.cover-meta span,.room>header span{display:block;color:#8a7f7a;font-size:8px;text-transform:uppercase;letter-spacing:.08em}.cover-meta strong{display:block;margin-top:3px;font-size:10px}.report-section,.visual-section,.room{break-inside:avoid;margin:0 0 15px;padding:15px;border:1px solid #ded7d3;border-radius:10px}.report-section h2,.visual-section h2{margin:0 0 12px;padding-bottom:7px;border-bottom:1px solid #eadfd9;color:#8f3c17;font-size:15px}.answer-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 16px}.answer{break-inside:avoid}.answer h3{margin:0 0 3px;color:#6b625f;font-size:8.5px;text-transform:uppercase;letter-spacing:.035em}.answer p,.answer div{margin:0}.answer ul{margin:2px 0 0;padding-left:17px}.answer-separator{color:#9b8e88}.visual-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.visual-grid figure,.attachment{break-inside:avoid;margin:0;border:1px solid #e2d9d5;border-radius:8px;overflow:hidden;background:#faf8f7}.visual-grid img{display:block;width:100%;height:115px;object-fit:cover}.visual-grid figcaption,.attachment figcaption{padding:7px;font-size:8.5px;font-weight:700}.attachment{margin-top:6px}.attachment img{display:block;max-width:100%;max-height:280px;margin:auto;object-fit:contain}.room{padding:0;overflow:hidden}.room>header{padding:12px 15px;background:#f8f3f0}.room>header h2{margin:2px 0 0;font-size:17px}.room .report-section{margin:0;border:0;border-top:1px solid #e5ded9;border-radius:0}.footer-note{margin-top:18px;color:#837873;font-size:8px;text-align:center}@media print{a{text-decoration:none}.room{break-before:auto}}
        .visual-grid img{padding:6px;object-fit:contain}
        .project-summary{margin:0 0 20px;padding:16px;border:1px solid #ded7d3;border-radius:10px}.project-summary h2,.room-index h2{margin:0 0 12px;color:#8f3c17;font-size:15px}.summary-environments{margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid #eadfd9}.summary-environments span,.summary-grid span{display:block;color:#8a7f7a;font-size:8px;text-transform:uppercase;letter-spacing:.06em}.summary-environments p{margin:4px 0 0}.summary-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.summary-grid div{padding:9px;background:#faf8f7;border-radius:7px}.summary-grid strong{display:block;margin-top:3px;font-size:9px}.chapter-heading{margin:24px 0 12px;padding-bottom:8px;border-bottom:2px solid #b34f1e}.chapter-heading span{color:#8a7f7a;font-size:8px;text-transform:uppercase;letter-spacing:.1em}.chapter-heading h1{margin:2px 0 0;font-size:20px}.section-visuals{margin-top:14px;padding-top:12px;border-top:1px solid #eadfd9}.section-visuals>h3{margin:0 0 9px;color:#8f3c17;font-size:10px;text-transform:uppercase;letter-spacing:.05em}.room-index{break-inside:avoid;margin-bottom:16px;padding:15px;border:1px solid #ded7d3;border-radius:10px}.room-index ol{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin:0;padding-left:22px}.room-index li{font-size:9px}.rooms>.chapter-heading{break-before:page}.room>header p{margin:2px 0 0;color:#756b67;font-size:9px}.room .section-visuals{padding:12px 15px 0}
        .answer,.answer div,.answer li{min-width:0;overflow-wrap:anywhere;word-break:break-word}.answer a{display:inline-block;white-space:nowrap;font-weight:700}
        .people-list{display:flex;flex-direction:column}.person-card{padding:13px 0;border-bottom:2px solid #eadfd9}.person-card:first-child{padding-top:2px}.person-card:last-child{border-bottom:0}.person-card header span,.person-detail span{display:block;color:#8a7f7a;font-size:8px;text-transform:uppercase;letter-spacing:.06em}.person-card header h3{margin:3px 0 10px;color:#292524;font-size:14px}.person-details{display:grid;grid-template-columns:1fr 1fr;gap:9px 18px}.person-detail strong{display:block;margin-top:2px;font-size:10px;font-weight:400;overflow-wrap:anywhere}.other-information{margin-top:14px;padding-top:14px;border-top:2px solid #b34f1e}.other-information>h3{margin:0 0 11px;color:#8f3c17;font-size:10px;text-transform:uppercase;letter-spacing:.05em}
        .report-surface-finishes{margin-top:14px;break-inside:avoid}.report-surface-finishes h3{margin:0 0 8px;color:#8f3c17;font-size:10px;text-transform:uppercase;letter-spacing:.05em}.report-surface-finishes table{width:100%;border:1px solid #ded7d3;border-collapse:separate;border-spacing:0;border-radius:8px;overflow:hidden}.report-surface-finishes th,.report-surface-finishes td{padding:8px 10px;border-bottom:1px solid #e5ded9;text-align:left}.report-surface-finishes thead th{background:#f8f3f0;color:#6b625f;font-size:8px;text-transform:uppercase;letter-spacing:.05em}.report-surface-finishes tbody th{width:58%;font-size:9px;font-weight:700}.report-surface-finishes tbody td{font-size:9px}.report-surface-finishes tbody tr:last-child th,.report-surface-finishes tbody tr:last-child td{border-bottom:0}
    </style></head><body>
        <header class="cover"><div class="brand">Marcella Sol · Relatório administrativo</div><h1>${escapeHtml(project.name ?? "Relatório de briefing")}</h1><h2>${escapeHtml(clientName)}</h2><div class="cover-meta">
            <div><span>Categoria</span><strong>${escapeHtml(humanize(project.category ?? "Não informada"))}</strong></div>
            <div><span>Imóvel</span><strong>${escapeHtml(humanize(project.type ?? "Não informado"))}</strong></div>
            <div><span>Adultos</span><strong>${escapeHtml(project.adultAmount ?? "Não informado")}</strong></div>
            <div><span>Crianças</span><strong>${escapeHtml(project.childrenAmount ?? "Não informado")}</strong></div>
            <div><span>Enviado em</span><strong>${escapeHtml(reportDate(report.submittedAt))}</strong></div>
        </div></header>
        ${projectSummary}
        ${generalSections}
        ${rooms}
        <p class="footer-note">Relatório gerado a partir das informações fornecidas pelo cliente no briefing.</p>
    </body></html>`;
}

export async function generateBriefingReportPdf(
    document: BriefingReportDocument,
    options: BriefingReportOptions = {}
): Promise<Buffer> {
    const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--allow-file-access-from-files"]
    });
    try {
        const page = await browser.newPage();
        const html = buildBriefingReportHtml(document, options);
        if (options.temporaryDirectory) {
            const htmlPath = path.join(options.temporaryDirectory, "report.html");
            fs.writeFileSync(htmlPath, html, "utf8");
            await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "domcontentloaded" });
        } else {
            await page.setContent(html, { waitUntil: "domcontentloaded" });
        }
        await page.evaluate(async () => {
            const images = Array.from(globalThis.document.images);
            await Promise.race([
                Promise.all(images.map(image => image.complete
                    ? Promise.resolve()
                    : new Promise<void>(resolve => {
                        image.addEventListener("load", () => resolve(), { once: true });
                        image.addEventListener("error", () => resolve(), { once: true });
                    }))),
                new Promise<void>(resolve => setTimeout(resolve, 10_000))
            ]);
        });
        const pdf = await page.pdf({
            format: "A4",
            printBackground: true,
            displayHeaderFooter: true,
            headerTemplate: "<span></span>",
            footerTemplate: '<div style="width:100%;font-size:8px;color:#8a7f7a;text-align:center"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
            margin: { top: "15mm", right: "14mm", bottom: "17mm", left: "14mm" }
        });
        return Buffer.from(pdf);
    } finally {
        await browser.close();
    }
}
