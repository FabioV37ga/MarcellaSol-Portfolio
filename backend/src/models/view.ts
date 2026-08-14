import mongoose from "mongoose";

const viewSchema = new mongoose.Schema({
    _id: { type: mongoose.Schema.Types.ObjectId, required: true },
    viewName: {type: String, required: true},
    permission: { type: String, required: true },
    view: { type: String, required: true },
}, {collection: 'views'});

export default mongoose.model("View", viewSchema);  