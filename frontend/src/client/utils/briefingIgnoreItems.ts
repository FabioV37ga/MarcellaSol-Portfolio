const pageSelector = [
    ".form-page-19",
    ".form-page-20",
    ".form-page-21",
    ".form-page-22",
    ".form-page-23",
    ".form-page-24"
].join(",")

const auxiliaryLabels = [
    "algum outro item",
    "fotos",
    "coloque as fotos",
    "modelo, medidas ou link da máquina"
]

function slug(value: string) {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
}

function isAuxiliary(label: string) {
    const normalized = label.trim().toLowerCase()
    return auxiliaryLabels.some(prefix => normalized.startsWith(prefix))
}

function toggleItem(box: HTMLElement, checkbox: HTMLInputElement) {
    box.classList.toggle("is-not-considered", checkbox.checked)

    box.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input, select, textarea")
        .forEach(field => {
            if (field === checkbox) return

            if (checkbox.checked) {
                field.dataset.wasRequired = field.required ? "true" : "false"
                field.required = false
                field.disabled = true
            } else {
                field.disabled = false
                field.required = field.dataset.wasRequired === "true"
                delete field.dataset.wasRequired
            }
        })
}

function bindBox(box: HTMLElement) {
    const title = box.querySelector<HTMLElement>(":scope > label:not(.briefing-ignore-option)")?.textContent?.trim()
    if (!title || isAuxiliary(title)) return

    let option = box.querySelector<HTMLLabelElement>(":scope > .briefing-ignore-option")

    if (!option) {
        option = document.createElement("label")
        option.className = "briefing-ignore-option"
        option.innerHTML = `<input type="checkbox" name="${slug(title)}-nao-considerar" value="nao-considerar"><span>Não considerar</span>`
        box.querySelector(":scope > label")?.insertAdjacentElement("afterend", option)
    }

    const checkbox = option.querySelector<HTMLInputElement>('input[type="checkbox"]')
    if (!checkbox || checkbox.dataset.ignoreBound) return

    checkbox.dataset.ignoreBound = "true"
    checkbox.addEventListener("change", () => toggleItem(box, checkbox))
    toggleItem(box, checkbox)
}

export function initializeBriefingIgnoreItems(root: ParentNode = document) {
    root.querySelectorAll<HTMLElement>(`${pageSelector} .briefing-section > .briefing-input-box`).forEach(bindBox)
}

if (typeof document !== "undefined") {
    const initialize = () => initializeBriefingIgnoreItems()
    document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", initialize) : initialize()
    new MutationObserver(initialize).observe(document.documentElement, { childList: true, subtree: true })
}
