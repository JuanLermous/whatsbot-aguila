const axios = require('axios');

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

/**
 * Envía el mensaje del usuario a n8n para que sea procesado por IA o flujos automatizados
 * @param {string} remitente - Número de teléfono de WhatsApp del cliente
 * @param {string} mensaje - Texto enviado por el usuario
 */
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