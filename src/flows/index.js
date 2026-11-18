const { enviarAN8N } = require('../integrations/n8n');
const { obtenerRespuestaEstatica } = require('./estatico');

async function procesarMensajeCliente(remitente, textoMensaje) {
    const textoLower = textoMensaje.toLowerCase();

    // 1. Validar flujos estáticos o saludos rápidos
    if (textoLower.includes('hola') || textoLower.includes('menu')) {
        return obtenerRespuestaEstatica('bienvenida');
    }

    // 2. Si requiere lógica compleja, IA o BD, lo derivamos a n8n
    try {
        const resultadoN8N = await enviarAN8N(remitente, textoMensaje);
        return resultadoN8N.respuesta || 'Procesando solicitud en Tornillos Águila...';
    } catch (error) {
        return 'Lo sentimos, en este momento el sistema presenta intermitencias. Intenta más tarde.';
    }
}

module.exports = { procesarMensajeCliente };