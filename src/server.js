const express = require('express');
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


app.listen(config.app.port, () => {
    console.log(`Servidor corriendo en el puerto ${config.app.port} (${config.app.env})`);
});