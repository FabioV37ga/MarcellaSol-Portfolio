import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import puppeteer from "puppeteer";

interface BriefingAnswer {
    question?: string;
    value?: unknown;
}

interface BriefingSection {
    title?: string;
    answers?: BriefingAnswer[];
}

interface BriefingRoom {
    name?: string;
    sections?: BriefingSection[];
}

export interface BriefingReportDocument {
    briefingDefinition?: {
        user?: { name?: string };
        description?: {
            category?: string;
            type?: string;
            name?: string;
            residentAmount?: number;
        };
    };
    responses?: {
        project?: {
            category?: string;
            type?: string;
            name?: string;
            residentAmount?: number;
        };
        sections?: BriefingSection[];
        rooms?: BriefingRoom[];
        submittedAt?: string;
    };
    submittedAt?: string | { $date?: string };
}

export interface BriefingReportOptions {
    assetBaseUrl?: string;
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
        sim: "Sim", nao: "Não", propria: "Própria", "em-construcao": "Em construção",
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
    const escaped = escapeHtml(value.trim()).replace(/\n/g, "<br>");
    if (/^https?:\/\//i.test(value.trim())) {
        return `<a href="${escapeHtml(value.trim())}" target="_blank" rel="noopener noreferrer">${escaped}</a>`;
    }
    return escaped;
}

function renderFile(value: Record<string, unknown>): string {
    const driveFile = value.driveFile as Record<string, unknown> | undefined;
    const name = String(driveFile?.name ?? value.name ?? "Imagem anexada");
    const id = typeof driveFile?.id === "string" ? driveFile.id : undefined;
    const link = typeof driveFile?.webViewLink === "string" ? driveFile.webViewLink : undefined;
    const preview = id ? `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w1200` : undefined;
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

function renderSection(section: BriefingSection): string {
    const grouped = new Map<string, unknown[]>();
    for (const answer of section.answers ?? []) {
        if (!answer.question || !meaningful(answer.value)) continue;
        const values = grouped.get(answer.question) ?? [];
        values.push(answer.value);
        grouped.set(answer.question, values);
    }
    if (grouped.size === 0) return "";

    return `<section class="report-section">
        <h2>${escapeHtml(section.title ?? "Informações")}</h2>
        <div class="answer-grid">${[...grouped.entries()].map(([question, values]) => `
            <article class="answer">
                <h3>${escapeHtml(question.replace(/^\d+\.\s*/, ""))}</h3>
                <div>${values.map(renderValue).join('<span class="answer-separator"> · </span>')}</div>
            </article>`).join("")}
        </div>
    </section>`;
}

function collectSelectedValues(document: BriefingReportDocument): Set<string> {
    const selected = new Set<string>();
    const visit = (value: unknown): void => {
        if (Array.isArray(value)) return value.forEach(visit);
        if (value && typeof value === "object") return Object.values(value).forEach(visit);
        if (typeof value === "string" && visualOptions[value]) selected.add(value);
    };
    visit(document.responses);
    return selected;
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

function reportDate(document: BriefingReportDocument): string {
    const raw = document.responses?.submittedAt
        ?? (typeof document.submittedAt === "string" ? document.submittedAt : document.submittedAt?.$date);
    if (!raw) return "Data não informada";
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? "Data não informada" : new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "long", timeZone: "America/Sao_Paulo"
    }).format(date);
}

