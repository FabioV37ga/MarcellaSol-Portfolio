import type { ClientProposal } from "../infrastructure/admin-system.api.js";

function statusLabel(status: ClientProposal["status"]): string {
    return ({ sent: "Enviada", resent: "Reenviada", beated: "Rebatida", Cancelled: "Cancelada" })[status];
}

export function clientProposalItem(proposal: ClientProposal): HTMLElement {
    const article = document.createElement("article");
    article.className = "proposal-card";
    article.dataset.proposalId = proposal._id;
    article.innerHTML = `
        <header class="proposal-card-header">
            <span class="proposal-status proposal-status-${proposal.status.toLowerCase()}">${statusLabel(proposal.status)}</span>
            <div class="proposal-card-actions">
                <button class="proposal-edit" type="button" aria-label="Editar proposta"><i class="fa fa-pencil"></i></button>
                <button class="proposal-delete" type="button" aria-label="Remover proposta"><i class="fa fa-trash-o"></i></button>
            </div>
        </header>
        <h3></h3>
        <p class="proposal-description"></p>
        <div class="proposal-attachments"></div>
        <div class="proposal-comment" hidden><strong>Comentário do cliente</strong><p></p></div>
        ${proposal.status === "beated" ? '<button class="proposal-resend" type="button">Reenviar ao cliente</button>' : ""}
    `;
    article.querySelector("h3")!.textContent = proposal.title;
    article.querySelector<HTMLElement>(".proposal-description")!.textContent = proposal.description;
    const attachments = proposal.attachments?.length
        ? proposal.attachments
        : proposal.attachment ? [proposal.attachment] : [];
    const attachmentsContainer = article.querySelector<HTMLElement>(".proposal-attachments")!;
    attachments.forEach((url, index) => {
        const link = document.createElement("a");
        link.className = "proposal-attachment";
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.href = url;
        link.innerHTML = `<i class="fa fa-paperclip"></i> Anexo ${index + 1}`;
        attachmentsContainer.append(link);
    });
    if (proposal.userComment) {
        const comment = article.querySelector<HTMLElement>(".proposal-comment")!;
        comment.hidden = false;
        comment.querySelector("p")!.textContent = proposal.userComment;
    }
    return article;
}
