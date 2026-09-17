import type { drive_v3 } from "@googleapis/drive";
import { getGoogleDriveClient } from "./google-drive-client.js";

export interface FolderReadAccessResult {
    email: string;
    permissionId?: string;
    created: boolean;
}

export interface FolderReadAccessStorage {
    grantFolderReadAccess(folderId: string, email: string): Promise<FolderReadAccessResult>;
}

type DrivePermissionClient = Pick<drive_v3.Drive, "permissions">;
type DrivePermissionClientFactory = () => DrivePermissionClient;

export class GoogleDriveFolderPermissionStorage implements FolderReadAccessStorage {
    constructor(
        private readonly createClient: DrivePermissionClientFactory = getGoogleDriveClient
    ) { }

    async grantFolderReadAccess(folderId: string, email: string): Promise<FolderReadAccessResult> {
        const normalizedEmail = email.trim().toLowerCase();
        const drive = this.createClient();
        let pageToken: string | undefined;

        do {
            const listed = await drive.permissions.list({
                fileId: folderId,
                fields: "nextPageToken,permissions(id,emailAddress,deleted)",
                supportsAllDrives: true,
                pageSize: 100,
                pageToken
            });
            const existing = listed.data.permissions?.find(permission =>
                !permission.deleted
                && permission.emailAddress?.trim().toLowerCase() === normalizedEmail
            );
            if (existing) {
                return {
                    email: normalizedEmail,
                    permissionId: existing.id ?? undefined,
                    created: false
                };
            }
            pageToken = listed.data.nextPageToken ?? undefined;
        } while (pageToken);

        const created = await drive.permissions.create({
            fileId: folderId,
            requestBody: {
                type: "user",
                role: "reader",
                emailAddress: normalizedEmail
            },
            sendNotificationEmail: true,
            supportsAllDrives: true,
            fields: "id,emailAddress"
        });

        return {
            email: normalizedEmail,
            permissionId: created.data.id ?? undefined,
            created: true
        };
    }
}
