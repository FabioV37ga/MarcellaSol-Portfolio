import u from "umbrellajs";

interface baseElements{
    mobile_expand_button: HTMLElement,
    desktop_nav_home: HTMLElement,
    desktop_nav_client: HTMLElement,
    desktop_nav_financial: HTMLElement,
    desktop_logout: HTMLElement
}

function getBaseElements(): baseElements {
    // @Elementos gerais (existem em todos os dispositivos)
    // 1. elemento de perfil (desconectar da conta)

    // @Elementos mobile
    // 1. Expand menu button
    const mobile_expand_button = u(".expand-menu").first() as HTMLElement

    // @Elementos desktop
    // 1. Navegação: botão início
    const desktop_nav_home = u("#client-nav-home").first() as HTMLElement
    // 2. Navegação: último item da área do cliente
    const desktop_nav_client = u("#client-nav-stages").first() as HTMLElement
    const desktop_nav_financial = u("#client-nav-financial").first() as HTMLElement
    // 3. Botão de disconnect
    const desktop_logout = u(".logout-desktop").first() as HTMLElement

    // console.log(desktop_logout)

    return {
        mobile_expand_button,
        desktop_nav_home,
        desktop_nav_client,
        desktop_nav_financial,
        desktop_logout
    }
}

export {getBaseElements, baseElements}
