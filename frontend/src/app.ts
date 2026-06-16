var enviroment = window.location.hostname === 'localhost' ? 'development' : 'production';

export const config = {
  apiBaseUrl: enviroment === 'development' ? 'http://localhost:3000' : 'https://marcellasol.com.br:3000',
};

// Verificar saúde do servidor
async function checkHealth() {
    console.log(config.apiBaseUrl)
  try {
    const response = await fetch(`${config.apiBaseUrl}/health`);
    const data = await response.json();
    console.log('✓ Health Check:', data);
    
    // Mostrar resultado na página
    const healthDiv = document.createElement('div');
    healthDiv.style.cssText = 'padding: 10px; margin: 10px; background: #f0f0f0; border-radius: 4px; font-family: monospace;';
    healthDiv.innerHTML = `<strong>Backend Status:</strong><br>${JSON.stringify(data, null, 2)}`;
    document.body.appendChild(healthDiv);
    
    return data;
  } catch (error) {
    console.error('✗ Erro ao conectar ao backend:', error);
    
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = 'padding: 10px; margin: 10px; background: #ffcccc; border-radius: 4px; font-family: monospace;';
    errorDiv.innerHTML = `<strong>Erro:</strong> Não foi possível conectar ao backend`;
    document.body.appendChild(errorDiv);
  }
}

// Executar quando a página carrega
document.addEventListener('DOMContentLoaded', checkHealth);

