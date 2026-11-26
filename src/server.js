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
const { procesarMensajeEntrante } = require('./flows/index');

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
            const textoCliente = mensajeInfo.text
                ? mensajeInfo.text.body.trim()
                : (mensajeInfo.type === 'interactive' && mensajeInfo.interactive?.type === 'list_reply'
                    ? mensajeInfo.interactive.list_reply.id
                    : '');

            console.log(`[Servidor Bot] Mensaje recibido de ${remitente}: "${textoCliente}"`);

            try {

                // PASO 1: Resolver respuesta a través de flujos deterministas (flows/index y flows/menu)
             //   console.log('[DEBUG] Iniciando procesamiento del mensaje');

                const respuestaFinal = await procesarMensajeEntrante(remitente, textoCliente);

               // console.log('[DEBUG] Respuesta generada:', respuestaFinal);

                //console.log('[DEBUG] Enviando respuesta a WhatsApp');

                await enviarMensaje(remitente, respuestaFinal);

                //console.log('[DEBUG] Respuesta enviada correctamente');

                // PASO 2: Responder de inmediato al cliente a través de la API de Meta (WhatsApp)
                const textoLog = typeof respuestaFinal === 'string'
                    ? respuestaFinal
                    : (respuestaFinal?.interactive?.body?.text || '[Menú interactivo Tornillos Águila]');

                // ---------------------------------------------------------
                // PASO 3: Guardar en la bitácora de Firebird en segundo plano
                // ---------------------------------------------------------
                guardarBitacora(remitente, textoCliente, textoLog).catch(err => {
                    console.error('Fallo al registrar en la bitácora de Firebird:', err);
                });

                // ---------------------------------------------------------
                // PASO 5: Emitir el evento a n8n en segundo plano (para correos y avisos)
                // ---------------------------------------------------------
               enviarAN8N(remitente, textoCliente, textoLog).catch(err => {
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