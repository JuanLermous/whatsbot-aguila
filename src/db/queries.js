const { conectarDB } = require('./firebird'); // Ajusta la ruta según corresponda

async function obtenerClientes() {
    const db = await conectarDB();
    return new Promise((resolve, reject) => {
        db.query('SELECT FIRST 10 * FROM CLIENTES', [], (err, result) => {
            db.detach();
            if (err) {
                return reject(err);
            }
            resolve(result);
        });
    });
}

async function buscarArticulos(filtro) {
    const db = await conectarDB();
    return new Promise((resolve, reject) => {
        const query = 'SELECT FIRST 10 * FROM ARTICULOS WHERE NOMBRE CONTAINING ?';
        db.query(query, [filtro], (err, result) => {
            db.detach();
            if (err) {
                return reject(err);
            }
            resolve(result);
        });
    });
}

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

module.exports = {
    obtenerClientes,
    buscarArticulos,
    guardarBitacora // <-- Exportamos la nueva función
};