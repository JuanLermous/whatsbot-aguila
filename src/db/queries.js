//Archivo de consultas
const {
    conectarDB,
    consultarFirebird
     } = require('./firebird');


//SECCION PARA GUARDAR BITACORA DE CONVERSACIONES DEL CHATBOT EN FIREBIRD
/**
 * Inserta un registro en la tabla de bitácora del chatbot.
 * @param {string} remitente - Número de WhatsApp del cliente
 * @param {string} mensajeCliente - Lo que escribió el usuario
 * @param {string} respuestaBot - Lo que respondió DeepSeek
 */
async function guardarBitacora(remitente, mensajeCliente, respuestaBot) {
    const db = await conectarDB();
    return new Promise((resolve, reject) => {
        const query = 'INSERT INTO CHATBOT_BITACORA (REMITENTE, MENSAJE_CLIENTE, RESPUESTA_BOT) VALUES (?, ?, ?)';
        
        db.query(query, [remitente, mensajeCliente, respuestaBot], (err, result) => {
            db.detach(); // Siempre liberamos la conexión
            
            if (err) {
                console.error('[Firebird] Error al guardar bitácora:', err.message);
                return reject(err);
            }
            resolve(result);
        });
    });
}

//FUNCIONES PARA OBTENER Y GUARDAR EL ESTADO DE LA CONVERSASION ACTUAL DEL USUARIO EN FIREBIRD
async function obtenerEstadoUsuario(remitente) {
    const sql = 'SELECT FIRST 1 FLUJO_ACTUAL, DATOS_TEMP FROM CHATBOT_SESIONES WHERE TELEFONO = ?';
    const rows = await consultarFirebird(sql, [remitente]);

    if (!rows || rows.length === 0) {
        return { flujo: 'IDLE', datos: {} };
    }

    const fila = rows[0];
    let datosParseados = {};
    if (fila.DATOS_TEMP) {
        try {
            datosParseados = JSON.parse(fila.DATOS_TEMP);
        } catch (e) {
            datosParseados = {};
        }
    }

    return {
        flujo: fila.FLUJO_ACTUAL || 'IDLE',
        datos: datosParseados
    };
}

async function guardarEstadoUsuario(remitente, flujo, datos = {}) {
    const jsonDatos = JSON.stringify(datos || {});
    const existe = await consultarFirebird(
        'SELECT FIRST 1 TELEFONO FROM CHATBOT_SESIONES WHERE TELEFONO = ?',
        [remitente]
    );

    if (existe && existe.length > 0) {
        await consultarFirebird(
            'UPDATE CHATBOT_SESIONES SET FLUJO_ACTUAL = ?, DATOS_TEMP = ?, ACTUALIZADO_EN = CURRENT_TIMESTAMP WHERE TELEFONO = ?',
            [flujo, jsonDatos, remitente]
        );
    } else {
        await consultarFirebird(
            'INSERT INTO CHATBOT_SESIONES (TELEFONO, FLUJO_ACTUAL, DATOS_TEMP, ACTUALIZADO_EN) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
            [remitente, flujo, jsonDatos]
        );
    }
}

async function limpiarEstadoUsuario(remitente) {
    await guardarEstadoUsuario(remitente, 'IDLE', {});
}

module.exports = {
    guardarBitacora,
    obtenerEstadoUsuario,
    guardarEstadoUsuario,
    limpiarEstadoUsuario
};