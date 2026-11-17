const express = require('express');
const axios = require('axios');
const config = require('./config');

// Importar los módulos de la carpeta whatsapp/
const { verificarWebhook } = require('./whatsapp/verify');
const { enviarMensaje } = require('./whatsapp/client');

const app = express();
app.use(express.json());

// URL de tu webhook en n8n (puedes cambiarla o pasarla a tu archivo .env)
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/tu-token-unico';

// 1. Ruta GET para la verificación de Meta (utiliza verify.js)
app.get('/webhook', (req, res) => {
    verificarWebhook(req, res);
});

// 2. Ruta POST para recibir mensajes de WhatsApp, reenviarlos a n8n y responder
app.post('/webhook', async (req, res) => {
    const body = req.body;

    if (body.object === 'whatsapp_business_account') {
        if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages) {
            const mensajeInfo = body.entry[0].changes[0].value.messages[0];
            const remitente = mensajeInfo.from;
            const textoCliente = mensajeInfo.text ? mensajeInfo.text.body.trim() : '';

            console.log(`[Servidor] Mensaje recibido de ${remitente}: ${textoCliente}`);

            try {
                // Reenviar el mensaje a n8n para procesar con IA / Base de datos
                const n8nResponse = await axios.post(N8N_WEBHOOK_URL, {
                    remitente: remitente,
                    mensaje: textoCliente
                });

                // Obtener la respuesta que regresa n8n
                const respuestaTexto = n8nResponse.data.respuesta || '¡Hola! Procesando tu solicitud en Tornillos Águila...';

                // Enviar la respuesta de vuelta al usuario por medio del módulo client.js
                await enviarMensaje(remitente, respuestaTexto);

            } catch (error) {
                console.error('Error al comunicarse con n8n:', error.message);
                await enviarMensaje(remitente, 'Lo sentimos, en este momento tenemos un detalle técnico. Inténtalo más tarde.');
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