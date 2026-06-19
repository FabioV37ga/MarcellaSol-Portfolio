import u from "umbrellajs";

export interface elements{
    homePageLogo: HTMLElement;
    homePageTitle: HTMLElement;
    homePageWelcome: HTMLElement;

}

export function homePageElements():elements{
    return {
        homePageLogo: u('#homePage-welcome-logo path').first() as HTMLElement,
        homePageTitle: u('#homePage-welcome-title').first() as HTMLElement,
        homePageWelcome: u(".homePage-welcome").first() as HTMLElement
    }
}