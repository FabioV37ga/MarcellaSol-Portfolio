export class ApplicationError extends Error {
    constructor(message: string, readonly status: number) {
        super(message);
        this.name = "ApplicationError";
    }
}
