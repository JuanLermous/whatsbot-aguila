const axios = require('axios');

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const VERSION = 'v17.0';
const BASE_URL = `https://graph.facebook.com/${VERSION}/${PHONE_NUMBER_ID}/messages`;

/**
 * Enviar mensaje de texto plano por WhatsApp Cloud API
 */
async function enviarTexto(to, mensaje) {
    try {
        const response = await axios.post(
            BASE_URL,
            {
                messaging_product: 'whatsapp',
                to: to,
                type: 'text',
                text: { body: mensaje }
            },
            {
                headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` }
            }
        );
        return response.data;
    } catch (error) {
        console.error('Error al enviar mensaje de texto:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Función comodín requerida por el server.js
 */
async function enviarMensaje(to, mensaje) {
    return await enviarTexto(to, mensaje);
}

module.exports = {
    enviarMensaje,
    enviarTexto
};