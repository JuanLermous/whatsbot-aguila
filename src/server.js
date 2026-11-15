const express = require('express');
const axios = require('axios');
const config = require('./config');

// Importamos los módulos que creaste en tu carpeta whatsapp/
const { verificarWebhook } = require('./whatsapp/verify');
const { enviarMensaje } = require('./whatsapp/client');

const app = express();
app.use(express.json());

// URL de tu Webhook de n8n (puedes cambiarla por tu variable de entorno en .env)
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/tu-token-unico';

// 1. Ruta GET para la verificación de Meta (utiliza verify.js)
app.get('/webhook', (req, res) => {
    verificarWebhook(req, res);
});

// 2. Ruta POST para recibir mensajes, enviarlos a n8n y responder
app.post('/webhook', async (req, res) => {
    const body = req.body;

    if (body.object === 'whatsapp_business_account') {
        if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages) {
            const mensajeInfo = body.entry[0].changes[0].value.messages[0];
            const remitente = mensajeInfo.from;
            const textoCliente = mensajeInfo.text ? mensajeInfo.text.body.trim() : '';

            console.log(`[Servidor] Mensaje recibido de ${remitente}: ${textoCliente}`);

            try {
                // Reenviamos el mensaje a n8n para que procese el flujo híbrido (IA / Menú / BD)
                const n8nResponse = await axios.post(N8N_WEBHOOK_URL, {
                    remitente: remitente,
                    mensaje: textoCliente
                });

                // Obtenemos la respuesta procesada que regresa n8n
                const respuestaTexto = n8nResponse.data.respuesta || '¡Hola! Procesando tu solicitud en Tornillos Águila...';

                // Usamos nuestro módulo modular client.js para enviar la respuesta al usuario
                await enviarMensaje(remitente, respuestaTexto);

            } catch (error) {
                console.error('Error al comunicarse con n8n:', error.message);
                await enviarMensaje(remitente, 'Lo sentimos, en este momento tenemos un pequeño detalle técnico. Inténtalo más tarde.');
            }
        }
        res.status(200).send('EVENT_RECEIVED');
    } else {
        res.sendStatus(404);
    }
});

app.listen(config.app.port, () => {
    console.log(`Servidor de Tornillos Águila corriendo en el puerto ${config.app.port}`);
});