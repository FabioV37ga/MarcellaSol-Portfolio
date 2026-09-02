import type { ClientProposal, ClientProposalStatus } from "../infrastructure/client-system.api.js";
import { projectStageLabels } from "@/shared/project-stages.js";

const statusLabels: Record<ClientProposalStatus, string> = {
    sent: "Aguardando aprovação",
    resent: "Atualizada",
    beated: "Alterações solicitadas",
    approved: "Aprovada",
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
    const stage = document.createElement("p");
    stage.className = "client-approval-stage";
    stage.textContent = proposal.stageKey ? projectStageLabels[proposal.stageKey] : "Etapa não vinculada";
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

    article.append(header, title, stage, description, attachments);

    if (proposal.userComment) {
        const comment = document.createElement("div");
        comment.className = "client-approval-comment";
        const commentTitle = document.createElement("strong");
        commentTitle.textContent = "Seu comentário";
        const commentText = document.createElement("p");
        commentText.textContent = proposal.userComment;
        comment.append(commentTitle, commentText);
        article.append(comment);
    }

    if (proposal.status === "sent" || proposal.status === "resent") {
        const actions = document.createElement("div");
        actions.className = "client-approval-actions";
        const reject = document.createElement("button");
        reject.className = "client-approval-reject";
        reject.type = "button";
        reject.textContent = "Solicitar alteração";
        const approve = document.createElement("button");
        approve.className = "client-approval-approve";
        approve.type = "button";
        approve.textContent = "Aprovar";
        actions.append(reject, approve);
        article.append(actions);
    }
    return article;
}