export function buildBriefingReportHtml(
    document: BriefingReportDocument,
    options: BriefingReportOptions = {}
): string {
    const project = document.responses?.project ?? document.briefingDefinition?.description ?? {};
    const clientName = document.briefingDefinition?.user?.name ?? "Cliente";
    const selected = collectSelectedValues(document);
    const assetBaseUrl = resolveAssetBaseUrl(options.assetBaseUrl);
    const visuals = [...selected].map(key => {
        const option = visualOptions[key];
        const imageSource = resolveImageSource(assetBaseUrl, option.image);
        return `<figure><img src="${imageSource}" alt="${escapeHtml(option.label)}"><figcaption>${escapeHtml(option.label)}</figcaption></figure>`;
    }).join("");
    const generalSections = (document.responses?.sections ?? []).map(renderSection).join("");
    const rooms = (document.responses?.rooms ?? []).map(room => {
        const sections = (room.sections ?? []).map(renderSection).join("");
        return sections ? `<section class="room"><header><span>Ambiente</span><h2>${escapeHtml(room.name ?? "Ambiente")}</h2></header>${sections}</section>` : "";
    }).join("");

    return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório de briefing — ${escapeHtml(clientName)}</title><style>
        @page{size:A4;margin:15mm 14mm 17mm}*{box-sizing:border-box}body{margin:0;color:#292524;background:#fff;font-family:Arial,sans-serif;font-size:10.5pt;line-height:1.45}a{color:#a8471b}header.cover{padding:18mm 12mm;background:#fdf3ef;border-bottom:3px solid #b34f1e;border-radius:14px;margin-bottom:18px}.brand{color:#b34f1e;font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase}.cover h1{margin:18px 0 5px;font-size:28px}.cover h2{margin:0;color:#6b625f;font-size:16px;font-weight:400}.cover-meta{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:22px}.cover-meta div{padding:10px;background:#fff;border:1px solid #eadbd4;border-radius:8px}.cover-meta span,.room>header span{display:block;color:#8a7f7a;font-size:8px;text-transform:uppercase;letter-spacing:.08em}.cover-meta strong{display:block;margin-top:3px;font-size:10px}.report-section,.visual-section,.room{break-inside:avoid;margin:0 0 15px;padding:15px;border:1px solid #ded7d3;border-radius:10px}.report-section h2,.visual-section h2{margin:0 0 12px;padding-bottom:7px;border-bottom:1px solid #eadfd9;color:#8f3c17;font-size:15px}.answer-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 16px}.answer{break-inside:avoid}.answer h3{margin:0 0 3px;color:#6b625f;font-size:8.5px;text-transform:uppercase;letter-spacing:.035em}.answer p,.answer div{margin:0}.answer ul{margin:2px 0 0;padding-left:17px}.answer-separator{color:#9b8e88}.visual-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.visual-grid figure,.attachment{break-inside:avoid;margin:0;border:1px solid #e2d9d5;border-radius:8px;overflow:hidden;background:#faf8f7}.visual-grid img{display:block;width:100%;height:115px;object-fit:cover}.visual-grid figcaption,.attachment figcaption{padding:7px;font-size:8.5px;font-weight:700}.attachment{margin-top:6px}.attachment img{display:block;max-width:100%;max-height:280px;margin:auto;object-fit:contain}.room{padding:0;overflow:hidden}.room>header{padding:12px 15px;background:#f8f3f0}.room>header h2{margin:2px 0 0;font-size:17px}.room .report-section{margin:0;border:0;border-top:1px solid #e5ded9;border-radius:0}.footer-note{margin-top:18px;color:#837873;font-size:8px;text-align:center}@media print{a{text-decoration:none}.room{break-before:auto}}
        .visual-grid img{padding:6px;object-fit:contain}
    </style></head><body>
        <header class="cover"><div class="brand">Marcella Sol · Relatório administrativo</div><h1>${escapeHtml(project.name ?? "Relatório de briefing")}</h1><h2>${escapeHtml(clientName)}</h2><div class="cover-meta">
            <div><span>Categoria</span><strong>${escapeHtml(humanize(project.category ?? "Não informada"))}</strong></div>
            <div><span>Imóvel</span><strong>${escapeHtml(humanize(project.type ?? "Não informado"))}</strong></div>
            <div><span>Moradores</span><strong>${escapeHtml(project.residentAmount ?? "Não informado")}</strong></div>
            <div><span>Enviado em</span><strong>${escapeHtml(reportDate(document))}</strong></div>
        </div></header>
        ${visuals ? `<section class="visual-section"><h2>Referências visuais selecionadas</h2><div class="visual-grid">${visuals}</div></section>` : ""}
        ${generalSections}
        ${rooms ? `<div class="rooms"><h1>Detalhamento por ambiente</h1>${rooms}</div>` : ""}
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
        await page.setContent(buildBriefingReportHtml(document, options), { waitUntil: "domcontentloaded" });
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
