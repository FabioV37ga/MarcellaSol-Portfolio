import u from "umbrellajs";

interface baseElements{
    mobile_expand_button: HTMLElement,
    desktop_nav_home: HTMLElement,
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
    // 2. Navegação: último item da área do cliente
    const navigationItems = u(".desktop-navigation-item").nodes as HTMLElement[]
    const desktop_nav_client = navigationItems[navigationItems.length - 1]
    // 3. Botão de disconnect
    const desktop_logout = u(".logout-desktop").first() as HTMLElement

    // console.log(desktop_logout)

    return {
        mobile_expand_button,
        desktop_nav_home,
        desktop_nav_client,
        desktop_logout
    }
}

export {getBaseElements, baseElements}
