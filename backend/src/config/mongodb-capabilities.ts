import mongoose, { type Connection } from "mongoose";

export interface MongoDbCapabilities {
    connected: boolean;
    transactions: boolean;
}

let detectedCapabilities: MongoDbCapabilities = { connected: false, transactions: false };

export function mongoDbSupportsTransactions(hello: Record<string, unknown>): boolean {
    return typeof hello.setName === "string" && hello.setName.length > 0
        || hello.msg === "isdbgrid";
}

export async function detectMongoDbCapabilities(connection: Connection): Promise<MongoDbCapabilities> {
    if (connection.readyState !== 1 || !connection.db) return { connected: false, transactions: false };
    const hello = await connection.db.admin().command({ hello: 1 }) as Record<string, unknown>;
    return { connected: true, transactions: mongoDbSupportsTransactions(hello) };
}

export function setMongoDbCapabilities(capabilities: MongoDbCapabilities): void {
    detectedCapabilities = capabilities;
}

export function currentMongoDbReadiness(): MongoDbCapabilities {
    return {
        connected: mongoose.connection.readyState === 1 && detectedCapabilities.connected,
        transactions: detectedCapabilities.transactions
    };
}
