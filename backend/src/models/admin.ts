import mongoose from 'mongoose';

const adminSchema = new mongoose.Schema({
    _id: { type: mongoose.Schema.Types.ObjectId, required: true },
    login: {type: String, required: true},
    password: {type: String, required: true},
    name: {type: String, required: true}
},{collection: 'admins'}
)

export default mongoose.model('Admin', adminSchema);