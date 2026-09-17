import { drive, type drive_v3 } from "@googleapis/drive";
import { OAuth2Client } from "google-auth-library";
import { configureOutboundNetwork, ipv4HttpsAgent } from "../config/outbound-network.js";

type EnvironmentReader = (name: string) => string | undefined;
type DriveFactory = (auth: OAuth2Client) => drive_v3.Drive;

configureOutboundNetwork();

export class GoogleDriveClientProvider {
    private client?: drive_v3.Drive;

    constructor(
        private readonly readEnvironment: EnvironmentReader = name => process.env[name],
        private readonly createClient: DriveFactory = auth => drive({ version: "v3", auth })
    ) { }

    get(): drive_v3.Drive {
        if (this.client) return this.client;

        const auth = new OAuth2Client({
            clientId: this.requiredEnvironment("GOOGLE_OAUTH_CLIENT_ID"),
            clientSecret: this.requiredEnvironment("GOOGLE_OAUTH_CLIENT_SECRET"),
            redirectUri: this.readEnvironment("GOOGLE_OAUTH_REDIRECT_URI")?.trim() || undefined,
            transporterOptions: { agent: ipv4HttpsAgent }
        });
        auth.setCredentials({
            refresh_token: this.requiredEnvironment("GOOGLE_OAUTH_REFRESH_TOKEN")
        });
        this.client = this.createClient(auth);
        return this.client;
    }

    private requiredEnvironment(name: string): string {
        const value = this.readEnvironment(name)?.trim();
        if (!value) throw new Error(`Integração com Google Drive não configurada: ${name}`);
        return value;
    }
}

const sharedDriveClient = new GoogleDriveClientProvider();

export function getGoogleDriveClient(): drive_v3.Drive {
    return sharedDriveClient.get();
}
