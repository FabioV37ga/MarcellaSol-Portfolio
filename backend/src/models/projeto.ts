import mongoose from 'mongoose';

const projetoSchema = new mongoose.Schema({
    _id: { type: mongoose.Schema.Types.ObjectId, required: true },
    id: { type: Number, required: true }
})

export default mongoose.model('Projeto', projetoSchema);