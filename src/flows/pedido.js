// Flujo de pedidos

const {
    guardarEstadoUsuario,
    limpiarEstadoUsuario
} = require('../db/queries');


// INICIAR FLUJO DE PEDIDO
async function iniciar(remitente) {

    await guardarEstadoUsuario(remitente, 'PEDIDO_ARTICULO', {});

    return '🛒 *Hacer Pedido*\n\n' +
           'Por favor, indícanos el articulo a pedir. \n\n' +
           'Si no conoces nuestros productos y precios, visita el siguiente enlace:\n\n' +
           '👉 https://tornillosaguila.github.io/cat.html';
}


// PROCESAR RESPUESTA DEL CLIENTE
async function procesar(remitente, textoLimpio) {

    await limpiarEstadoUsuario(remitente);

    return `🛒 Registrando solicitud de pedido para: *${textoLimpio}*.`;
}


module.exports = {
    iniciar,
    procesar
};