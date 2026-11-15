const { conectarDB } = require('./firebird');

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

module.exports = {
    obtenerClientes,
    buscarArticulos
};