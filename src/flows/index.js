// Aqui se implementa la logica de los flujos de conversación,
// para que el bot pueda responder a los mensajes entrantes de los clientes.

const { construirMenuPrincipalPayload } = require('./menu');

const cotizar = require('./cotizar');
const pedido = require('./pedido');
const saldo = require('./saldo');
const estatico = require('./estatico');

// [DEEPSEEK] Interpretación de texto libre y consultas abiertas
const { interpretarMensaje, preguntarDeepSeek } = require('../ia/deepseek');

const {
    obtenerEstadoUsuario,
    limpiarEstadoUsuario
} = require('../db/queries');


const MENSAJE_GUIA_HOLA =
    '🤖 Recuerda que soy un asistente virtual. Para ver las opciones disponibles solo escribe *hola* en este chat.';


// FUNCION PRINCIPAL DEL INDEX

async function procesarMensajeEntrante(remitente, textoCliente) {

    const textoLimpio = (textoCliente || '').trim().toLowerCase();

    // MOSTRAR MENU PRINCIPAL
    if (textoLimpio === 'hola' || textoLimpio === 'menu') {

        await limpiarEstadoUsuario(remitente);

        return construirMenuPrincipalPayload(remitente);
    }

    // CANCELAR OPERACION
    if (textoLimpio === 'cancelar' || textoLimpio === 'salir') {

        await limpiarEstadoUsuario(remitente);

        return '✅ Operación cancelada. Escribe *hola* para ver las opciones nuevamente.';
    }

    // LEER ESTADO ACTUAL DE LA CONVERSACION
    const sesion = await obtenerEstadoUsuario(remitente);


    // PRIMERO COMPROBAR SI EL MENSAJE ES UNA OPCION DEL MENU

    const respuestaMenu = await procesarOpcionMenu(remitente, textoLimpio);

    if (respuestaMenu !== undefined) {
        return respuestaMenu;
    }


    // SI NO ES UNA OPCION DEL MENU, PROCESAR EL FLUJO ACTUAL

    const enFlujo = Boolean(sesion && sesion.flujo && sesion.flujo !== 'IDLE');

    if (enFlujo) {

        const respuestaFlujo = await procesarFlujoMasOpciones(
            remitente,
            sesion,
            textoLimpio
        );

        if (respuestaFlujo !== undefined) {
            return respuestaFlujo;
        }
    }


    // [DEEPSEEK] SI NO ESTA EN NINGUN FLUJO, INTERPRETAR EL TEXTO LIBRE

    if (!enFlujo) {

        const respuestaIA = await procesarTextoLibre(remitente, textoCliente);

        if (respuestaIA !== undefined) {
            return respuestaIA;
        }
    }

    return MENSAJE_GUIA_HOLA;
}


// [DEEPSEEK] TEXTO LIBRE: DEEPSEEK DETECTA LA INTENCION Y EXTRAE LOS DATOS

async function procesarTextoLibre(remitente, textoCliente) {

    try {

        const interpretacion = await interpretarMensaje(textoCliente);

        // Si DeepSeek falla o no hay API key, se comporta como antes (mensaje guía)
        if (interpretacion.fallo) {
            return undefined;
        }

        const { intencion, datos } = interpretacion;

        // Dato que el cliente ya dio (clave o nombre/medida del artículo)
        const dato = (datos.clave || datos.articulo || '').toLowerCase();

        switch (intencion) {

            case 'pedido': {
                const inicio = await pedido.iniciar(remitente);
                return dato ? await pedido.procesar(remitente, dato) : inicio;
            }

            case 'cotizar': {
                const inicio = await cotizar.iniciar(remitente);
                return dato ? await cotizar.procesar(remitente, dato) : inicio;
            }

            case 'saldo':
                return await saldo.iniciarSaldo(remitente);

            case 'estado_cuenta':
                return await saldo.iniciarEstadoCuenta(remitente);

            case 'ayuda': {
                // TODO (integración n8n): aquí también debe avisarse por correo
                // a bot8@tornillosaguila.com cuando el cliente pide ayuda.
                const contacto = await estatico.procesarOpcionMenu(remitente, 'contacto');
                return '🙋 Con gusto te ayudamos. Puedes comunicarte directamente con un asesor:\n\n' + contacto;
            }

            case 'menu':
                await limpiarEstadoUsuario(remitente);
                return construirMenuPrincipalPayload(remitente);

            case 'consulta':
                return await preguntarDeepSeek(remitente, textoCliente);

            default:
                return undefined;
        }

    } catch (error) {
        console.error('[DeepSeek] Error en texto libre:', error.message);
        return undefined;
    }
}


// FLUJOS QUE NECESITAN MAS DE 3 PASOS

async function procesarFlujoMasOpciones(remitente, sesion, textoLimpio) {

    if (sesion.flujo === 'COTIZADOR_ARTICULO') {

        return await cotizar.procesar(remitente, textoLimpio);
    }

    if (sesion.flujo === 'PEDIDO_ARTICULO') {

        return await pedido.procesar(remitente, textoLimpio);
    }

    if (sesion.flujo === 'SALDO_DEUDOR' || sesion.flujo === 'EDO_CUENTA') {

        return await saldo.procesar(remitente, sesion, textoLimpio);
    }

    if (sesion.flujo === 'SUGERENCIAS') {

        return await estatico.procesar(remitente, sesion, textoLimpio);
    }

    return undefined;
}



// INICIO DE LOS FLUJOS CUANDO SE ESCOGE UNA OPCION EN MENU PRINCIPAL

async function procesarOpcionMenu(remitente, textoLimpio) {

    if (textoLimpio === 'hacer_pedido') {

        return await pedido.iniciar(remitente);
    }

    if (textoLimpio === 'cotizador') {

        return await cotizar.iniciar(remitente);
    }

    if (textoLimpio === 'saldo_deudor') {

        return await saldo.iniciarSaldo(remitente);
    }

    if (textoLimpio === 'edo_cuenta') {

        return await saldo.iniciarEstadoCuenta(remitente);
    }

    return await estatico.procesarOpcionMenu(remitente, textoLimpio);
}


module.exports = {
    procesarMensajeEntrante
};