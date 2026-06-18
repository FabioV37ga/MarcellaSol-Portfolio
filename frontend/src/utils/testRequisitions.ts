var enviroment = window.location.hostname === 'localhost'
  ? 'development'
  : 'production';

export const config = {
  apiBaseUrl: enviroment === 'development'
    ? 'http://localhost:3000/api'
    : 'https://marcellasol.com.br/api',
};

// Verificar saúde do servidor
export async function checkHealth() {
  console.log(config.apiBaseUrl)
  try {
    const response = await fetch(`${config.apiBaseUrl}/health`);
    const data = await response.json();
    console.log('✓ Health Check:', data);

    // Mostrar resultado na página
    const healthDiv = document.createElement('div');
    healthDiv.style.cssText = 'padding: 10px; margin: 10px; background: #f0f0f0; border-radius: 4px; font-family: monospace; position: absolute; bottom: 0; z-index: 10; opacity: 0.35';
    healthDiv.innerHTML = `<strong>Backend Status:</strong><br>${JSON.stringify(data, null, 2)}`;
    document.body.appendChild(healthDiv);

    return data;
  } catch (error) {
    console.error('✗ Erro ao conectar ao backend:', error);

    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = 'padding: 10px; margin: 10px; background: #ffcccc; border-radius: 4px; font-family: monospace; position: absolute; bottom: 0; z-index: 10; opacity: 0.35';
    errorDiv.innerHTML = `<strong>Erro:</strong> Não foi possível conectar ao backend`;
    document.body.appendChild(errorDiv);
  }
}

export async function testApi() {
  console.log("oi caralho")
  try {
    const response = await fetch(`${config.apiBaseUrl}/test`);
    const data = await response.json();
    
    const testDiv = document.createElement('div');
    testDiv.style.cssText = 'padding: 10px; margin: 10px; background: #f0f0f0; border-radius: 4px; font-family: monospace; position: absolute; bottom: 70px; z-index: 10; opacity: 0.35';
    testDiv.innerHTML = `<strong>Backend requisition status:</strong><br>${JSON.stringify(data, null, 2)}`;
    document.body.appendChild(testDiv);



    console.log('✓ Test Endpoint:', data);
  } catch (error) {
    console.error('✗ Erro ao buscar projeto:', error);
  }
}
