// Opciones estáticas e informativas

const {
    guardarEstadoUsuario,
    limpiarEstadoUsuario
} = require('../db/queries');


// PROCESAR OPCIONES INFORMATIVAS
async function procesarOpcionMenu(remitente, textoLimpio) {

    if (textoLimpio === 'ubicacion') {

        return 'Tornillos Aguila https://maps.app.goo.gl/KdwXfM438AKBDbdr5';
    }

    if (textoLimpio === 'horarios') {

        return 'Horario de atención - Tornillos Águila \n' +
               'Lunes a Viernes: 8:00 a.m. - 6:00 p.m. \n' +
               'Sábados: 9:00 a.m. - 2:00 p.m. \n' +
               'Domingos: Cerrado';
    }

    if (textoLimpio === 'contacto') {

        return '📞 Números de contacto – Tornillos Águila \n\n' +
               'Si deseas comunicarte con un área específica, por favor marca o envía un mensaje de WhatsApp al número correspondiente: \n\n' +
               '🛠️ Ventas: 618 134 1297 \n\n' +
               '💳 Crédito: 618 144 0389 \n\n' +
               '📦 Compras: 618 170 3831';
    }

    if (textoLimpio === 'catalogo') {

        return '🔧 Catálogo de Tornillos Águila 🔧 \n' +
               'Consulta nuestros productos, precios y recursos en el siguiente enlace:\n\n' +
               '👉 https://tornillosaguila.github.io/cat.html \n\n' +
               'Estamos a tus órdenes para cualquier cotización o pedido.';
    }

    if (textoLimpio === 'sugerencias') {

        await guardarEstadoUsuario(remitente, 'SUGERENCIAS', {});

        return '🙏🏻 Por favor, envíe su sugerencia. Agradecemos su aporte.';
    }

    return undefined;
}


// PROCESAR RESPUESTA DE SUGERENCIAS
async function procesar(remitente, sesion, textoLimpio) {

    if (sesion.flujo === 'SUGERENCIAS') {

        await limpiarEstadoUsuario(remitente);

        return '✅ Gracias por compartir tu sugerencia. Agradecemos tu aporte.';
    }

    return undefined;
}


module.exports = {
    procesarOpcionMenu,
    procesar
};