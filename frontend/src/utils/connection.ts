
// Detecta se está em desenvolvimento (localhost ou IP privado)
function isDevelopment() {
  const hostname = window.location.hostname;
  return hostname === 'localhost' || 
         hostname.startsWith('127.') || 
         hostname.startsWith('192.168.') ||
         hostname.startsWith('10.') ||
         hostname === '[::1]'; // IPv6 localhost
}

var enviroment = isDevelopment() ? 'development' : 'production';

export const config = {
  apiBaseUrl: enviroment === 'development'
    ? `http://${window.location.hostname}:3000/api`
    : 'https://marcellasol.com.br/api',
};