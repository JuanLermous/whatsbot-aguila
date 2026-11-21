// Flujo de cotizaciones

const {
    guardarEstadoUsuario,
    limpiarEstadoUsuario
} = require('../db/queries');


// INICIAR FLUJO DE COTIZACION
async function iniciar(remitente) {

    await guardarEstadoUsuario(remitente, 'COTIZADOR_ARTICULO', {});

    return '💲 *Cotizador Tornillos Águila*\n\n' +
           'Escríbeme el nombre, medida o código del artículo que deseas cotizar. \n\n' +
           'Si no conoces nuestros productos y precios, visita el siguiente enlace:\n\n' +
           '👉 https://tornillosaguila.github.io/cat.html';
}


// PROCESAR RESPUESTA DEL CLIENTE
async function procesar(remitente, textoLimpio) {

    await limpiarEstadoUsuario(remitente);

    return `🔎 Recibí tu solicitud de cotización para: *${textoLimpio}*.`;
}


module.exports = {
    iniciar,
    procesar
};