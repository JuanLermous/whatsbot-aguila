const axios = require('axios');

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

/**
 * Envía un evento asíncrono a n8n para bitácoras, correos o avisos en segundo plano.
 * @param {string} remitente - Número de teléfono de WhatsApp del cliente
 * @param {string} mensajeCliente - Texto enviado por el usuario
 * @param {string} respuestaBot - Respuesta generada por el bot (DeepSeek / Sistema)
 */
async function enviarAN8N(remitente, mensajeCliente, respuestaBot) {
    if (!N8N_WEBHOOK_URL) {
        console.warn('[n8n] N8N_WEBHOOK_URL no está configurado en el .env. Se omite el evento.');
        return;
    }

    try {
        const response = await axios.post(N8N_WEBHOOK_URL, {
            remitente,
            mensajeCliente,
            respuestaBot,
            timestamp: new Date().toISOString()
        });
        
        return response.data;
    } catch (error) {
        // Nota: Un fallo en n8n no debe interrumpir ni tirar la conversación de WhatsApp
        console.error('Error al emitir evento en segundo plano a n8n:', error.message);
    }
}

module.exports = { enviarAN8N };