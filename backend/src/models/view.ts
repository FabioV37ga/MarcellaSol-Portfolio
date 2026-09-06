import mongoose from "mongoose";

const viewSchema = new mongoose.Schema({
    _id: { type: mongoose.Schema.Types.ObjectId, required: true },
    viewName: {type: String, required: true},
    permission: { type: String, required: true },
    type: {type: String, required: true},
    view: { type: String, required: true },
}, {collection: 'views'});

viewSchema.index(
    { permission: 1, viewName: 1 },
    { name: "views_permission_viewName_unique", unique: true, collation: { locale: "en", strength: 2 } }
);

export default mongoose.model("View", viewSchema);
