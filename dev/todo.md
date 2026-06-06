# Primary

todo:
    @funções
    → Desenvolver listeners de disconnect (saída passiva - fechar brownser, por exemplo)
    → Desenvolver desconexão manual (sair do lobby, voltar a para join ou create, etc.)
    
    @emits de erros
    → Adicionar efeitos visuals de erro de create (Palavras insuficientes)
    → Adicionar efeitos visuais de erro de join (código incorreto)
    → Adicionar efeitos visuais de erro de autenticação (dados insuficientes).

    @game
    → Desenvolver host.startgame

    @extra
    → Adicionar função para salvar palavras confirmadas em cache (criação de sala)?

    @late dev
    → Ajustar tamanhos para o mobile, eles parecem quebrar em dispositivos mobile apesar de funcionarem na responsividade do navegador.

# Concepts

    → Definir estrutura do jogo

        → Jogo vai ser armazenado dentro de lobby?
            - Armazenar em lobby significa alterar interface lobby nos 2 ends.
            - acho que vale mais a pena, apesar de ser armazenado junto, pode ser controlado separadamente, em partes.
            algo do tipo:
                {
                    id (invite): string
                    host: {player}
                    players: {player[]}
                    words: string[]
                    game: game
                        - state: string(choosingImpostor, playerAsking (repete), playersVoting, showingResults, gameRestarting)
                        - impostor: player
                        - ordem: {players[].shuffle}
                        - turn: {player} ?
                        - selectedWord: string
                }

        → Jogo vai ser armazenado alheio à lobby, e vão estar relacionados por invitecode?
            - Relacionar por invite code precisa de outra função com findbyindex, vale a pena?
        


# Structure

<!-- estrutura de usuário salvo no cache -->

var b = '{"nickname": "veiga","character": "2","id": "10"}'

localStorage.setItem("impostor_player_data", b)
localStorage.getItem("impostor_player_data")
localStorage.removeItem("impostor_player_data")




# Notes

→ Jogador lança evento ao servidor

  <!-- 
document.querySelector("body")?.addEventListener("keydown", (event) => {
     if (event.code === "Space") {
         console.log("spacebar!")
         ClientController.socket.emit(`${ClientController.temp}-spacebar`, ClientController.socket.id, () => {

         })
     }
 })
 -->
 

→ Servidor recebe o evento e manda de volta ao jogador
<!--
if (/^.+-spacebar/.test(event)) {
    console.log("evento de spacebar recebido:", event, args)
    socket.emit("spacebar-received", event, args)

} 
-->


→ Cliente dos jogadores atualiza com evento
<!-- 
 ClientController.socket.on("spacebar-received", (event, args) => {
     console.log("spacebar recebido de volta:", event, args)
 }) 
 -->