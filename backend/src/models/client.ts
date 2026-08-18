import mongoose from 'mongoose';

const adminSchema = new mongoose.Schema({
    _id: { type: mongoose.Schema.Types.ObjectId, required: true },
    login: {type: String, required: true},
    password: {type: String, required: true},
    name: {type: String, required: true},
    hasFilledBriefing: {type: Boolean, required: true}
},{collection: 'clients'}
)

export default mongoose.model('Client', adminSchema);