/**
 * Servicio para obtener noticias de tecnología usando GNews API
 */
const axios = require('axios');

// Configuración de APIs
const NEWS_API = {
    baseUrl: 'https://gnews.io/api/v4',
    apiKey: '', // API key
    enabled: true
};

const newsCache = {
    technology: {
        data: null,
        timestamp: 0
    },
    lastQuery: {
        query: '',
        data: null,
        timestamp: 0
    }
};

const CACHE_EXPIRY = 30 * 60 * 1000;

/**
 * Obtiene noticias de tecnología desde GNews
 */
async function getTechNews(count = 5) {
    try {
        const limit = Math.min(count, 10);
        
        const now = Date.now();
        if (newsCache.technology.data && (now - newsCache.technology.timestamp < CACHE_EXPIRY)) {
            return newsCache.technology.data.slice(0, limit);
        }
        
        if (!NEWS_API.enabled) {
            console.log('GNews API está deshabilitada, usando noticias de ejemplo');
            return getExampleNews().slice(0, limit);
        }
        
        console.log('Intentando obtener noticias desde GNews API...');
        try {
            const news = await getGNewsArticles('technology', limit);
            
            if (news && news.length > 0) {
                console.log(`GNews API devolvió ${news.length} noticias`);
                
                newsCache.technology = {
                    data: news,
                    timestamp: now
                };
                
                return news.slice(0, limit);
            } else {
                console.log('GNews API devolvió 0 noticias, usando noticias de ejemplo');
                return getExampleNews().slice(0, limit);
            }
        } catch (error) {
            console.error('Error con GNews API:', error);
            console.log('Usando noticias de ejemplo debido al error');
            return getExampleNews().slice(0, limit);
        }
        
    } catch (error) {
        console.error('Error general al obtener noticias:', error);
        return getExampleNews().slice(0, limit);
    }
}

/**
 * Busca noticias relacionadas con un término específico
 */
async function searchNews(query, count = 5) {
    try {
        const limit = Math.min(count, 10);
        
        const now = Date.now();
        if (
            newsCache.lastQuery.query === query && 
            newsCache.lastQuery.data && 
            (now - newsCache.lastQuery.timestamp < CACHE_EXPIRY)
        ) {
            return newsCache.lastQuery.data.slice(0, limit);
        }
        
        if (!NEWS_API.enabled) {
            console.log('GNews API está deshabilitada, usando noticias de ejemplo');
            return getExampleNews(query).slice(0, limit);
        }
        
        console.log(`Buscando "${query}" en GNews API...`);
        try {
            const news = await getGNewsArticles(query, limit);
            
            if (news && news.length > 0) {
                console.log(`GNews API devolvió ${news.length} resultados para "${query}"`);
                
                newsCache.lastQuery = {
                    query,
                    data: news,
                    timestamp: now
                };
                
                return news.slice(0, limit);
            } else {
                console.log(`GNews API no encontró resultados para "${query}", usando noticias de ejemplo`);
                return getExampleNews(query).slice(0, limit);
            }
        } catch (error) {
            console.error(`Error con GNews API al buscar "${query}":`, error);
            return getExampleNews(query).slice(0, limit);
        }
        
    } catch (error) {
        console.error('Error al buscar noticias:', error);
        return getExampleNews(query).slice(0, limit);
    }
}

/**
 * Obtiene artículos de GNews
 */
