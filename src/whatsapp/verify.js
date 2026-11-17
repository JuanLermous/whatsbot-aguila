/**
 * Verificación del Webhook de Meta (WhatsApp Cloud API)
 */
function verificarWebhook(req, res) {
    const VERIFY_TOKEN = process.env.WHASHAPP_VERIFY_TOKEN || 'token_seguro_tornillos_aguila';

    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('Webhook verificado correctamente por Meta.');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    } else {
        res.sendStatus(400);
    }
}

module.exports = { verificarWebhook };