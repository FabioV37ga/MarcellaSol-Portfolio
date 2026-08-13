import mongoose from 'mongoose';

const projetoSchema = new mongoose.Schema({
    _id: { type: mongoose.Schema.Types.ObjectId, required: true },
    id: { type: Number, required: true }
},{collection: 'projetos'}
)

export default mongoose.model('Projeto', projetoSchema);