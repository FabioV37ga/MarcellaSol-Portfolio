import mongoose from 'mongoose';
import { BriefingObject, briefingSchema } from './briefing.js';

export interface ClientObject {
    _id: mongoose.Types.ObjectId;
    login: string;
    password: string;
    name: string;
    hasFilledBriefing: boolean;
    driveFolderId?: string;
    briefing: BriefingObject;
}

const clientSchema = new mongoose.Schema<ClientObject>({
    login: {type: String, required: true},
    password: {type: String, required: true},
    name: {type: String, required: true},
    hasFilledBriefing: {type: Boolean, required: true},
    driveFolderId: {type: String, required: false},
    briefing: {type: briefingSchema, required: true}
},{collection: 'clients'}
)

export default mongoose.model<ClientObject>('Client', clientSchema);
