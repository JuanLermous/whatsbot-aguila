// Archivo de consultas
const {
  conectarDB,
  consultarFirebird
} = require('./firebird');


// SECCION PARA GUARDAR BITACORA DEL CHATBOT


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


// ESTADO DE CONVERSACION DEL USUARIO


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


// CONSULTAS DE NEGOCIO (CLIENTES, CATALOGO, CC, VENTAS)


async function obtenerClientes(limite = 20) {
  const cap = Math.max(1, Number(limite) || 20);
  const sql = `
    SELECT FIRST ${cap}
      CLIENTE_ID,
      NOMBRE,
      ESTATUS,
      LIMITE_CREDITO,
      CONTACTO1,
      CONTACTO2
    FROM CLIENTES
    ORDER BY NOMBRE
  `;
  return consultarFirebird(sql);
}

async function buscarClientePorNombre(nombre, limite = 20) {
  const cap = Math.max(1, Number(limite) || 20);
  const sql = `
    SELECT FIRST ${cap}
      CLIENTE_ID,
      NOMBRE,
      ESTATUS,
      LIMITE_CREDITO,
      CONTACTO1,
      CONTACTO2
    FROM CLIENTES
    WHERE UPPER(NOMBRE) LIKE UPPER(?)
    ORDER BY NOMBRE
  `;
  return consultarFirebird(sql, [`%${nombre}%`]);
}

async function buscarArticulosConPrecio(termino, limite = 20) {
  const cap = Math.max(1, Number(limite) || 20);
  const sql = `
    SELECT FIRST ${cap}
      A.ARTICULO_ID,
      A.NOMBRE,
      A.UNIDAD_VENTA,
      A.ESTATUS,
      P.PRECIO_EMPRESA_ID,
      P.PRECIO,
      P.MONEDA_ID
    FROM ARTICULOS A
    LEFT JOIN PRECIOS_ARTICULOS P ON P.ARTICULO_ID = A.ARTICULO_ID
    WHERE UPPER(A.NOMBRE) LIKE UPPER(?)
    ORDER BY A.NOMBRE
  `;
  return consultarFirebird(sql, [`%${termino}%`]);
}

async function obtenerSaldosCliente(clienteId) {
  const sql = `
    SELECT
      CLIENTE_ID,
      ANO,
      MES,
      ULTIMO_DIA,
      CARGOS_CXC,
      CARGOS_XACR,
      CREDITOS_CXC,
      CREDITOS_XACR,
      CREDITOS_CXC_XLIB,
      CREDITOS_XACR_XLIB
    FROM SALDOS_CC
    WHERE CLIENTE_ID = ?
    ORDER BY ANO DESC, MES DESC
  `;
  return consultarFirebird(sql, [clienteId]);
}

async function obtenerMovimientosCC(clienteId, limite = 20) {
  const cap = Math.max(1, Number(limite) || 20);
  const sql = `
    SELECT FIRST ${cap}
      DOCTO_CC_ID,
      FOLIO,
      FECHA,
      NATURALEZA_CONCEPTO,
      IMPORTE_COBRO,
      DESCRIPCION,
      ESTATUS,
      CANCELADO,
      APLICADO
    FROM DOCTOS_CC
    WHERE CLIENTE_ID = ?
    ORDER BY FECHA DESC, DOCTO_CC_ID DESC
  `;
  return consultarFirebird(sql, [clienteId]);
}

async function obtenerPedidosCliente(clienteId, limite = 20, tipoDocto = null) {
  const cap = Math.max(1, Number(limite) || 20);
  const params = [clienteId];
  let filtroTipo = '';

  if (tipoDocto) {
    filtroTipo = ' AND TIPO_DOCTO = ?';
    params.push(String(tipoDocto).toUpperCase());
  }

  const sql = `
    SELECT FIRST ${cap}
      DOCTO_VE_ID,
      TIPO_DOCTO,
      FOLIO,
      FECHA,
      ORDEN_COMPRA,
      IMPORTE_NETO,
      TOTAL_IMPUESTOS,
      TOTAL_RETENCIONES,
      TOTAL_ANTICIPOS,
      ESTATUS,
      APLICADO
    FROM DOCTOS_VE
    WHERE CLIENTE_ID = ?${filtroTipo}
    ORDER BY FECHA DESC, DOCTO_VE_ID DESC
  `;
  return consultarFirebird(sql, params);
}

async function obtenerDetalleDocumento(doctoVeId) {
  const sql = `
    SELECT
      D.DOCTO_VE_DET_ID,
      D.DOCTO_VE_ID,
      D.POSICION,
      D.ARTICULO_ID,
      D.CLAVE_ARTICULO,
      A.NOMBRE AS NOMBRE_ARTICULO,
      A.UNIDAD_VENTA,
      D.UNIDADES,
      D.UNIDADES_COMPROM,
      D.UNIDADES_SURT_DEV,
      D.UNIDADES_A_SURTIR,
      D.PRECIO_UNITARIO,
      D.PCTJE_DSCTO,
      D.DSCTO_ART,
      D.DSCTO_EXTRA,
      D.PRECIO_TOTAL_NETO,
      D.ROL
    FROM DOCTOS_VE_DET D
    LEFT JOIN ARTICULOS A ON A.ARTICULO_ID = D.ARTICULO_ID
    WHERE D.DOCTO_VE_ID = ?
    ORDER BY D.POSICION ASC, D.DOCTO_VE_DET_ID ASC
  `;
  return consultarFirebird(sql, [doctoVeId]);
}

async function buscarClientePorContacto(termino, limite = 20) {
  const cap = Math.max(1, Number(limite) || 20);
  const texto = String(termino || '').trim();
  const sql = `
    SELECT FIRST ${cap}
      CLIENTE_ID,
      NOMBRE,
      ESTATUS,
      LIMITE_CREDITO,
      CONTACTO1,
      CONTACTO2
    FROM CLIENTES
    WHERE CONTACTO1 CONTAINING ?
       OR CONTACTO2 CONTAINING ?
    ORDER BY NOMBRE
  `;
  return consultarFirebird(sql, [texto, texto]);
}

module.exports = {
  guardarBitacora,
  obtenerEstadoUsuario,
  guardarEstadoUsuario,
  limpiarEstadoUsuario,
  obtenerClientes,
  buscarClientePorNombre,
  buscarClientePorContacto,
  buscarArticulosConPrecio,
  obtenerSaldosCliente,
  obtenerMovimientosCC,
  obtenerPedidosCliente,
  obtenerDetalleDocumento
};