const express = require('express');
const config = require('./config');

// Importamos los módulos de WhatsApp y la integración con n8n
const { verificarWebhook } = require('./whatsapp/verify');
const { enviarMensaje } = require('./whatsapp/client');
const { enviarAN8N } = require('./integrations/n8n'); // <-- Tu nuevo módulo de integración

const app = express();
app.use(express.json());

// 1. Ruta GET para la verificación de Meta (Webhook)
app.get('/webhook', (req, res) => {
    verificarWebhook(req, res);
});

// 2. Ruta POST para recibir mensajes de WhatsApp
app.post('/webhook', async (req, res) => {
    const body = req.body;

    if (body.object === 'whatsapp_business_account') {
        if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages) {
            const mensajeInfo = body.entry[0].changes[0].value.messages[0];
            const remitente = mensajeInfo.from;
            const textoCliente = mensajeInfo.text ? mensajeInfo.text.body.trim() : '';

            console.log(`[Servidor] Mensaje recibido de ${remitente}: ${textoCliente}`);

            try {
                // Delegamos la petición a tu integración con n8n
                const respuestaN8N = await enviarAN8N(remitente, textoCliente);

                // Extraemos el texto que devuelve n8n (o ponemos un respaldo por defecto)
                const respuestaTexto = respuestaN8N.respuesta || '¡Hola! Procesando tu solicitud en Tornillos Águila...';

                // Enviamos la respuesta de vuelta al usuario por WhatsApp
                await enviarMensaje(remitente, respuestaTexto);

            } catch (error) {
                console.error('Error al procesar el mensaje con n8n:', error.message);
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