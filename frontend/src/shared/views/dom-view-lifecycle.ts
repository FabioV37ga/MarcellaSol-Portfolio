export type ViewDisposer = () => void;

interface MountedView {
    container: HTMLElement;
    element: HTMLElement;
    disposers: ViewDisposer[];
}

export class DomViewLifecycle {
    private readonly mounts = new Map<string, MountedView>();

    render(template: HTMLElement, target: string): HTMLElement {
        return this.mount(template.cloneNode(true) as HTMLElement, target);
    }

    mountOwned(element: HTMLElement, target: string): HTMLElement {
        return this.mount(element, target);
    }

    registerDisposer(disposer: ViewDisposer, target = ".page-content"): void {
        const mounted = this.mounts.get(target);
        if (!mounted) {
            throw new Error(`Não existe uma view montada em ${target}.`);
        }
        mounted.disposers.push(disposer);
    }

    dispose(target = ".page-content"): void {
        const mounted = this.mounts.get(target);
        if (!mounted) return;

        this.mounts.delete(target);
        mounted.disposers.reverse().forEach(disposer => {
            try {
                disposer();
            } catch (error) {
                console.error(`Erro ao desmontar a view de ${target}:`, error);
            }
        });

        if (mounted.container.childNodes.length === 1
            && mounted.container.firstChild === mounted.element) {
            mounted.container.replaceChildren();
            return;
        }
        mounted.element.remove();
    }

    disposeAll(): void {
        Array.from(this.mounts.keys()).reverse().forEach(target => this.dispose(target));
    }

    private mount(element: HTMLElement, target: string): HTMLElement {
        const container = document.querySelector<HTMLElement>(target);
        if (!container) {
            throw new Error(`Container ${target} não encontrado.`);
        }

        this.dispose(target);
        if (target === "body") container.append(element);
        else container.replaceChildren(element);
        this.mounts.set(target, { container, element, disposers: [] });
        return element;
    }
}
