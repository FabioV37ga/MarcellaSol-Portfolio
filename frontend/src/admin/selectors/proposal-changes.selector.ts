export function getProposalChangesElements(root: ParentNode) {
    function required<T extends HTMLElement>(selector: string): T {
        const element = root.querySelector<T>(selector);
        if (!element) throw new Error(`A view client-proposals está desatualizada: ${selector} não foi encontrado.`);
        return element;
    }
    return {
        dialog: required<HTMLDialogElement>("#proposal-changes-dialog"),
        name: required<HTMLElement>("#proposal-changes-name"),
        feedback: required<HTMLElement>("#proposal-changes-feedback"),
        cancel: required<HTMLButtonElement>("#proposal-changes-cancel"),
        confirm: required<HTMLButtonElement>("#proposal-changes-confirm")
    };
}
