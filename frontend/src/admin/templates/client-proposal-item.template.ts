import type { ClientProposal } from "../infrastructure/admin-system.api.js";
import { projectStageLabels } from "@/shared/project-stages.js";

function statusLabel(status: ClientProposal["status"]): string {
    return ({ sent: "Enviada", resent: "Reenviada", beated: "Alterações solicitadas", approved: "Aprovada", "changes-completed": "Alterações concluídas", Cancelled: "Cancelada" })[status];
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
        <p class="proposal-stage"></p>
        <p class="proposal-description"></p>
        <p class="proposal-release-state" hidden></p>
        <div class="proposal-attachments"></div>
        <div class="proposal-comment" hidden><strong>Comentário do cliente</strong><p></p></div>
        ${proposal.status === "beated" ? '<button class="proposal-confirm-changes" type="button">Confirmar alterações</button>' : ""}
        ${proposal.releaseStatus === "pending" || proposal.releaseStatus === "failed"
            ? '<button class="proposal-release-now" type="button">Liberar agora</button>' : ""}
    `;
    article.querySelector("h3")!.textContent = proposal.title;
    article.querySelector<HTMLElement>(".proposal-stage")!.textContent = proposal.stageKey
        ? projectStageLabels[proposal.stageKey]
        : "Etapa não vinculada";
    article.querySelector<HTMLElement>(".proposal-description")!.textContent = withParagraphSpacing(proposal.description);
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
    if (proposal.releaseAt) {
        const release = article.querySelector<HTMLElement>(".proposal-release-state")!;
        release.hidden = false;
        const date = formattedReleaseDate(proposal.releaseAt);
        release.textContent = proposal.releaseStatus === "released"
            ? `Liberada em ${date}`
            : proposal.releaseStatus === "failed"
                ? `Falha na liberação agendada para ${date}`
                : proposal.releaseStatus === "processing"
                    ? `Liberando proposta agendada para ${date}`
                    : `Liberação agendada para ${date}`;
    }
    if (proposal.userComment && !proposal.clientResponses?.length) {
        const comment = article.querySelector<HTMLElement>(".proposal-comment")!;
        comment.hidden = false;
        comment.querySelector("p")!.textContent = withParagraphSpacing(proposal.userComment);
    }
    if (proposal.clientResponses?.length) {
        const history = document.createElement("section");
        history.className = "proposal-client-response-history";
        const heading = document.createElement("strong");
        heading.textContent = "Histórico de respostas do cliente";
        history.append(heading);
        proposal.clientResponses.forEach((response, responseIndex) => {
            const item = document.createElement("div");
            item.className = "proposal-client-response";
            const text = document.createElement("p");
            text.textContent = withParagraphSpacing(`${responseIndex + 1}. ${response.decision === "approved" ? "Aprovou" : "Solicitou alteração"}: ${response.comment}`);
            item.append(text);
            response.attachments.forEach((url, attachmentIndex) => {
                const link = document.createElement("a");
                link.href = url;
                link.target = "_blank";
                link.rel = "noopener noreferrer";
                link.textContent = `Anexo do cliente ${attachmentIndex + 1}`;
                item.append(link);
            });
            history.append(item);
        });
        article.append(history);
    }
    return article;
}

function formattedReleaseDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "data inválida";
    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Sao_Paulo"
    }).format(date);
}

function withParagraphSpacing(value: string): string {
    return value.replace(/\r\n?/g, "\n").replace(/([^\n])\n(?=[^\n])/g, "$1\n\n");
}
