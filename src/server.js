/*ARCHIVO PRINCIPAL DEL SERVIDOR EXPRESS PARA EL BOT DE WHATSAPP DE TORNILLOS ÁGUILA
AQUI SE MANEJAN LAS RUTAS DE WEBHOOK, SE RECIBEN LOS MENSAJES SE PROCESAN CON 
 MENUS DETERMINISTAS, DEEPSEEK, FIREBIRD Y N8N*/

const express = require('express');
const config = require('./config');

// Importación de módulos del bot
const { verificarWebhook } = require('./whatsapp/verify');
const { enviarMensaje } = require('./whatsapp/client');
const { preguntarDeepSeek } = require('./ia/deepseek');
const { consultarFirebird } = require('./db/firebird'); 
const {guardarBitacora} = require('./db/queries');
const { enviarAN8N } = require('./integrations/n8n'); 

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

                // PASO 1: Consultar a DeepSeek pasando el ID del cliente para mantener el historial y el texto libre
               
               
                //  const respuestaBotDeepseek = await preguntarDeepSeek(remitente, textoCliente /*, datosInventario*/);

                // PASO 2: Responder de inmediato al cliente a través de la API de Meta (WhatsApp)
                await enviarMensaje(remitente, /*respuestaBotDeepseek*/ 
                    "mensaje de prueba desde el bot de Tornillos Águila. ¡Gracias por tu mensaje!"); // Cambia esto por respuestaBot cuando integres DeepSeek

                // ---------------------------------------------------------
                // PASO 3: Guardar en la bitácora de Firebird en segundo plano
                // ---------------------------------------------------------
                guardarBitacora(remitente, textoCliente, /*respuestaBotDeepseek*/ "mensaje de respuesta de prueba ").catch(err => {
                    console.error('Fallo al registrar en la bitácora de Firebird:', err);
                });

                // ---------------------------------------------------------
                // PASO 5: Emitir el evento a n8n en segundo plano (para correos y avisos)
                // ---------------------------------------------------------
                enviarAN8N(remitente, textoCliente,/*respuestaBotDeepseek*/  "mensaje de respuesta de prueba ").catch(err => {
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