async function getGNewsArticles(topic, limit) {
    const isCategorySearch = ['technology', 'tech', 'tecnología'].includes(topic.toLowerCase());
    
    let url;
    const apikey = NEWS_API.apiKey;
    
    if (isCategorySearch) {
        url = `${NEWS_API.baseUrl}/top-headlines?category=technology&lang=es&country=any&max=${limit}&apikey=${apikey}`;
    } else {
        url = `${NEWS_API.baseUrl}/search?q=${encodeURIComponent(topic)}&lang=es&country=any&max=${limit}&apikey=${apikey}`;
    }
    
    console.log(`Llamando a GNews API: ${url.replace(apikey, '***API-KEY***')}`);
    
    try {
        const response = await axios.get(url);
        
        console.log(`GNews API respondió con status: ${response.status}`);
        
        if (!response.data.articles || response.data.articles.length === 0) {
            console.log('GNews devolvió un array vacío');
            return [];
        }
        
        console.log(`GNews devolvió ${response.data.articles.length} artículos`);
        
        return response.data.articles.map(article => ({
            title: article.title,
            description: article.description || 'No hay descripción disponible',
            url: article.url,
            urlToImage: article.image,  // GNews usa 'image' en lugar de 'urlToImage'
            source: article.source.name,
            publishedAt: new Date(article.publishedAt).toLocaleString()
        }));
    } catch (error) {
        console.error('Error al obtener artículos de GNews:', error.message);
        if (error.response) {
            console.error('Detalles de error:', error.response.status, error.response.data);
        }
        throw error;
    }
}

/**
 * Genera noticias de ejemplo cuando la API no está disponible
 */
function getExampleNews(query = '') {
    const now = new Date().toLocaleString();
    const queryText = query ? ` sobre ${query}` : '';
    
    return [
        {
            title: `Últimos avances en inteligencia artificial${queryText}`,
            description: 'Nuevos modelos de IA prometen revolucionar la forma en que interactuamos con la tecnología.',
            url: 'https://ejemplo.com/noticia1',
            urlToImage: 'https://via.placeholder.com/800x400?text=Inteligencia+Artificial',
            source: 'Tech News',
            publishedAt: now
        },
        {
            title: `El futuro de los smartphones${queryText}`,
            description: 'Los fabricantes apuestan por pantallas plegables y mayor durabilidad de la batería.',
            url: 'https://ejemplo.com/noticia2',
            urlToImage: 'https://via.placeholder.com/800x400?text=Smartphones',
            source: 'Mobile World',
            publishedAt: now
        },
        {
            title: `Avances en computación cuántica${queryText}`,
            description: 'Los investigadores logran mantener la estabilidad cuántica por más tiempo.',
            url: 'https://ejemplo.com/noticia3',
            urlToImage: 'https://via.placeholder.com/800x400?text=Computacion+Cuantica',
            source: 'Quantum News',
            publishedAt: now
        },
        {
            title: `Nuevas tendencias en desarrollo web${queryText}`,
            description: 'Frameworks y tecnologías que dominarán el desarrollo web en los próximos años.',
            url: 'https://ejemplo.com/noticia4',
            urlToImage: 'https://via.placeholder.com/800x400?text=Desarrollo+Web',
            source: 'Web Dev Magazine',
            publishedAt: now
        },
        {
            title: `La revolución del IoT${queryText}`,
            description: 'Cómo el Internet de las Cosas está transformando nuestros hogares y ciudades.',
            url: 'https://ejemplo.com/noticia5',
            urlToImage: 'https://via.placeholder.com/800x400?text=IoT',
            source: 'IoT Today',
            publishedAt: now
        }
    ];
}

/**
 * Formatea noticias para enviar a través de WhatsApp
 */
function formatNewsForWhatsApp(news) {
    if (!news || news.length === 0) {
        return '❌ No se encontraron noticias';
    }
    
    let formattedText = '🔍 *NOTICIAS DE TECNOLOGÍA* 🔍\n\n';
    
    news.forEach((item, index) => {
        formattedText += `*${index + 1}. ${item.title}*\n`;
        formattedText += `${item.description}\n`;
        formattedText += `Fuente: ${item.source}\n`;
        formattedText += `Publicado: ${item.publishedAt}\n`;
        formattedText += `🔗 ${item.url}\n\n`;
    });
    
    formattedText += '_Para buscar otro tema, escribe "buscar [término]"_';
    
    return formattedText;
}

module.exports = {
    getTechNews,
    searchNews,
    formatNewsForWhatsApp
}; 