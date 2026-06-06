import { game } from "./game.model.js";
import { player } from "./player.model.js";
// importar game

export interface lobby {
    id: string;
    host: player;
    players: player[];
    words: string[]
    state: string;
    game: game
    // incluir instancia de game, criada quando a sala foi criada, retornada pelo socket ao .on() de -player-joined?
}

