import ui from "./ui.view.js";
import { joinRoom } from "../templates/joinRoom.template.js";

class JoinRoomView extends ui{
    constructor(){
        super()
        this.render(joinRoom())
    }
}

export default JoinRoomView