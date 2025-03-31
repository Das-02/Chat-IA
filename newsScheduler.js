/**
 * Programador para envío automático de noticias
 */
const { getTechNews, formatNewsForWhatsApp } = require('./newsService');

// Lista de usuarios y grupos a los que enviar noticias automáticamente
const subscribedUsers = new Set();
const subscribedGroups = new Set();

// Contador de intentos fallidos por chat
const failedAttempts = new Map();
const MAX_FAILED_ATTEMPTS = 3; 

/**
 * Enviar noticias automáticamente a un chat (usuario o grupo)
 * @param {object} client - Cliente de WhatsApp
 * @param {string} chatId - ID del chat (usuario o grupo)
 * @param {boolean} isGroup - Indica si es un grupo
 */
async function sendNewsToChat(client, chatId, isGroup = false) {
    try {
        console.log(`🔄 Intentando enviar noticias a ${chatId} (${isGroup ? 'grupo' : 'usuario'})`);
        
        const allNews = await getTechNews(10);
        
        if (!allNews || allNews.length === 0) {
            console.error(`No se pudieron obtener noticias para enviar a ${chatId}. Usando noticias de respaldo.`);
        }
        
        if (allNews.length === 0) {
            console.error(`ERROR CRÍTICO: No hay noticias disponibles para enviar a ${chatId}, ni siquiera de respaldo`);
            registerFailedAttempt(chatId);
            
            await client.sendMessage(chatId, 
                '*Error al obtener noticias*\n\n' +
                'Lo sentimos, no pudimos obtener noticias en este momento. ' +
                'Esto puede deberse a problemas con la API de noticias o la conexión a internet. ' +
                'Por favor, intenta más tarde escribiendo "noticias" manualmente.'
            );
            
            return false;
        }
        
        const randomIndex = Math.floor(Math.random() * Math.min(allNews.length, 5));
        const newsItem = allNews[randomIndex];
        
        if (!newsItem) {
            console.error(`No se pudo obtener una noticia para enviar a ${chatId}`);
            registerFailedAttempt(chatId);
            return false;
        }
        
        if (failedAttempts.has(chatId)) {
            failedAttempts.delete(chatId);
        }
        
        const chatType = isGroup ? "grupo" : "chat";
        const newsTitle = `*${newsItem.title}*\n\n`;
        const newsContent = 
            `${newsItem.description}\n\n` +
            `Fuente: ${newsItem.source}\n` +
            `Publicado: ${newsItem.publishedAt}\n` +
            `${newsItem.url}\n\n` +
            `_Este es un envío automático a este ${chatType}. Para más noticias, escribe "noticias" o "buscar [término]"_`;
        
        if (newsItem.urlToImage) {
            try {
                await client.sendMessage(chatId, {
                    caption: newsTitle + newsContent,
                    image: { url: newsItem.urlToImage }
                });
                console.log(`Noticia con imagen enviada a ${chatId}`);
            } catch (imageError) {
                console.error(`Error al enviar imagen, enviando solo texto: ${imageError.message}`);
                await client.sendMessage(chatId, newsTitle + newsContent);
                console.log(`Noticia (solo texto) enviada a ${chatId} después de fallar con imagen`);
            }
        } else {
            // Enviar solo texto
            await client.sendMessage(chatId, newsTitle + newsContent);
            console.log(`Noticia (solo texto) enviada a ${chatId}`);
        }
        
        console.log(`Noticia enviada automáticamente a ${chatId} (${isGroup ? 'grupo' : 'usuario'})`);
        return true;
    } catch (error) {
        console.error(`Error al enviar noticias a ${chatId}:`, error.message);
        if (error.stack) {
            console.error('Stack trace:', error.stack);
        }
        registerFailedAttempt(chatId);
        
        try {
            await client.sendMessage(chatId, 
                '*Error al enviar noticias*\n\n' +
                'Lo sentimos, hubo un problema al enviar noticias automáticas. ' +
                'Puedes probar a solicitar noticias manualmente escribiendo "noticias".'
            );
        } catch (notifyError) {
            console.error(`No se pudo notificar al chat ${chatId} sobre el error:`, notifyError.message);
        }
        
        return false;
    }
}

/**
 * Registra un intento fallido y notifica si se alcanza el máximo
 * @param {string} chatId - ID del chat
 */
function registerFailedAttempt(chatId) {
    const currentAttempts = failedAttempts.get(chatId) || 0;
    failedAttempts.set(chatId, currentAttempts + 1);
    
    if (currentAttempts + 1 >= MAX_FAILED_ATTEMPTS) {
        console.log(`⚠️ ADVERTENCIA: ${chatId} ha alcanzado ${MAX_FAILED_ATTEMPTS} intentos fallidos consecutivos`);
    }
}

/**
 * Enviar noticias a todos los suscriptores (usuarios y grupos)
 * @param {object} client - Cliente de WhatsApp
 */
