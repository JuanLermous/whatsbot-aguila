const {
    guardarEstadoUsuario,
    obtenerEstadoUsuario,
    limpiarEstadoUsuario,
    buscarArticulosConPrecio
} = require('../db/queries');

// Iniciar el flujo de pedidos
async function iniciar(remitente, datos = {}) {
    const articulo = datos.articulo || datos.clave;

    await guardarEstadoUsuario(
        remitente,
        'PEDIDO_ARTICULO',
        {}
    );

    if (articulo) {
        return await buscarArticulo(remitente, articulo);
    }

    return '🛒 *Hacer Pedido*\n\n' +
        'Indícanos el nombre, medida o código del artículo que deseas pedir. \n\n' +
        'Si no conoces nuestros productos y precios, visita el siguiente enlace:\n\n' +
        '👉 https://tornillosaguila.github.io/cat.html';;
}

// Procesar las respuestas del cliente
async function procesar(remitente, textoLimpio) {
    const sesion = await obtenerEstadoUsuario(remitente);
    const datos = sesion.datos || {};

    switch (sesion.flujo) {

        // ETAPA 1: Buscar artículo
        case 'PEDIDO_ARTICULO':
            return await buscarArticulo(remitente, textoLimpio);

        // ETAPA 2: Seleccionar artículo
        case 'PEDIDO_SELECCION': {
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

        // ETAPA 3: Solicitar cantidad
        case 'PEDIDO_CANTIDAD': {
            const cantidad = Number(textoLimpio);

            if (
                !Number.isFinite(cantidad) ||
                cantidad <= 0
            ) {
                return '⚠️ Ingresa una cantidad numérica mayor que cero.';
            }

            datos.cantidad = cantidad;

            const precio = Number(datos.articuloSeleccionado.PRECIO);
            const total = precio * cantidad;

            datos.total = total;

            await guardarEstadoUsuario(
                remitente,
                'PEDIDO_CONFIRMACION',
                datos
            );

            return construirResumen(datos);
        }

        // ETAPA 4: Confirmar pedido
        case 'PEDIDO_CONFIRMACION': {
            if (
                textoLimpio === 'si' ||
                textoLimpio === 'sí' ||
                textoLimpio === 'confirmar'
            ) {
                await limpiarEstadoUsuario(remitente);

                return '✅ Tu pedido preliminar ha sido confirmado.\n\n' +
                    'Esta confirmación todavía no registra el pedido en Microsip. ' +
                    'Un asesor deberá continuar con la atención.';
            }

            if (
                textoLimpio === 'no' ||
                textoLimpio === 'cancelar'
            ) {
                await limpiarEstadoUsuario(remitente);

                return '❌ Pedido cancelado. Escribe *hola* para regresar al menú principal.';
            }

            return '⚠️ Responde *SI* para confirmar o *NO* para cancelar.';
        }

        default:
            await limpiarEstadoUsuario(remitente);
            return 'No pude continuar con tu pedido. Escribe *hola* para comenzar nuevamente.';
    }
}

// Buscar artículos en Firebird
async function buscarArticulo(remitente, texto) {
    const articulos = await buscarArticulosConPrecio(texto);

    if (!articulos || articulos.length === 0) {
        await guardarEstadoUsuario(
            remitente,
            'PEDIDO_ARTICULO',
            {}
        );

        return '❌ No encontré artículos que coincidan con tu búsqueda.\n\n' +
            'Intenta escribir otro nombre, medida o código.';
    }

    // Si solamente existe una coincidencia
    if (articulos.length === 1) {
        return await seleccionarArticulo(remitente, articulos[0]);
    }

    // Si existen varias coincidencias
    const opciones = articulos.map(a => ({
        ARTICULO_ID: a.ARTICULO_ID,
        NOMBRE: a.NOMBRE,
        UNIDAD_VENTA: a.UNIDAD_VENTA,
        PRECIO: a.PRECIO,
        MONEDA_ID: a.MONEDA_ID
    }));

    await guardarEstadoUsuario(
        remitente,
        'PEDIDO_SELECCION',
        { opciones }
    );

    let respuesta = '🔎 *Artículos encontrados*\n\n';

    opciones.forEach((articulo, indice) => {
        respuesta += `${indice + 1}. ${articulo.NOMBRE}\n`;
        respuesta += `   Precio: ${articulo.PRECIO ?? 'No configurado'}\n\n`;
    });

    respuesta += 'Escribe el número del artículo que deseas pedir.';

    return respuesta;
}

// Seleccionar artículo y solicitar cantidad
async function seleccionarArticulo(remitente, articulo) {
    if (
        articulo.PRECIO === null ||
        articulo.PRECIO === undefined ||
        !Number.isFinite(Number(articulo.PRECIO))
    ) {
        await guardarEstadoUsuario(
            remitente,
            'PEDIDO_ARTICULO',
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
        'PEDIDO_CANTIDAD',
        datos
    );

    return '✅ Artículo seleccionado: *' + articulo.NOMBRE + '*\n\n' +
        `Precio: ${articulo.PRECIO}\n` +
        `Unidad de venta: ${articulo.UNIDAD_VENTA || 'No especificada'}\n\n` +
        '¿Qué cantidad deseas pedir?';
}

// Construir resumen del pedido
function construirResumen(datos) {
    const articulo = datos.articuloSeleccionado;

    return '📋 *Resumen de tu pedido*\n\n' +
        `Artículo: ${articulo.NOMBRE}\n` +
        `Cantidad: ${datos.cantidad}\n` +
        `Precio unitario: ${articulo.PRECIO}\n` +
        `Importe total: ${Number(datos.total).toFixed(2)}\n\n` +
        '¿Deseas confirmar este pedido?\n\n' +
        'Escribe *SI* para confirmar o *NO* para cancelar.';
}

module.exports = {
    iniciar,
    procesar
};