import type { ClientProposal, ClientProposalStatus } from "../infrastructure/client-system.api.js";

const statusLabels: Record<ClientProposalStatus, string> = {
    sent: "Aguardando aprovação",
    resent: "Atualizada",
    beated: "Alterações solicitadas",
    Cancelled: "Cancelada"
};

export function clientApprovalItem(proposal: ClientProposal): HTMLElement {
    const article = document.createElement("article");
    article.className = "client-approval-card";
    article.dataset.proposalId = proposal._id;

    const header = document.createElement("header");
    header.className = "client-approval-card-header";
    const status = document.createElement("span");
    status.className = `client-approval-status client-approval-status-${proposal.status.toLowerCase()}`;
    status.textContent = statusLabels[proposal.status];
    const date = document.createElement("time");
    date.dateTime = proposal.updatedAt;
    const updatedAt = new Date(proposal.updatedAt);
    date.textContent = Number.isNaN(updatedAt.getTime())
        ? ""
        : new Intl.DateTimeFormat("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }).format(updatedAt);
    header.append(status, date);

    const title = document.createElement("h3");
    title.textContent = proposal.title;
    const description = document.createElement("p");
    description.className = "client-approval-description";
    description.textContent = proposal.description;

    const attachments = document.createElement("div");
    attachments.className = "client-approval-attachments";
    proposal.attachments.forEach((url, index) => {
        const link = document.createElement("a");
        link.className = "client-approval-attachment";
        link.href = url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.innerHTML = `<i class="fa fa-paperclip" aria-hidden="true"></i><span>Anexo ${index + 1}</span>`;
        attachments.append(link);
    });

    article.append(header, title, description, attachments);
    return article;
}
