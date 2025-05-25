import axios from 'axios';

const api = axios.create({
  baseURL: 'https://ourbook-j73l.onrender.com', // URL do seu backend
});

export default api;