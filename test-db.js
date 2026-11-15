const { obtenerClientes } = require('./src/db/queries');

async function probarConexion() {
    console.log('Intentando conectar a Firebird y consultar datos...');
    
    try {
        console.log('\n--- Probando obtener clientes ---');
        const clientes = await obtenerClientes();
        console.log(`¡Conexión exitosa! Se encontraron registros.`);
        console.log(clientes);
        
    } catch (error) {
        console.error('\n--- DETALLE DEL ERROR ---');
        console.error(error);
    }
}

probarConexion();