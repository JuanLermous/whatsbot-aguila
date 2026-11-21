// Flujo de saldo deudor y estado de cuenta

const {
    guardarEstadoUsuario,
    limpiarEstadoUsuario
} = require('../db/queries');


// INICIAR CONSULTA DE SALDO DEUDOR
async function iniciarSaldo(remitente) {

    await guardarEstadoUsuario(remitente, 'SALDO_DEUDOR', {});

    return '💳 *Consulta de saldo deudor*\n\n' +
           'Por favor, proporciona tu clave de cliente para consultar tu saldo.';
}


// INICIAR CONSULTA DE ESTADO DE CUENTA
async function iniciarEstadoCuenta(remitente) {

    await guardarEstadoUsuario(remitente, 'EDO_CUENTA', {});

    return '📄 *Estado de cuenta*\n\n' +
           'Por favor, proporciona tu clave de cliente para consultar tu estado de cuenta.';
}


// PROCESAR RESPUESTA DEL CLIENTE
async function procesar(remitente, sesion, textoLimpio) {

    if (sesion.flujo === 'SALDO_DEUDOR') {

        await limpiarEstadoUsuario(remitente);

        return `💳 Consultando saldo para la clave de cliente: *${textoLimpio}*. (Aquí conectaremos tu consulta a Firebird).`;
    }

    if (sesion.flujo === 'EDO_CUENTA') {

        await limpiarEstadoUsuario(remitente);

        return `📄 Consultando estado de cuenta para la clave de cliente: *${textoLimpio}*.`;
    }
}


module.exports = {
    iniciarSaldo,
    iniciarEstadoCuenta,
    procesar
};