import { assets } from "./assetList.util.js";

export async function preloadAssets(onFinish: () => void) {
    await Promise.all(
        assets.map(src => {
            return new Promise<void>((resolve) => {

                const img = new Image();
                img.src = src;

                img.onload = () => {
                    console.log("[front] (pre-load) imagem carregada:", img)
                    resolve()
                };
            });
        })
    );
    
    console.log("[front] (pre-load) Assets pré-carregados")
    onFinish()
    return true
}