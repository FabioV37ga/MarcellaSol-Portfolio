
var enviroment = window.location.hostname === 'localhost'
  ? 'development'
  : 'production';


export const config = {
  apiBaseUrl: enviroment === 'development'
    ? 'http://localhost:3000'
    : 'https://marcellasol.com.br',
};