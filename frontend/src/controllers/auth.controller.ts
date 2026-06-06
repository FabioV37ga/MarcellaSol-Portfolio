import u from "umbrellajs";
import { getElements, authElements } from "../selectors/auth.selector.js";
import AuthView from "../views/auth.view.js";
import { mobileNavigation } from "../utils/mobileNavigation.util.js";

interface user {
    id: string
    isHost: boolean
    nickname: string
    character: string
}

class AuthController {
    static user: user;
    view!: AuthView;
    elements!: authElements;
    id!: string;
    userData: user;
    callback: () => void;


    constructor(userID: string, callback: () => void) {

        if (!mobileNavigation.isRenderingFromPopstate) {
            history.pushState({tela: "auth"}, '', '')
        }

        this.callback = callback
        
        var localStorageCache = localStorage.getItem("impostor_player_data")
        var cache: user | null = localStorageCache ? JSON.parse(localStorageCache) : null

        this.userData = {
            id: userID,
            isHost: false,
            nickname: cache ? cache.nickname : "",
            character: cache ? cache.character : "charMale",
        }

        AuthController.user = this.userData

        this.initialize()

        if (cache)
            if (cache.nickname && cache.character) {
                console.log("cache encontrado, preenchendo dados do usuário:", cache)
                this.view.fillFormWithCache(cache)
            }
        else{
            console.log("nenhum cache encontrado, aguardando preenchimento dos dados do usuário")
        }

    }

    initialize() {
        this.view = new AuthView()
        this.elements = getElements()
        this.addEventListeners()
    }


    addEventListeners() {
        // console.log("created!")
        u(this.elements.nicknameInput).on("input", (event) => {

            const target = event.target as HTMLInputElement
            this.setNickname(target.value)
        })

        u(this.elements.characterInputs[0]).on("click", () => {
            this.setCharacter("charMale")
        })

        u(this.elements.characterInputs[1]).on("click", () => {
            this.setCharacter("charFemale")
        })

        u(this.elements.confirmButton).on("click", () => {
            this.confirmAuth()
        })
    }

    setNickname(nickname: string) {
        this.userData.nickname = nickname
        AuthController.user = this.userData
        console.log("nickname atualizado:", nickname)
    }

    setCharacter(character: string) {
        this.userData.character = character
        AuthController.user = this.userData
        console.log(AuthController.user)
        this.view.selectCharacter(character)
    }

    confirmAuth(){
        if (this.userData.nickname && this.userData.character) {
            console.log("autenticando usuário:", this.userData)
            localStorage.setItem("impostor_player_data", JSON.stringify(this.userData))
            this.view.remove(this.elements.authScreen)
            
            this.callback()
        }else{
            console.log("dados incompletos, não cofirmando autenticação")
        }
    }
    // input()
}

export default AuthController