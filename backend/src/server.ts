import { loadApplicationConfig } from "./config/application-config.js";

try {
    const config = loadApplicationConfig();
    console.log(`✓ Configuração validada e carregada de ${config.environmentPath}`);
    const { startServer } = await import("./bootstrap.js");
    await startServer(config);
} catch (error) {
    console.error("✗ Não foi possível iniciar o backend:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
}
