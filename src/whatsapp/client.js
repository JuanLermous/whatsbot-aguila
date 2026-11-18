const axios = require('axios');
const config = require('../config');

const TOKEN = config.whatsapp.accessToken;
const PHONE_ID = config.whatsapp.phoneNumberId;

/*Para depurar variables de entorno
console.log("=== DEBUG WHATSAPP ===");
console.log("Token detectado:", TOKEN ? "Sí (Existe)" : "¡NO! Está undefined");
console.log("Phone ID detectado:", PHONE_ID);
console.log("======================");
*/
const BASE_URL = `https://graph.facebook.com/v17.0/${PHONE_ID}/messages`;

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
                headers: { Authorization: `Bearer ${TOKEN}` }
            }
        );
        return response.data;
    } catch (error) {
        console.error('Error al enviar mensaje de texto:', error.response?.data || error.message);
        throw error;
    }
}

async function enviarMensaje(to, mensaje) {
    return await enviarTexto(to, mensaje);
}

module.exports = {
    enviarMensaje,
    enviarTexto
};