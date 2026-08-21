import admins from "../models/admin.js";
import type mongoose from "mongoose";

export class AdminRepository {
    findByLogin(login: string) {
        return admins.findOne({ login });
    }

    updatePassword(id: mongoose.Types.ObjectId, password: string) {
        return admins.updateOne({ _id: id }, { $set: { password } });
    }
}
