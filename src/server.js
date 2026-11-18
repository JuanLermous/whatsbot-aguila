
const express = require('express');
const config = require('./config');

// Importación de módulos del bot, IA y pasarela de eventos
const { verificarWebhook } = require('./whatsapp/verify');
const { enviarMensaje } = require('./whatsapp/client');
const { preguntarDeepSeek } = require('./ia/deepseek');
// const { consultarFirebird } = require('./services/firebird'); // Descomenta cuando conectes tu microservicio de datos
const { enviarAN8N } = require('./integrations/n8n'); // Event Sink para n8n en segundo plano

const app = express();
app.use(express.json());

// 1. Ruta GET para la verificación del Webhook de Meta (WhatsApp)
app.get('/webhook', (req, res) => {
    verificarWebhook(req, res);
});

// 2. Ruta POST para recibir los mensajes de WhatsApp
app.post('/webhook', async (req, res) => {
    const body = req.body;

    if (body.object === 'whatsapp_business_account') {
        if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages) {
            const mensajeInfo = body.entry[0].changes[0].value.messages[0];
            const remitente = mensajeInfo.from;
            const textoCliente = mensajeInfo.text ? mensajeInfo.text.body.trim() : '';

            console.log(`[Servidor Bot] Mensaje recibido de ${remitente}: "${textoCliente}"`);

            try {
                // PASO 1 (Opcional): Consultar stock/precios en Firebird/Microsip si el mensaje lo requiere
                // const datosInventario = await consultarFirebird(textoCliente);

                // PASO 2: Consultar a DeepSeek pasando el ID del cliente para mantener el historial y el texto libre
                const respuestaBot = await preguntarDeepSeek(remitente, textoCliente /*, datosInventario*/);

                // PASO 3: Responder de inmediato al cliente a través de la API de Meta (WhatsApp)
                await enviarMensaje(remitente, respuestaBot);

                // PASO 4: Emitir el evento a n8n en segundo plano (Asíncrono y no bloqueante)
                // Se usa .catch() para asegurar que si n8n llega a fallar, la conversación del bot jamás se interrumpa
                enviarAN8N(remitente, textoCliente, respuestaBot).catch(err => {
                    console.error('[Segundo Plano] Error al notificar evento a n8n:', err.message);
                });

            } catch (error) {
                console.error('[Error Crítico en Servidor]:', error.message);
                await enviarMensaje(remitente, 'Lo sentimos, en este momento tenemos un detalle técnico. Inténtalo más tarde.');
            }
        }
        res.status(200).send('EVENT_RECEIVED');
    } else {
        res.sendStatus(404);
    }
});

app.listen(config.app.port, () => {
    console.log(`[Tornillos Águila Bot] Servidor core corriendo en el puerto ${config.app.port}`);
});