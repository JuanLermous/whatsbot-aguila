//Archivo de consultas
const {
    conectarDB,
    consultarFirebird
     } = require('./firebird');
const PRECIO_EMPRESA_PUBLICO = 118340;

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
    try {
        console.log('[DEBUG DB] Iniciando guardarEstadoUsuario');

        const jsonDatos = JSON.stringify(datos || {});

        console.log('[DEBUG DB] JSON generado:', jsonDatos);
        console.log('[DEBUG DB] Longitud del JSON:', jsonDatos.length);

        console.log('[DEBUG DB] Consultando existencia del teléfono:', remitente);

        const existe = await consultarFirebird(
            'SELECT FIRST 1 TELEFONO FROM CHATBOT_SESIONES WHERE TELEFONO = ?',
            [remitente]
        );

        console.log('[DEBUG DB] Resultado:', existe);

        if (existe && existe.length > 0) {
            console.log('[DEBUG DB] Ejecutando UPDATE');

            await consultarFirebird(
                'UPDATE CHATBOT_SESIONES SET FLUJO_ACTUAL = ?, DATOS_TEMP = ?, ACTUALIZADO_EN = CURRENT_TIMESTAMP WHERE TELEFONO = ?',
                [flujo, jsonDatos, remitente]
            );

        } else {
            console.log('[DEBUG DB] Ejecutando INSERT');

            await consultarFirebird(
                'INSERT INTO CHATBOT_SESIONES (TELEFONO, FLUJO_ACTUAL, DATOS_TEMP, ACTUALIZADO_EN) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
                [remitente, flujo, jsonDatos]
            );
        }

        console.log('[DEBUG DB] Estado guardado correctamente');

    } catch (error) {
        console.error('[DEBUG DB] ERROR:', error);
        throw error;
    }
}
async function limpiarEstadoUsuario(remitente) {
    await guardarEstadoUsuario(remitente, 'IDLE', {});
}

// Buscar artículos y sus precios en la lista PUBLICO
async function buscarArticulosConPrecio(texto) {
    const sql = `
        SELECT FIRST 10
            A.ARTICULO_ID,
            A.NOMBRE,
            A.ESTATUS,
            A.UNIDAD_VENTA,
            PA.PRECIO,
            PA.MONEDA_ID
        FROM ARTICULOS A
        LEFT JOIN PRECIOS_ARTICULOS PA
            ON PA.ARTICULO_ID = A.ARTICULO_ID
            AND PA.PRECIO_EMPRESA_ID = ?
        WHERE A.NOMBRE CONTAINING ?
        ORDER BY A.NOMBRE
    `;

    return await consultarFirebird(sql, [
        PRECIO_EMPRESA_PUBLICO,
        texto
    ]);
}

module.exports = {
    guardarBitacora,
    obtenerEstadoUsuario,
    guardarEstadoUsuario,
    limpiarEstadoUsuario,
    buscarArticulosConPrecio
};