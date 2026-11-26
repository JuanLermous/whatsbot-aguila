// src/ia/deepseek.js
// Módulo de IA (DeepSeek) para Tornillos Águila:
//  - preguntarDeepSeek(): responde consultas abiertas (asistente técnico).
//  - interpretarMensaje(): clasifica texto libre y extrae datos (clave, artículo, cantidad).
// Requiere Node 18+ (fetch incluido).

const config = require('../config');

const MENSAJE_ERROR =
    'Lo siento, en este momento no puedo responder tu consulta. Un asesor de Tornillos Águila te atenderá pronto 🙏';

const TIMEOUT_MS = 20000;

// ---------------------------------------------------------------------------
// Llamada base a la API (compartida por las dos funciones)
// ---------------------------------------------------------------------------
async function llamarAPI(
    messages,
    { temperature = 0.5, maxTokens = 400, timeoutMs = TIMEOUT_MS } = {}
) {
    if (!config.deepseek.apiKey) {
        throw new Error('Falta DEEPSEEK_API_KEY en el .env');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const res = await fetch(config.deepseek.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${config.deepseek.apiKey}`
            },
            body: JSON.stringify({
                model: config.deepseek.model,
                messages,
                temperature,
                max_tokens: maxTokens,
                stream: false
            }),
            signal: controller.signal
        });

        if (!res.ok) {
            const detalle = await res.text();
            throw new Error(`HTTP ${res.status}: ${detalle}`);
        }

        const data = await res.json();
        const contenido = data.choices?.[0]?.message?.content?.trim();
        if (!contenido) {
            const motivo = data.choices?.[0]?.finish_reason || 'desconocido';
            throw new Error(`Respuesta vacía de DeepSeek (finish_reason: ${motivo})`);
        }

        return contenido;
    } finally {
        clearTimeout(timeout);
    }
}

// ---------------------------------------------------------------------------
// 1) Asistente de respuestas abiertas (con historial por cliente)
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT_CHAT = `Eres el asistente virtual de "Tornillos Águila", una ferretería especializada en tornillería y fijación.
Reglas:
- Responde siempre en español, de forma amable, breve y clara (máximo 5 renglones, es WhatsApp).
- Ayuda con recomendaciones técnicas: tipo de tornillo, grado, material, medida y uso.
- NUNCA inventes precios ni existencias. Si preguntan por precio o disponibilidad y no se te proporcionan datos del inventario, di que un asesor lo confirmará o que consulten la opción correspondiente del menú.
- Si se te proporcionan datos del inventario, úsalos tal cual para redactar la respuesta, sin cambiar cifras.
- Si la pregunta no tiene relación con la ferretería, responde amablemente que solo puedes ayudar con temas de Tornillos Águila.`;

const historial = new Map();
const MAX_MENSAJES = 10;

/**
 * Responde una consulta abierta del cliente.
 * @param {string} userId       Número de WhatsApp del cliente (para el historial).
 * @param {string} textoUsuario Mensaje del cliente.
 * @param {string} [datosExtra] Datos reales (ej. de Firebird) para que DeepSeek solo redacte.
 * @returns {Promise<string>}
 */
async function preguntarDeepSeek(userId, textoUsuario, datosExtra = '') {
    const previo = historial.get(userId) || [];

    const contenidoUsuario = datosExtra
        ? `${textoUsuario}\n\n[Datos del inventario]: ${datosExtra}`
        : textoUsuario;

    const messages = [
        { role: 'system', content: SYSTEM_PROMPT_CHAT },
        ...previo,
        { role: 'user', content: contenidoUsuario }
    ];

    try {
        const respuesta = await llamarAPI(messages, { temperature: 0.5, maxTokens: 400 });

        historial.set(
            userId,
            [
                ...previo,
                { role: 'user', content: textoUsuario },
                { role: 'assistant', content: respuesta }
            ].slice(-MAX_MENSAJES)
        );

        return respuesta;
    } catch (err) {
        console.error('[DeepSeek] Error:', err.message);
        return MENSAJE_ERROR;
    }
}

// ---------------------------------------------------------------------------
// 2) Interpretación de texto libre: intención + datos extraídos
// ---------------------------------------------------------------------------
const INTENCIONES = ['pedido', 'cotizar', 'saldo', 'estado_cuenta', 'ayuda', 'menu', 'consulta'];

const INTENTOS_INTERPRETAR = 2;       // 1 intento + 1 reintento
const TIMEOUT_INTERPRETAR_MS = 10000; // por intento

const SYSTEM_PROMPT_INTENCION = `Eres un clasificador de mensajes para el bot de WhatsApp de "Tornillos Águila", una ferretería de tornillería.
Tu única tarea es leer el mensaje del cliente y responder SOLO con un objeto JSON, sin texto adicional ni markdown.

Formato exacto:
{"intencion":"...","clave":null,"articulo":null,"cantidad":null}

Valores de "intencion":
- "pedido": quiere hacer, levantar o repetir un pedido, o comprar algo.
- "cotizar": quiere saber el precio o una cotización de un artículo.
- "saldo": quiere saber cuánto debe o cuál es su saldo.
- "estado_cuenta": quiere su estado de cuenta, movimientos, facturas o historial de pagos.
- "ayuda": pide ayuda, asistencia, hablar con una persona o asesor, o tiene un problema o queja.
- "menu": solo saluda o pide ver las opciones o el menú, sin una petición concreta.
- "consulta": pregunta técnica o general sobre tornillería, usos, materiales, horarios, etc.

Campos:
- "clave": código o clave del artículo SOLO si el cliente la escribe de forma explícita (por ejemplo "clave ABCD" o "código TG8-200"). Si no, null. Nunca inventes una clave.
- "articulo": nombre o medida del artículo mencionado (por ejemplo "tornillo grado 8 de 2 pulgadas"). Si no hay, null.
- "cantidad": número de piezas si lo dice. Si no, null.
- Si el cliente menciona solamente una categoría general como "tornillos", "pijas" o "tuercas", conserva ese término como artículo, pero no inventes medidas, tipos ni características.
- Si el cliente proporciona una cantidad sin especificar el producto concreto, extrae la cantidad y deja el artículo como la categoría mencionada.
- Nunca inventes información que el cliente no haya proporcionado.
REGLAS PARA RESOLVER MENSAJES AMBIGUOS:

- Identifica lo que el cliente quiere conseguir, no solamente las palabras que utiliza.
- Si el cliente expresa que quiere comprar o solicitar productos, clasifica como "pedido".
- Si únicamente pregunta por precios, clasifica como "cotizar".
- Si pregunta por precios y además expresa claramente que quiere comprar, prioriza "pedido".
- Si solicita información sobre una deuda o cantidad pendiente, clasifica como "saldo".
- Si solicita documentos, facturas o movimientos de su cuenta, clasifica como "estado_cuenta".
- Si solicita atención humana, asesoría o reporta un problema, clasifica como "ayuda".
- Si solamente saluda o solicita las opciones disponibles, clasifica como "menu".
- Si pregunta por características, diferencias, materiales o aplicaciones de productos, clasifica como "consulta".

MENSAJES INCOMPLETOS:

- Si el cliente expresa una intención, pero no proporciona todos los datos necesarios, conserva la intención identificada.
- No cambies la intención a "menu" únicamente porque falte el nombre del artículo, una cantidad o una clave.
- Si el cliente quiere realizar un pedido, pero no especifica el artículo, devuelve "pedido" con articulo: null.
- Si el cliente quiere cotizar, pero no especifica el artículo, devuelve "cotizar" con articulo: null.
- Nunca inventes información para completar los campos.

SALUDOS Y CORTESÍA:

- Los saludos no deben modificar la intención principal.
- Ignora expresiones como "hola", "buenos días", "buenas tardes", "por favor", "gracias" y "disculpa" al identificar la intención.
- Ejemplo: "Hola, por favor necesito cotizar tornillos" corresponde a "cotizar".
- Ejemplo: "Buenas tardes, quiero hacer un pedido de tuercas" corresponde a "pedido".

CONSISTENCIA DEL JSON:

- Devuelve siempre los cuatro campos: intencion, clave, articulo y cantidad.
- Utiliza null cuando no exista información para un campo.
- cantidad debe ser un número entero, nunca una cadena.
- No agregues propiedades adicionales.
- No devuelvas varios objetos JSON.
- No incluyas comentarios dentro del JSON.

Ejemplos:
Mensaje: quiero hacer el pedido de tornillos con clave ABCD
{"intencion":"pedido","clave":"ABCD","articulo":"tornillos","cantidad":null}
Mensaje: cuánto cuesta el tornillo grado 8 de 2 pulgadas
{"intencion":"cotizar","clave":null,"articulo":"tornillo grado 8 de 2 pulgadas","cantidad":null}
Mensaje: necesito 200 pijas 10x1 clave PJ101
{"intencion":"pedido","clave":"PJ101","articulo":"pijas 10x1","cantidad":200}
Mensaje: cuánto debo
{"intencion":"saldo","clave":null,"articulo":null,"cantidad":null}
Mensaje: me pueden mandar mi estado de cuenta
{"intencion":"estado_cuenta","clave":null,"articulo":null,"cantidad":null}
Mensaje: necesito ayuda, no me llegó mi pedido
{"intencion":"ayuda","clave":null,"articulo":null,"cantidad":null}
Mensaje: hola buenas tardes
{"intencion":"menu","clave":null,"articulo":null,"cantidad":null}
Mensaje: qué diferencia hay entre grado 5 y grado 8
{"intencion":"consulta","clave":null,"articulo":null,"cantidad":null}`;

// Si algo falla, lo más seguro es mostrar el menú normal.
function resultadoVacio(fallo = false) {
    return {
        intencion: 'menu',
        datos: { clave: null, articulo: null, cantidad: null },
        fallo
    };
}

// Saca el primer objeto JSON que encuentre en el texto de la respuesta.
function extraerJSON(texto) {
    const ini = texto.indexOf('{');
    const fin = texto.lastIndexOf('}');
    if (ini === -1 || fin <= ini) return null;
    try {
        return JSON.parse(texto.slice(ini, fin + 1));
    } catch {
        return null;
    }
}

// Valida y limpia lo que devolvió el modelo (nunca confiar en su salida tal cual).
function normalizarResultado(obj) {
    if (!obj || typeof obj !== 'object') return resultadoVacio(true);

    const intencion = INTENCIONES.includes(obj.intencion) ? obj.intencion : null;
    if (!intencion) return resultadoVacio(true);

    let clave = typeof obj.clave === 'string' ? obj.clave.trim().toUpperCase() : null;
    if (!clave || !/^[A-Z0-9\-_./]{1,30}$/.test(clave)) clave = null;

    let articulo = typeof obj.articulo === 'string' ? obj.articulo.trim().slice(0, 100) : null;
    if (!articulo) articulo = null;

    let cantidad = Number(obj.cantidad);
    if (!Number.isInteger(cantidad) || cantidad <= 0 || cantidad > 100000) cantidad = null;

    return { intencion, datos: { clave, articulo, cantidad }, fallo: false };
}

/**
 * Interpreta un mensaje de texto libre.
 * Si DeepSeek devuelve algo vacío o inválido, reintenta una vez.
 * @param {string} textoUsuario Mensaje del cliente.
 * @returns {Promise<{intencion: string, datos: {clave: string|null, articulo: string|null, cantidad: number|null}, fallo: boolean}>}
 *   intencion: 'pedido' | 'cotizar' | 'saldo' | 'estado_cuenta' | 'ayuda' | 'menu' | 'consulta'
 *   Nunca lanza error: si algo falla devuelve intencion 'menu' con fallo=true.
 */
async function interpretarMensaje(textoUsuario) {
    if (typeof textoUsuario !== 'string' || !textoUsuario.trim()) {
        return resultadoVacio();
    }

    const texto = textoUsuario.trim().slice(0, 500);

    const messages = [
        { role: 'system', content: SYSTEM_PROMPT_INTENCION },
        { role: 'user', content: `Mensaje: ${texto}` }
    ];

    for (let intento = 1; intento <= INTENTOS_INTERPRETAR; intento++) {
        try {
            const respuesta = await llamarAPI(messages, {
                temperature: 0,
                maxTokens: 600,
                timeoutMs: TIMEOUT_INTERPRETAR_MS
            });

            const resultado = normalizarResultado(extraerJSON(respuesta));
            if (!resultado.fallo) return resultado;

            console.error(`[DeepSeek] Respuesta no válida (intento ${intento}):`, respuesta);
        } catch (err) {
            console.error(`[DeepSeek] Error al interpretar mensaje (intento ${intento}):`, err.message);
        }
    }

    return resultadoVacio(true);
}

module.exports = { preguntarDeepSeek, interpretarMensaje };