async function broadcastNews(client) {
    let sentCount = 0;
    let errorCount = 0;
    let totalSubscribers = subscribedUsers.size + subscribedGroups.size;
    
    if (totalSubscribers === 0) {
        console.log('📣 No hay suscriptores para enviar noticias.');
        return 0;
    }
    
    console.log(`📣 Iniciando envío de noticias a ${totalSubscribers} suscriptores...`);
    
    // Enviar a usuarios
    for (const userId of subscribedUsers) {
        try {
            const success = await sendNewsToChat(client, userId, false);
            if (success) {
                sentCount++;
            } else {
                errorCount++;
            }
            // Pequeña pausa para no sobrecargar la API
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            console.error(`Error general al enviar a usuario ${userId}:`, error);
            errorCount++;
        }
    }
    
    // Enviar a grupos
    for (const groupId of subscribedGroups) {
        try {
            const success = await sendNewsToChat(client, groupId, true);
            if (success) {
                sentCount++;
            } else {
                errorCount++;
            }
            // Pequeña pausa para no sobrecargar la API
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            console.error(`Error general al enviar a grupo ${groupId}:`, error);
            errorCount++;
        }
    }
    
    console.log(`📊 Resumen: Noticias enviadas correctamente a ${sentCount} de ${totalSubscribers} suscriptores. Errores: ${errorCount}`);
    return sentCount;
}

/**
 * Iniciar el programador de noticias
 * @param {object} client - Cliente de WhatsApp
 * @param {number} intervalMinutes - Intervalo en minutos para el envío automático (defecto: 60 minutos)
 */
function startNewsScheduler(client, intervalMinutes = 60) {
    const intervalMs = intervalMinutes * 60 * 1000;
    
    // Enviar noticias inmediatamente si hay suscriptores
    if (subscribedUsers.size > 0 || subscribedGroups.size > 0) {
        console.log('🔄 Enviando noticias iniciales a los suscriptores en 10 segundos...');
        setTimeout(() => broadcastNews(client), 10000); // Esperar 10 segundos después de iniciar
    }
    
    // Programar envío periódico de noticias
    const intervalId = setInterval(async () => {
        console.log(`⏰ Temporizador activado - Enviando noticias programadas (cada ${intervalMinutes} minutos)`);
        await broadcastNews(client);
    }, intervalMs);
    
    console.log(`📆 Programador de noticias iniciado. Envío cada ${intervalMinutes} minutos. Próximo envío en ${intervalMinutes} minutos.`);
    
    // Devolver el ID del intervalo para poder detenerlo si es necesario
    return intervalId;
}

/**
 * Suscribir a un usuario para recibir noticias automáticas
 * @param {string} userId - ID del usuario
 * @param {boolean} sendImmediate - Enviar noticia inmediatamente
 * @param {object} client - Cliente de WhatsApp (necesario para envío inmediato)
 */
async function subscribeUser(userId, sendImmediate = false, client = null) {
    subscribedUsers.add(userId);
    console.log(`👤 Usuario ${userId} suscrito a noticias automáticas`);
    
    // Enviar noticia inmediatamente si se solicita
    if (sendImmediate && client) {
        console.log(`🔄 Enviando noticia inicial a usuario ${userId}`);
        await sendNewsToChat(client, userId, false);
    }
    
    return true;
}

/**
 * Suscribir a un grupo para recibir noticias automáticas
 * @param {string} groupId - ID del grupo
 * @param {boolean} sendImmediate - Enviar noticia inmediatamente
 * @param {object} client - Cliente de WhatsApp (necesario para envío inmediato)
 */
async function subscribeGroup(groupId, sendImmediate = false, client = null) {
    subscribedGroups.add(groupId);
    console.log(`👥 Grupo ${groupId} suscrito a noticias automáticas`);
    
    // Enviar noticia inmediatamente si se solicita
    if (sendImmediate && client) {
        console.log(`🔄 Enviando noticia inicial a grupo ${groupId}`);
        await sendNewsToChat(client, groupId, true);
    }
    
    return true;
}

/**
 * Cancelar suscripción de un usuario
 * @param {string} userId - ID del usuario
 */
function unsubscribeUser(userId) {
    const result = subscribedUsers.delete(userId);
    if (result) {
        console.log(`🚫 Usuario ${userId} ha cancelado su suscripción`);
    }
    return result;
}

/**
 * Cancelar suscripción de un grupo
 * @param {string} groupId - ID del grupo
 */
function unsubscribeGroup(groupId) {
    const result = subscribedGroups.delete(groupId);
    if (result) {
        console.log(`🚫 Grupo ${groupId} ha cancelado su suscripción`);
    }
    return result;
}

/**
 * Verificar si un usuario está suscrito
 * @param {string} userId - ID del usuario
 */
function isUserSubscribed(userId) {
    return subscribedUsers.has(userId);
}

/**
 * Verificar si un grupo está suscrito
 * @param {string} groupId - ID del grupo
 */
function isGroupSubscribed(groupId) {
    return subscribedGroups.has(groupId);
}

/**
 * Obtener cantidad de suscriptores (usuarios y grupos)
 */
function getSubscribedCount() {
    return {
        users: subscribedUsers.size,
        groups: subscribedGroups.size,
        total: subscribedUsers.size + subscribedGroups.size
    };
}

module.exports = {
    startNewsScheduler,
    sendNewsToChat,
    broadcastNews,
    subscribeUser,
    subscribeGroup,
    unsubscribeUser,
    unsubscribeGroup,
    isUserSubscribed,
    isGroupSubscribed,
    getSubscribedCount
}; 