// Aqui se implementa la logica de los flujos de conversación,
// para que el bot pueda responder a los mensajes entrantes de los clientes.

const { construirMenuPrincipalPayload } = require('./menu');

const cotizar = require('./cotizar');
const pedido = require('./pedido');
const saldo = require('./saldo');
const estatico = require('./estatico');

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

    if (sesion && sesion.flujo && sesion.flujo !== 'IDLE') {

        const respuestaFlujo = await procesarFlujoMasOpciones(
            remitente,
            sesion,
            textoLimpio
        );

        if (respuestaFlujo !== undefined) {
            return respuestaFlujo;
        }
    }

    return MENSAJE_GUIA_HOLA;
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