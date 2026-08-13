
var enviroment = window.location.hostname === 'localhost'
  ? 'development'
  : 'production';


export const config = {
  apiBaseUrl: enviroment === 'development'
    ? 'http://localhost:3000/api'
    : 'https://marcellasol.com.br/api',
};