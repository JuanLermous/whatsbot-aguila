const axios = require('axios');

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

   {string} remitente // Número de teléfono de WhatsApp del cliente
   {string} mensaje // Texto enviado por el usuario
 
async function enviarAN8N(remitente, mensaje) {
    try {
        const response = await axios.post(N8N_WEBHOOK_URL, {
            remitente,
            mensaje
        });
        return response.data; // Espera un objeto como { respuesta: "Texto del bot" }
    } catch (error) {
        console.error('Error al emitir evento a n8n:', error.message);
        throw error;
    }
}

module.exports = { enviarAN8N };