import u from "umbrellajs";

interface baseElements{
    mobile_expand_button: HTMLElement,
    desktop_nav_home: HTMLElement,
    desktop_nav_portfolio: HTMLElement,
    desktop_nav_client: HTMLElement,
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
    const desktop_nav_home = u(".desktop-navigation-item").nodes[0] as HTMLElement
    // 2. Navegação: botão portfolio
    const desktop_nav_portfolio = u(".desktop-navigation-item").nodes[1] as HTMLElement
    // 3. Navegação: botão clientes
    const desktop_nav_client = u(".desktop-navigation-item").nodes[2] as HTMLElement
    // 4. Botão de disconnect
    const desktop_logout = u(".logout-desktop").first() as HTMLElement

    // console.log(desktop_logout)

    return {
        mobile_expand_button,
        desktop_nav_home,
        desktop_nav_portfolio,
        desktop_nav_client,
        desktop_logout
    }
}

export {getBaseElements, baseElements}

