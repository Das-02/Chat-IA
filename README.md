# Bot de Noticias de Tecnología para WhatsApp

Este es un bot para WhatsApp Business que proporciona noticias de tecnología, tanto bajo demanda como automáticamente cada hora, para usuarios individuales y grupos.

## Características Principales

- 🌐 **Fuente de noticias**: Utiliza GNews.io como proveedor de noticias tecnológicas
- 📱 **Soporte para grupos**: Envío de noticias a grupos de WhatsApp
- ⏱️ **Noticias automáticas**: Envío programado cada hora con imágenes
- 🔍 **Búsqueda de noticias**: Busca noticias sobre temas específicos
- 🖼️ **Imágenes**: Incluye imágenes en las noticias cuando están disponibles
- 🛡️ **Tolerancia a fallos**: Sistema de respaldo con noticias de ejemplo cuando la API falla

## Requisitos

- Node.js (versión 14 o superior)
- Una cuenta de WhatsApp Business
- Un dispositivo para escanear el código QR
- (Opcional) API Key para [GNews.io](https://gnews.io/)

## Instalación

1. Clona este repositorio o descarga los archivos
2. Instala las dependencias:

```bash
npm install
```

3. (Opcional) Para mejorar la calidad de las noticias:
   - Regístrate en [GNews.io](https://gnews.io/) y obtén una API Key
   - Reemplaza la clave API en el archivo `newsService.js`

## Uso

1. Inicia el bot:

```bash
npm start
```

Para desarrollo (reinicio automático al hacer cambios):

```bash
npm run dev
```

2. Se generará un código QR en la terminal. Escanéalo con tu WhatsApp Business:
   - Abre WhatsApp Business en tu teléfono
   - Ve a Ajustes > WhatsApp Web/Desktop
   - Escanea el código QR mostrado en la terminal

3. Una vez conectado, el bot estará listo para recibir comandos y enviar noticias automáticamente.

## Comandos Disponibles

### Comandos de Noticias (Funcionan en chats individuales y grupos)
- "**noticias**" o "**tecnología**" - Ver las últimas noticias de tecnología
- "**buscar [término]**" - Buscar noticias sobre un tema específico (ej: "buscar inteligencia artificial")

### Comandos Generales
- "**hola**" - Saludo inicial
- "**ayuda**" - Ver lista de comandos disponibles

## Configuración Avanzada

### Fuente de Noticias
El bot utiliza GNews API como fuente principal de noticias. Si la API falla, el sistema automáticamente muestra noticias de ejemplo predefinidas.

Puedes configurar la API en `newsService.js`:

```javascript
const NEWS_API = {
    baseUrl: 'https://gnews.io/api/v4',
    apiKey: 'TU_API_KEY_AQUÍ',
    enabled: true  // Cambia a false para usar solo noticias de ejemplo
};
```

### Intervalo de Noticias Automáticas
Puedes modificar la frecuencia de envío de noticias automáticas en el archivo `index.js`:

```javascript
// Cambiar 60 por el número de minutos deseado
startNewsScheduler(client, 60);
```

## Estructura del Proyecto

- **index.js**: Archivo principal que maneja la conexión con WhatsApp y los comandos del usuario.
- **newsService.js**: Contiene funciones para obtener noticias de GNews y formatearlas.
- **newsScheduler.js**: Maneja el envío automático de noticias y las suscripciones.

## Solución de Problemas

Si encuentras el error "No se pudo obtener noticias para enviar", puede deberse a:

1. **Límites de API de GNews**: 
   - La cuenta gratuita tiene un límite de 100 solicitudes diarias
   - Cuando se alcanza este límite, el bot usará noticias de ejemplo automáticamente

2. **Configuración de API incorrecta**:
   - Verifica que la API key en `newsService.js` sea correcta
   - Comprueba que los parámetros de URL para GNews sean correctos:
     ```js
     // Para categorías:
     https://gnews.io/api/v4/top-headlines?category=technology&lang=es&country=any&max=10&apikey=TU_API_KEY
     
     // Para búsquedas:
     https://gnews.io/api/v4/search?q=TERMINO&lang=es&country=any&max=10&apikey=TU_API_KEY
     ```

3. **Problemas de conectividad**:
   - Verifica tu conexión a Internet
   - Algunos ISP podrían bloquear o limitar el acceso a estas APIs

### Verificación del funcionamiento de la API

Para verificar si tu API key de GNews funciona correctamente, puedes hacer la siguiente prueba:

1. Abre un navegador y visita la siguiente URL (reemplaza TU_API_KEY con tu clave):
   ```
   https://gnews.io/api/v4/search?q=example&lang=es&country=any&max=10&apikey=TU_API_KEY
   ```

2. Si recibes una respuesta JSON con artículos, la API funciona correctamente.
   Si recibes un error, verifica tu clave API y los límites de tu cuenta.

### Logs para diagnóstico

El bot genera logs detallados en la consola que pueden ayudar a diagnosticar problemas:

- "Intentando obtener noticias desde GNews API..." - Indica que está intentando usar GNews
- "GNews API devolvió X noticias" - Indica que GNews funcionó correctamente
- "GNews API devolvió 0 noticias, usando noticias de ejemplo" - Indica un problema con la respuesta
- "Error con GNews API:" - Indica que la API falló y se están usando noticias de ejemplo
- "GNews API está deshabilitada, usando noticias de ejemplo" - Indica que la API está configurada como deshabilitada