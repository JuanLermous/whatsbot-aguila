//Aqui se implementa la logica de los flujos de conversación,
//para que el bot pueda responder a los mensajes entrantes de los clientes.
const {construirMenuPrincipalPayload} = require('./menu');
const {
    obtenerEstadoUsuario,
    guardarEstadoUsuario,
    limpiarEstadoUsuario
} = require('../db/queries');


//CAMBIAR PARA FUTURAS FUNCIONES
/*
const cotizarFlow = require('./cotizar');
const pedidoFlow = require('./pedido');
const saldoFlow = require('./saldo');
const estaticoFlow = require('./estatico');
*/

const MENSAJE_GUIA_HOLA =
    '🤖 Recuerda que soy un asistente virtual. Para ver las opciones disponibles solo escribe hola en este chat.';

async function procesarMensajeEntrante(remitente, textoCliente) {
    const textoLimpio = (textoCliente || '').trim().toLowerCase();
 
    if (textoLimpio === 'hola' || textoLimpio === 'menu' || textoLimpio === 'menú') {
        await limpiarEstadoUsuario(remitente);
        return construirMenuPrincipalPayload(remitente);
    }

    if (textoLimpio === 'cancelar' || textoLimpio === 'salir') {
        await limpiarEstadoUsuario(remitente);
        return '✅ Operación cancelada. Escribe *hola* para ver las opciones nuevamente.';
    }


    //Leer estado actual del cliente desde Firebird
    const sesion = await obtenerEstadoUsuario(remitente);
    
    // 3. Si el usuario ya está dentro de un flujo de varios pasos
    if (sesion.flujo === 'COTIZADOR_ARTICULO') {
        await limpiarEstadoUsuario(remitente);
        return `🔎 Recibí tu solicitud de cotización para: *${textoLimpio}*. (Aquí conectaremos tu consulta a Firebird).`;
    }

    if (sesion.flujo === 'SALDO_CLAVE') {
        await limpiarEstadoUsuario(remitente);
        return `💳 Consultando saldo para la clave de cliente: *${textoLimpio}*. (Aquí conectaremos tu consulta a Firebird).`;
    }

    if (sesion.flujo === 'PEDIDO_ARTICULO') {
        await limpiarEstadoUsuario(remitente);
        return `🛒 Registrando solicitud de pedido para: *${textoLimpio}*. (Aquí conectaremos tu flujo de pedido).`;
    }

    // 4. Inicio de flujos desde los IDs de la lista interactiva ("Mostrar opciones")
    if (textoLimpio === 'cotizador') {
        await guardarEstadoUsuario(remitente, 'COTIZADOR_ARTICULO', {});
        return '💲 *Cotizador Tornillos Águila*\nEscríbeme el nombre, medida o código del artículo que deseas cotizar.';
    }

    if (textoLimpio === 'saldo_deudor' || textoLimpio === 'edo_cuenta') {
        await guardarEstadoUsuario(remitente, 'SALDO_CLAVE', {});
        return '💳 *Consulta de Saldo / Estado de Cuenta*\nPor favor, escríbeme tu clave o número de cliente.';
    }

    if (textoLimpio === 'hacer_pedido') {
        await guardarEstadoUsuario(remitente, 'PEDIDO_ARTICULO', {});
        return '🛒 *Hacer Pedido*\nEscríbeme el artículo y la cantidad que necesitas solicitar.';
    }
    

    // Si no entra en ningún flujo determinista, aquí decides si pasa a DeepSeek
    // o si devuelves directamente el mensaje guía para no gastar tokens en mensajes sueltos:
    return MENSAJE_GUIA_HOLA;
}

module.exports = { procesarMensajeEntrante };