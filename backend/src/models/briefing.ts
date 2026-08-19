import mongoose from "mongoose";

export interface BriefingRoom {
    id: number;
    index: number;
    name: string;
    type: string;
    subtype?: string;
    options?: boolean[];
}

export interface BriefingObject {
    id?: string;
    user?: {
        name?: string;
    };
    description?: {
        category: string;
        type: string;
        name: string;
        residentAmount: number;
    };
    investmentFlexibility?: boolean;
    rooms?: BriefingRoom[];
}

const briefingRoomSchema = new mongoose.Schema<BriefingRoom>({
    id: { type: Number, required: true },
    index: { type: Number, required: true },
    name: { type: String, required: true },
    type: { type: String, required: true },
    subtype: { type: String, required: false },
    options: { type: [Boolean], required: false, default: [] }
}, { _id: false });

const briefingUserSchema = new mongoose.Schema({
    name: { type: String, required: false }
}, { _id: false });

const briefingDescriptionSchema = new mongoose.Schema({
    category: { type: String, required: true },
    type: { type: String, required: true },
    name: { type: String, required: true },
    residentAmount: { type: Number, required: true }
}, { _id: false });

export const briefingSchema = new mongoose.Schema<BriefingObject>({
    id: { type: String, required: false },
    user: { type: briefingUserSchema, required: false },
    description: { type: briefingDescriptionSchema, required: false },
    investmentFlexibility: { type: Boolean, required: false, default: false },
    rooms: { type: [briefingRoomSchema], required: false, default: [] }
}, { _id: false });
