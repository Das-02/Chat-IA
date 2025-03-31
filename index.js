const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { getTechNews, searchNews, formatNewsForWhatsApp } = require('./newsService');
const { 
    startNewsScheduler, 
    subscribeUser, 
    subscribeGroup,
    unsubscribeUser, 
    unsubscribeGroup,
    isUserSubscribed, 
    isGroupSubscribed, 
    getSubscribedCount 
} = require('./newsScheduler');

// Inicializar el cliente de WhatsApp
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox']
    }
});

// Generar el código QR para autenticar
client.on('qr', (qr) => {
    console.log('QR RECIBIDO, escanea con WhatsApp Business:');
    qrcode.generate(qr, { small: true });
});

// Evento cuando el cliente está listo
client.on('ready', () => {
    console.log('¡Bot conectado y listo para usar!');
    
    // Iniciar el programador de noticias automatizado (cada 60 minutos)
    startNewsScheduler(client, 60);
});

// Manejar mensajes entrantes
client.on('message', async (message) => {
    const content = message.body.toLowerCase();
    const chatId = message.from;
    const isGroup = chatId.includes('@g.us');
    
    // Comando para ver noticias de tecnología
    if (content === 'noticias' || content === 'tecnología' || content === 'tech') {
        try {
            await message.reply('Buscando las últimas noticias de tecnología, espera un momento...');
            const news = await getTechNews(5);
            const formattedNews = formatNewsForWhatsApp(news);
            await message.reply(formattedNews);
        } catch (error) {
            console.error('Error al obtener noticias:', error);
            await message.reply('❌ Lo siento, hubo un problema al obtener las noticias. Inténtalo más tarde.');
        }
        return;
    }
    
    // Comando para buscar noticias sobre un tema específico
    if (content.startsWith('buscar ')) {
        const searchTerm = content.substring(7).trim();
        if (searchTerm.length < 3) {
            await message.reply('❌ Por favor, proporciona un término de búsqueda más específico (mínimo 3 caracteres).');
            return;
        }
        
        try {
            await message.reply(`Buscando noticias sobre "${searchTerm}", espera un momento...`);
            const news = await searchNews(searchTerm, 5);
            const formattedNews = formatNewsForWhatsApp(news);
            await message.reply(formattedNews);
        } catch (error) {
            console.error('Error al buscar noticias:', error);
            await message.reply('❌ Lo siento, hubo un problema al buscar noticias. Inténtalo más tarde.');
        }
        return;
    }
    
    // Comandos para activar/desactivar noticias automáticas
    if (isGroup) {
        // ======= COMANDOS PARA GRUPOS =======
        
        // Activar noticias automáticas en un grupo
        if (content === 'activar grupo' || content === 'suscribir grupo') {
            if (isGroupSubscribed(chatId)) {
                await message.reply('✅ Este grupo ya está recibiendo noticias automáticas cada hora.');
            } else {
                await subscribeGroup(chatId, true, client); // Suscribir y enviar noticia inmediatamente
                await message.reply(
                    '✅ *¡Noticias automáticas activadas en este grupo!*\n\n' +
                    'Este grupo recibirá una noticia de tecnología cada hora.\n\n' +
                    'Para desactivar las noticias automáticas, escribe "desactivar grupo".'
                );
            }
            return;
        }
        
        // Desactivar noticias automáticas en un grupo
        if (content === 'desactivar grupo' || content === 'cancelar grupo') {
            if (isGroupSubscribed(chatId)) {
                unsubscribeGroup(chatId);
                await message.reply('✅ Se han desactivado las noticias automáticas en este grupo.');
            } else {
                await message.reply('❌ Este grupo no está recibiendo noticias automáticas actualmente. Para activarlas, escribe "activar grupo".');
            }
            return;
        }
        
        // Estado de suscripción en el grupo
        if (content === 'estado grupo') {
            if (isGroupSubscribed(chatId)) {
                await message.reply('✅ Este grupo está recibiendo noticias automáticas cada hora.');
            } else {
                await message.reply('❌ Este grupo no está recibiendo noticias automáticas. Para activarlas, escribe "activar grupo".');
            }
            return;
        }
    } else {
        // ======= COMANDOS PARA CHATS INDIVIDUALES =======
        
        // Activar noticias automáticas para usuario
        if (content === 'activar' || content === 'suscribir' || content === 'automatico') {
            if (isUserSubscribed(chatId)) {
                await message.reply('✅ Ya estás recibiendo noticias automáticas cada hora.');
            } else {
                await subscribeUser(chatId, true, client); // Suscribir y enviar noticia inmediatamente
                await message.reply(
                    '✅ *¡Noticias automáticas activadas!*\n\n' +
                    'Recibirás una noticia de tecnología cada hora.\n\n' +
                    'Para desactivar las noticias automáticas, escribe "desactivar".'
                );
            }
            return;
        }
        
        // Desactivar noticias automáticas para usuario
        if (content === 'desactivar' || content === 'cancelar' || content === 'parar') {
            if (isUserSubscribed(chatId)) {
                unsubscribeUser(chatId);
                await message.reply('✅ Has desactivado las noticias automáticas.');
            } else {
                await message.reply('❌ No estás recibiendo noticias automáticas actualmente. Para activarlas, escribe "activar".');
            }
            return;
        }
        
        // Estado de suscripción del usuario
        if (content === 'estado') {
            if (isUserSubscribed(chatId)) {
                await message.reply('✅ Estás recibiendo noticias automáticas cada hora.');
            } else {
                await message.reply('❌ No estás recibiendo noticias automáticas. Para activarlas, escribe "activar".');
            }
            return;
        }
    }
    
    // Comandos administrativos y generales (funcionan tanto en grupos como en chats individuales)
    
    // Ver estadísticas de suscripciones (solo para el dueño del bot)
    if (content === 'estadisticas' && message.fromMe) {
        const stats = getSubscribedCount();
        await message.reply(
            '📊 *Estadísticas de Suscripciones*\n\n' +
            `- Usuarios suscritos: ${stats.users}\n` +
            `- Grupos suscritos: ${stats.groups}\n` +
            `- Total de suscriptores: ${stats.total}`
        );
        return;
    }
    
    // Responder a comandos básicos
    if (content === 'hola') {
        if (isGroup) {
            await message.reply(
                '¡Hola! Soy un bot de noticias de tecnología.\n\n' +
                'Para recibir noticias en este grupo de forma automática cada hora, escribe "activar grupo".\n\n' +
                'Para ver más opciones, escribe "ayuda".'
            );
        } else {
            await message.reply(
                '¡Hola! Soy un bot de noticias de tecnología.\n\n' +
                'Para recibir noticias de forma automática cada hora, escribe "activar".\n\n' +
                'Para ver más opciones, escribe "ayuda".'
            );
        }
    } 
    else if (content === 'ayuda' || content === 'help') {
        if (isGroup) {
            await message.reply(
                '📱 *COMANDOS DISPONIBLES EN GRUPOS* 📱\n\n' +
                '- noticias: Ver últimas noticias de tecnología\n' +
                '- buscar [término]: Buscar noticias sobre un tema específico\n' +
                '- activar grupo: Recibir noticias automáticas en este grupo cada hora\n' +
                '- desactivar grupo: Cancelar noticias automáticas en este grupo\n' +
                '- estado grupo: Verificar si este grupo recibe noticias automáticas\n' +
                '- hola: Saludo inicial\n' +
                '- ayuda: Ver esta lista de comandos'
            );
        } else {
            await message.reply(
                '📱 *COMANDOS DISPONIBLES* 📱\n\n' +
                '- noticias: Ver últimas noticias de tecnología\n' +
                '- buscar [término]: Buscar noticias sobre un tema específico\n' +
                '- activar: Recibir noticias automáticas cada hora\n' +
                '- desactivar: Cancelar noticias automáticas\n' +
                '- estado: Verificar si estás recibiendo noticias automáticas\n' +
                '- hola: Saludo inicial\n' +
                '- ayuda: Ver esta lista de comandos'
            );
        }
    }
    else if (!isGroup) {
        // Mensajes de ayuda adicionales solo para chats individuales
        await message.reply(
            'Para ver noticias, escribe "noticias" o busca un tema específico con "buscar [término]".\n\n' +
            'Para recibir noticias automáticas cada hora, escribe "activar".\n\n' +
            'Para más opciones, escribe "ayuda".'
        );
    }
});

// Iniciar el cliente
client.initialize(); 