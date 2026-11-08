const express = require('express');
const axios = require('axios');
const config = require('./config');

const app = express();
app.use(express.json());

// Ruta raíz de prueba
app.get('/', (req, res) => {
    res.send('¡El servidor del bot de WhatsApp (Arquitectura Modular) está en línea!');
});

// verificación del webhook de meta
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        // Comparamos usando el archivo config.js
        if (mode === 'subscribe' && token === config.whatsapp.verifyToken) {
            console.log('¡Webhook verificado exitosamente!');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    } else {
        res.sendStatus(400);
    }
});

app.post('/webhook', async (req, res) => {
    const body = req.body;

    if (body.object === 'whatsapp_business_account') {
        if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages) {
            const mensajeInfo = body.entry[0].changes[0].value.messages[0];
            const remitente = mensajeInfo.from;
            const textoCliente = mensajeInfo.text ? mensajeInfo.text.body : '';

            console.log('-----------------------------------');
            console.log('¡NUEVO MENSAJE RECIBIDO!');
            console.log('Número del cliente:', remitente);
            console.log('Contenido:', textoCliente);
            console.log('-----------------------------------');

            // Enviar respuesta automática de vuelta
            try {
                const url = `https://graph.facebook.com/v17.0/${config.whatsapp.phoneNumberId}/messages`;

                await axios.post(url, {
                    messaging_product: 'whatsapp',
                    to: remitente,
                    text: { body: '¡Hola! Gracias por comunicarte a Tornillos Águila. Hemos recibido tu mensaje.' }
                }, {
                    headers: {
                        Authorization: `Bearer ${config.whatsapp.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                });

                console.log('Respuesta automática enviada con éxito.');
            } catch (error) {
                console.error('Error al enviar respuesta:', error.response?.data || error.message);
            }
        }
        res.status(200).send('EVENT_RECEIVED');
    } else {
        res.sendStatus(404);
    }
});

app.listen(config.app.port, () => {
    console.log(`Servidor corriendo en el puerto ${config.app.port} (${config.app.env})`);
});