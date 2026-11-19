//conexion inicial a la base de datos Firebird para realizar consultas

const Firebird = require('node-firebird');
const config = require('../config'); 

const dbOptions = {
    host: config.firebird.host || '127.0.0.1',
    port: config.firebird.port || 3050,
    database: config.firebird.database,
    user: config.firebird.user,
    password: config.firebird.password,
    lowercase_keys: false,
    ascii: false,
    blob_as_utf8: true
};

function conectarDB() {
    return new Promise((resolve, reject) => {
        Firebird.attach(dbOptions, (err, db) => {
            if (err) {
                return reject(err);
            }
            resolve(db);
        });
    });
}

async function consultarFirebird(sql, params = []) {
    const db = await conectarDB();

    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, result) => {
            db.detach(() => {
                if (err) {
                    return reject(err);
                }
                resolve(result || []);
            });
        });
    });
}

module.exports = { 
    conectarDB,
    consultarFirebird 
};