// Função que gera o código de convite para o lobby.

export function generateInviteCode(): string {
    const keys = "abcdefghijklmnopqrstuvwxyz0123456789";

    let inviteCode = '';

    for (let i = 0; i < 6; i++) {
        const randomKey = Math.floor(Math.random() * 36);
        inviteCode += keys[randomKey];
    }

    return inviteCode;
}

