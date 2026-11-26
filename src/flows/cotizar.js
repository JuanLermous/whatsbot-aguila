
const {
    guardarEstadoUsuario,
    obtenerEstadoUsuario,
    limpiarEstadoUsuario,
    buscarArticulosConPrecio
} = require('../db/queries');

// INICIAR FLUJO DE COTIZACION
async function iniciar(remitente, datos = {}) {
    const articulo = datos.articulo || datos.clave;

    await guardarEstadoUsuario(
        remitente,
        'COTIZADOR_ARTICULO',
        {}
    );

    if (articulo) {
        return await buscarArticulo(remitente, articulo);
    }

    return '💲 *Cotizador Tornillos Águila*\n\n' +
        'Escríbeme el nombre, medida o código del artículo que deseas cotizar.\n\n' +
        'Si no conoces nuestros productos y precios, visita el siguiente enlace:\n\n' +
        '👉 https://tornillosaguila.github.io/cat.html';
}


// PROCESAR RESPUESTAS DEL CLIENTE
async function procesar(remitente, textoLimpio) {
    const sesion = await obtenerEstadoUsuario(remitente);
    const datos = sesion.datos || {};

    switch (sesion.flujo) {

        // ETAPA 1: BUSCAR ARTICULO
        case 'COTIZADOR_ARTICULO':
            return await buscarArticulo(remitente, textoLimpio);


        // ETAPA 2: SELECCIONAR ARTICULO
        case 'COTIZADOR_SELECCION': {
            const seleccion = Number(textoLimpio);

            if (
                !Number.isInteger(seleccion) ||
                seleccion < 1 ||
                seleccion > datos.opciones.length
            ) {
                return '⚠️ Selecciona una opción válida escribiendo su número.';
            }

            const articulo = datos.opciones[seleccion - 1];

            return await seleccionarArticulo(remitente, articulo);
        }


        // ETAPA 3: SOLICITAR CANTIDAD
        case 'COTIZADOR_CANTIDAD': {
            const cantidad = Number(textoLimpio);

            if (
                !Number.isFinite(cantidad) ||
                cantidad <= 0
            ) {
                return '⚠️ Ingresa una cantidad numérica mayor que cero.';
            }

            datos.cantidad = cantidad;

            const precio = Number(datos.articuloSeleccionado.PRECIO);
            datos.total = precio * cantidad;

            await guardarEstadoUsuario(
                remitente,
                'COTIZADOR_RESUMEN',
                datos
            );

            return construirResumen(datos);
        }


        // ETAPA 4: FINALIZAR COTIZACION
        case 'COTIZADOR_RESUMEN': {

            if (
                textoLimpio === 'si' ||
                textoLimpio === 'sí' ||
                textoLimpio === 'confirmar'
            ) {
                await limpiarEstadoUsuario(remitente);

                return '✅ *Solicitud de cotización recibida*\n\n' +
                    'Tu cotización preliminar ha sido generada con los datos proporcionados.\n\n' +
                    'Un asesor deberá continuar con la atención para validar los precios y condiciones.';
            }

            if (
                textoLimpio === 'no' ||
                textoLimpio === 'cancelar'
            ) {
                await limpiarEstadoUsuario(remitente);

                return '❌ Cotización cancelada. Escribe *hola* para regresar al menú principal.';
            }

            return '⚠️ Responde *SI* para finalizar la solicitud o *NO* para cancelarla.';
        }


        default:
            await limpiarEstadoUsuario(remitente);

            return 'No pude continuar con tu cotización. Escribe *hola* para comenzar nuevamente.';
    }
}


// BUSCAR ARTICULOS EN FIREBIRD
async function buscarArticulo(remitente, texto) {
    const articulos = await buscarArticulosConPrecio(texto);

    if (!articulos || articulos.length === 0) {
        await guardarEstadoUsuario(
            remitente,
            'COTIZADOR_ARTICULO',
            {}
        );

        return '❌ No encontré artículos que coincidan con tu búsqueda.\n\n' +
            'Intenta escribir otro nombre, medida o código.';
    }


    // SI SOLAMENTE EXISTE UNA COINCIDENCIA
    if (articulos.length === 1) {
        return await seleccionarArticulo(remitente, articulos[0]);
    }


    // SI EXISTEN VARIAS COINCIDENCIAS
    const opciones = articulos.map(a => ({
        ARTICULO_ID: a.ARTICULO_ID,
        NOMBRE: a.NOMBRE,
        UNIDAD_VENTA: a.UNIDAD_VENTA,
        PRECIO: a.PRECIO,
        MONEDA_ID: a.MONEDA_ID
    }));

    await guardarEstadoUsuario(
        remitente,
        'COTIZADOR_SELECCION',
        { opciones }
    );

    let respuesta = '🔎 *Artículos encontrados para cotizar*\n\n';

    opciones.forEach((articulo, indice) => {
        respuesta += `${indice + 1}. ${articulo.NOMBRE}\n`;
        respuesta += `   Precio: ${articulo.PRECIO ?? 'No configurado'}\n\n`;
    });

    respuesta += 'Escribe el número del artículo que deseas cotizar.';

    return respuesta;
}


// SELECCIONAR ARTICULO Y SOLICITAR CANTIDAD
async function seleccionarArticulo(remitente, articulo) {
    if (
        articulo.PRECIO === null ||
        articulo.PRECIO === undefined ||
        !Number.isFinite(Number(articulo.PRECIO))
    ) {
        await guardarEstadoUsuario(
            remitente,
            'COTIZADOR_ARTICULO',
            {}
        );

        return '⚠️ El artículo seleccionado no tiene un precio configurado en la lista PUBLICO.\n\n' +
            'Por favor, intenta con otro artículo.';
    }

    const datos = {
        articuloSeleccionado: articulo
    };

    await guardarEstadoUsuario(
        remitente,
        'COTIZADOR_CANTIDAD',
        datos
    );

    return '✅ Artículo seleccionado: *' + articulo.NOMBRE + '*\n\n' +
        `Precio: ${articulo.PRECIO}\n` +
        `Unidad de venta: ${articulo.UNIDAD_VENTA || 'No especificada'}\n\n` +
        '¿Qué cantidad deseas cotizar?';
}


// CONSTRUIR RESUMEN DE COTIZACION
function construirResumen(datos) {
    const articulo = datos.articuloSeleccionado;

    return '📋 *Resumen de tu cotización*\n\n' +
        `Artículo: ${articulo.NOMBRE}\n` +
        `Cantidad: ${datos.cantidad}\n` +
        `Precio unitario: ${articulo.PRECIO}\n` +
        `Importe estimado: ${Number(datos.total).toFixed(2)}\n\n` +
        '¿Deseas finalizar esta solicitud de cotización?\n\n' +
        'Escribe *SI* para finalizar o *NO* para cancelar.';
}


module.exports = {
    iniciar,
    procesar
};
