import { AdminRepository } from "../repositories/admin.repository.js";
import { ClientRepository } from "../repositories/client.repository.js";
import { PasswordService } from "../services/password.service.js";
import { SessionTokenService, type AccountRole } from "../services/session-token.service.js";
import { ApplicationError } from "./errors/application-error.js";

type AdminAccount = NonNullable<Awaited<ReturnType<AdminRepository["findByLogin"]>>>;
type ClientAccount = NonNullable<Awaited<ReturnType<ClientRepository["findByLogin"]>>>;
type AuthenticationResult<T> = { account: T; token: string };

export class AuthenticateService {
    constructor(
        private readonly admins = new AdminRepository(),
        private readonly clients = new ClientRepository(),
        private readonly passwords = new PasswordService(),
        private readonly tokens = new SessionTokenService()
    ) {}

    async execute(role: "admin", login: string, password: string): Promise<AuthenticationResult<AdminAccount>>;
    async execute(role: "client", login: string, password: string): Promise<AuthenticationResult<ClientAccount>>;
    async execute(role: AccountRole, login: string, password: string): Promise<AuthenticationResult<AdminAccount | ClientAccount>> {
        const account = role === "admin"
            ? await this.admins.findByLogin(login)
            : await this.clients.findByLogin(login);
        if (!account || !await this.passwords.verify(password, account.password)) {
            throw new ApplicationError("Login ou senha incorretos", 401);
        }

        if (!this.passwords.isHash(account.password)) {
            const hash = await this.passwords.hash(password);
            if (role === "admin") await this.admins.updatePassword(account._id, hash);
            else await this.clients.updatePassword(account._id, hash);
        }

        const token = this.tokens.issue({
            subject: String(account._id),
            role,
            login: account.login,
            name: account.name
        });
        return { account, token };
    }
}
