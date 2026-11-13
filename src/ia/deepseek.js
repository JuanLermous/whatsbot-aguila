// src/ia/deepseek.js
// Consulta la API de DeepSeek como asistente de Tornillos Águila.
// Requiere Node 18+ (fetch incluido).

const config = require('../config');

const SYSTEM_PROMPT = `Eres el asistente virtual de "Tornillos Águila", una ferretería especializada en tornillería y fijación.
Reglas:
- Responde siempre en español, de forma amable, breve y clara (máximo 5 renglones, es WhatsApp).
- Ayuda con recomendaciones técnicas: tipo de tornillo, grado, material, medida y uso.
- NUNCA inventes precios ni existencias. Si preguntan por precio o disponibilidad y no se te proporcionan datos del inventario, di que un asesor lo confirmará o que consulten la opción correspondiente del menú.
- Si se te proporcionan datos del inventario, úsalos tal cual para redactar la respuesta, sin cambiar cifras.
- Si la pregunta no tiene relación con la ferretería, responde amablemente que solo puedes ayudar con temas de Tornillos Águila.`;

const MENSAJE_ERROR =
    'Lo siento, en este momento no puedo responder tu consulta. Un asesor de Tornillos Águila te atenderá pronto 🙏';

// Historial en memoria por cliente (clave: número de WhatsApp).
const historial = new Map();
const MAX_MENSAJES = 10; // cuántos mensajes recordar por cliente
const TIMEOUT_MS = 20000;

/**
 * Pregunta a DeepSeek y devuelve el texto de la respuesta.
 * @param {string} userId       Número de WhatsApp del cliente (para el historial).
 * @param {string} textoUsuario Mensaje que escribió el cliente.
 * @param {string} [datosExtra] Datos reales (ej. resultado de Firebird) para que DeepSeek solo redacte.
 * @returns {Promise<string>}
 */
async function preguntarDeepSeek(userId, textoUsuario, datosExtra = '') {
    if (!config.deepseek.apiKey) {
        console.error('[DeepSeek] Falta DEEPSEEK_API_KEY en el .env');
        return MENSAJE_ERROR;
    }

    const previo = historial.get(userId) || [];

    const contenidoUsuario = datosExtra
        ? `${textoUsuario}\n\n[Datos del inventario]: ${datosExtra}`
        : textoUsuario;

    const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...previo,
        { role: 'user', content: contenidoUsuario }
    ];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        const res = await fetch(config.deepseek.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${config.deepseek.apiKey}`
            },
            body: JSON.stringify({
                model: config.deepseek.model,
                messages,
                temperature: 0.5,
                max_tokens: 400,
                stream: false
            }),
            signal: controller.signal
        });

        if (!res.ok) {
            const detalle = await res.text();
            throw new Error(`HTTP ${res.status}: ${detalle}`);
        }

        const data = await res.json();
        const respuesta = data.choices?.[0]?.message?.content?.trim();
        if (!respuesta) throw new Error('Respuesta vacía de DeepSeek');

        // Guardamos en el historial el mensaje original (sin los datos extra)
        const nuevo = [
            ...previo,
            { role: 'user', content: textoUsuario },
            { role: 'assistant', content: respuesta }
        ].slice(-MAX_MENSAJES);
        historial.set(userId, nuevo);

        return respuesta;
    } catch (err) {
        console.error('[DeepSeek] Error:', err.message);
        return MENSAJE_ERROR;
    } finally {
        clearTimeout(timeout);
    }
}

module.exports = { preguntarDeepSeek };