const axios = require('axios');
const config = require('../config'); 

const N8N_WEBHOOK_URL = config.n8n.webhookUrl;

/**
 * Envía un evento asíncrono a n8n para bitácoras, correos o avisos en segundo plano.
 * @param {string} remitente - Número de teléfono de WhatsApp del cliente
 * @param {string} textoCliente - Texto enviado por el usuario
 * @param {string} textoLog - Respuesta generada por el bot (DeepSeek / Sistema)
 */
async function enviarAN8N(remitente, textoCliente, textoLog) {
    if (!N8N_WEBHOOK_URL) {
        console.warn('[n8n] N8N_WEBHOOK_URL no está configurado en el .env. Se omite el evento.');
        return;
    }

    try {
        //aqui se manda el json con los datos del remitente, mensajeCliente y respuestaBot al webhook de n8n
        const response = await axios.post(N8N_WEBHOOK_URL, {
            remitente,
            textoCliente,
            textoLog,
            timestamp: new Date().toISOString()
        });
        
        return response.data;
    } catch (error) {
        // Nota: Un fallo en n8n no debe interrumpir ni tirar la conversación de WhatsApp
        console.error('Error al emitir evento en segundo plano a n8n:', error.message);
    }
}

module.exports = { enviarAN8N };