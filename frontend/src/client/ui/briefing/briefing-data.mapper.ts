import type {
    BriefingRoom,
    ClientBriefingResponse,
    ClientSummary,
    ResolvedBriefingDefinition
} from "@/shared/briefing/briefing.types.js";

function normalizeRoom(room: Partial<BriefingRoom>, position: number): BriefingRoom {
    return {
        id: Number.isFinite(Number(room.id)) ? Number(room.id) : position,
        index: Number.isFinite(Number(room.index)) ? Number(room.index) : position,
        name: typeof room.name === "string" ? room.name.trim() : "",
        type: typeof room.type === "string" ? room.type.trim().toLowerCase() : "",
        subtype: typeof room.subtype === "string" ? room.subtype : undefined,
        options: Array.isArray(room.options) ? room.options.map(Boolean) : []
    };
}

export function normalizeBriefingData(
    response: ClientBriefingResponse,
    fallbackName: string
): { clientObject: ClientSummary; briefingObject: ResolvedBriefingDefinition } {
    const rawBriefing = response.briefingObject ?? {};
    const description = rawBriefing.description ?? {} as ResolvedBriefingDefinition["description"];
    const rooms = Array.isArray(rawBriefing.rooms)
        ? rawBriefing.rooms.map(normalizeRoom).sort((a, b) => a.index - b.index)
        : [];

    return {
        clientObject: {
            id: typeof response.clientObject?.id === "string" ? response.clientObject.id : undefined,
            name: response.clientObject?.name?.trim() || rawBriefing.user?.name?.trim() || fallbackName,
            hasFilledBriefing: Boolean(response.clientObject?.hasFilledBriefing)
        },
        briefingObject: {
            id: typeof rawBriefing.id === "string" ? rawBriefing.id : undefined,
            user: { name: rawBriefing.user?.name?.trim() || fallbackName },
            description: {
                category: typeof description.category === "string" ? description.category : "",
                type: typeof description.type === "string" ? description.type : "",
                name: typeof description.name === "string" ? description.name : "",
                adultAmount: Math.max(1, Math.floor(Number(description.adultAmount) || 1)),
                childrenAmount: Math.max(0, Math.floor(Number(description.childrenAmount) || 0))
            },
            investmentFlexibility: Boolean(rawBriefing.investmentFlexibility),
            rooms
        }
    };
}
