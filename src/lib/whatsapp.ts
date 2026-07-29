/**
 * Cliente de integración con Meta Cloud API para WhatsApp Business (Multi-Tenant)
 */

interface SendTextMessageParams {
    phoneNumberId: string;
    accessToken: string;
    to: string;
    text: string;
}

interface SendInteractiveButtonsParams {
    phoneNumberId: string;
    accessToken: string;
    to: string;
    bodyText: string;
    buttons: Array<{ id: string; title: string }>;
}

/**
 * Envia un mensaje de texto plano al cliente por WhatsApp
 */
export async function sendWhatsAppTextMessage({
    phoneNumberId,
    accessToken,
    to,
    text,
}: SendTextMessageParams): Promise<boolean> {
    if (!phoneNumberId || !accessToken || !to) {
        console.error('[WhatsApp API] Faltan parámetros para enviar mensaje:', { phoneNumberId, to });
        return false;
    }

    try {
        const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: to,
                type: 'text',
                text: {
                    preview_url: false,
                    body: text,
                },
            }),
        });

        const data = await response.json();
        if (!response.ok) {
            console.error('[WhatsApp API Error Response]:', data);
            return false;
        }

        return true;
    } catch (error) {
        console.error('[WhatsApp API Error]:', error);
        return false;
    }
}

/**
 * Envía botones interactivos rápidos en WhatsApp (Ej: "Delivery" | "Recojo en Tienda")
 */
export async function sendWhatsAppInteractiveButtons({
    phoneNumberId,
    accessToken,
    to,
    bodyText,
    buttons,
}: SendInteractiveButtonsParams): Promise<boolean> {
    if (!phoneNumberId || !accessToken || !to || !buttons?.length) {
        return false;
    }

    try {
        const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: to,
                type: 'interactive',
                interactive: {
                    type: 'button',
                    body: {
                        text: bodyText,
                    },
                    action: {
                        buttons: buttons.map((b) => ({
                            type: 'reply',
                            reply: {
                                id: b.id,
                                title: b.title.slice(0, 20), // WhatsApp limita el título a 20 caracteres
                            },
                        })),
                    },
                },
            }),
        });

        const data = await response.json();
        return response.ok;
    } catch (error) {
        console.error('[WhatsApp Interactive Buttons Error]:', error);
        return false;
    }
}

/**
 * Marca el mensaje recibido como leido (Doble check azul)
 */
export async function markWhatsAppMessageAsRead(
    phoneNumberId: string,
    accessToken: string,
    messageId: string
): Promise<void> {
    try {
        const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
        await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                status: 'read',
                message_id: messageId,
            }),
        });
    } catch (err) {
        // Ignorar silenciosamente si no se pudo marcar como leído
    }
}
