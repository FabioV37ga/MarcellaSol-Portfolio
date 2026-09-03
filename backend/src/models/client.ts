import mongoose from 'mongoose';
import { BriefingObject, briefingSchema } from './briefing.js';
import { projectStageKeys, projectStageStatuses, type ProjectStage, type ProjectStageKey } from './projectStage.js';

export interface ClientObject {
    _id: mongoose.Types.ObjectId;
    login: string;
    password: string;
    name: string;
    hasFilledBriefing: boolean;
    driveFolderId?: string;
    briefing: BriefingObject;
    currentStageKey: ProjectStageKey;
    projectStages: ProjectStage[];
}

const projectStageSchema = new mongoose.Schema<ProjectStage>({
    key: { type: String, enum: projectStageKeys, required: true },
    status: { type: String, enum: projectStageStatuses, required: true },
    index: { type: Number, min: 0, validate: Number.isInteger, required: false }
}, { _id: false });

const clientSchema = new mongoose.Schema<ClientObject>({
    login: {type: String, required: true},
    password: {type: String, required: true},
    name: {type: String, required: true},
    hasFilledBriefing: {type: Boolean, required: true},
    driveFolderId: {type: String, required: false},
    briefing: {type: briefingSchema, required: true},
    currentStageKey: { type: String, enum: projectStageKeys, default: "briefing", required: true },
    projectStages: { type: [projectStageSchema], default: [] }
},{collection: 'clients'}
)

export default mongoose.model<ClientObject>('Client', clientSchema);
