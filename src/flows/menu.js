function construirMenuPrincipalPayload(remitente) {
    return {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: remitente,
        type: 'interactive',
        interactive: {
            type: 'list',
            header: {
                type: 'text',
                text: 'Tornillos Aguila'
            },
            body: {
                text:
                    '🤖✨ ¡Hola! Soy el asistente virtual de Tornillos Águila 🔩\n' +
                    'Estoy aquí para apoyarte y brindarte la mejor atención.\n\n' +
                    '📋 Para continuar, por favor elige una opción de la lista que aparece aquí abajo 👇.\n' +
                    'Así podré ayudarte de la manera más rápida y sencilla. ⚡ \n'+
                    '\n'+
                    'Si quiere cancelar la operación, solo escribe *cancelar*. ' 
            },
            footer: {
                text: 'Gracias por tu preferencia'
            },
            action: {
                button: 'Mostrar opciones',
                sections: [
                    {
                        title: 'Opciones disponibles',
                        rows: [
                            { id: 'hacer_pedido', title: '🛒 Hacer pedido' },
                            { id: 'cotizador', title: '$ Cotizador' },
                            { id: 'saldo_deudor', title: '💳 Saldo deudor' },
                            { id: 'edo_cuenta', title: '📄 Edo. de cuenta' },
                            { id: 'ubicacion', title: '📍 Ubicación' },
                            { id: 'horarios', title: '⏰ Horarios' },
                            { id: 'sugerencias', title: '💡 Sugerencias' },
                            { id: 'contacto', title: '📞 Contacto' },
                            {id: 'catalogo', title: '📚 Catalogo' }
                        ]
                    }
                ]
            }
        }
    };
}

module.exports = { construirMenuPrincipalPayload };