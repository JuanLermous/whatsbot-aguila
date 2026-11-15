//centraliza las variables de entorno 
//por lo que si alguna variable  falta o está mal escrita
//el sistema avisa del error
require('dotenv').config();

const config = {
    app: {
        port: process.env.PORT || 3000,
        env: process.env.NODE_ENV || 'development'
    },
    whatsapp: {
        accessToken: process.env.WA_ACCESS_TOKEN,
        phoneNumberId: process.env.WA_PHONE_NUMBER_ID,
        verifyToken: process.env.WA_VERIFY_TOKEN,
        apiVersion: process.env.WA_API_VERSION || 'v18.0'
    },
    deepseek: {
        apiKey: process.env.DEEPSEEK_API_KEY,
        apiUrl: process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions'
        apiUrl: process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions',
        model: process.env.DEEPSEEK_MODEL || 'deepseek-chat'
    },
    firebird: {
        host: process.env.FB_HOST,
        database: process.env.FB_DATABASE,
        user: process.env.FB_USER,
        password: process.env.FB_PASSWORD,
        port: process.env.FB_PORT || 3050
    },
    n8n: {
        webhookUrl: process.env.N8N_WEBHOOK_URL,
        sharedSecret: process.env.N8N_SHARED_SECRET
    }
};


if (!config.whatsapp.verifyToken) {
    console.warn('WA_VERIFY_TOKEN no está definido');
}

<<<<<<< HEAD
=======
if (!config.deepseek.apiKey) {
    console.warn('DEEPSEEK_API_KEY no está definido');
}

>>>>>>> 2c361406e5c72d6d350e2a670b76e7269df2604b
module.exports = config;