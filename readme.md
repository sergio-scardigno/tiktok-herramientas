# Herramientas para TikTok Streamers

![TikTok Decision Maker](https://img.shields.io/badge/TikTok-Decision%20Maker-ff2d55)
![Versión](https://img.shields.io/badge/versión-1.0.0-blue)
![Licencia](https://img.shields.io/badge/licencia-MIT-green)

Una herramienta interactiva para streamers de TikTok que permite a los espectadores participar en decisiones de juegos a través de likes y comentarios durante transmisiones en vivo.

## 🎮 Características

- **Sistema de votación en tiempo real**: Permite que tu audiencia de TikTok Live vote sobre decisiones de juego a través de likes y comentarios
- **Reto del globo**: Establece objetivos de likes con visualizaciones animadas de globos
- **Banners personalizables**: Muestra mensajes importantes a tu audiencia
- **Publicidad en video**: Muestra videos promocionales que rotan automáticamente
- **Modo de simulación**: Prueba las funciones sin necesidad de una transmisión en vivo de TikTok
- **Overlays responsivos**: Componentes visuales limpios y atractivos para tu stream

## 📋 Requisitos

- Node.js (v14 o superior)
- npm o yarn
- Una cuenta de TikTok con acceso a Live

## 🔧 Instalación

1. Clona el repositorio:
```bash
git clone https://github.com/tuusuario/tiktok-decision-maker.git
cd tiktok-decision-maker
```

2. Instala las dependencias:
```bash
npm install
```

3. Crea los directorios de medios (si no existen):
```bash
mkdir -p public/videos
mkdir -p public/sounds
```

4. Inicia la aplicación:
```bash
node decision-server.js
```

5. Accede a la aplicación:
- Interfaz principal: `http://localhost:3000/`
- Panel de configuración: `http://localhost:3000/configuracion`

## 🎯 Cómo usar

### Configuración

1. Abre el panel de configuración en `http://localhost:3000/configuracion`
2. Ingresa tu nombre de usuario de TikTok para conectarte a tu transmisión en vivo
3. Personaliza opciones de votación, retos del globo o banners

### Sistema de Votación

1. Crea una nueva encuesta con dos opciones (una para likes, otra para comentarios)
2. Establece la duración de la votación
3. Inicia la votación y añade el overlay a tu stream
4. Los espectadores pueden participar dando like (para la opción 1) o comentando (para la opción 2)
5. Cuando el temporizador finaliza, se muestra la opción ganadora

### Reto del Globo

1. Establece un número objetivo de likes y un límite de tiempo
2. Inicia el reto y añade el overlay a tu stream
3. El globo se infla con cada like
4. Si los espectadores alcanzan el objetivo antes de que expire el tiempo, el globo explota

### Banners Personalizables

1. Crea banners con títulos y mensajes personalizados
2. Elige entre diferentes temas visuales
3. Añade el overlay del banner a tu stream

### Videos Publicitarios

1. Añade tus videos promocionales a través del panel de configuración
2. Establece intervalos de rotación y opciones
3. Añade el overlay de publicidad a tu stream

## 🖥️ Componentes de la Interfaz

- **Panel de Votación**: `http://localhost:3000/voting`
- **Reto del Globo**: `http://localhost:3000/ballon`
- **Visualización de Banner**: `http://localhost:3000/banner`
- **Reproductor de Publicidad**: `http://localhost:3000/advertising`
- **Panel de Configuración**: `http://localhost:3000/configuracion`

## 🛠️ Detalles Técnicos

La aplicación está construida con:
- **Backend**: Node.js, Express, Socket.io
- **Frontend**: HTML, CSS, JavaScript, Bootstrap
- **Integración con TikTok**: tiktok-live-connector

## 🔊 Efectos de Sonido

La aplicación incluye efectos de sonido para:
- Inicio/fin de votaciones
- Nuevos votos recibidos
- Resultados ganadores (tanto para opciones de like como de comentario)
- Inicio/éxito/fracaso del reto del globo

## 🧩 Estructura del Proyecto

```
tiktok-decision-maker/
├── decision-server.js         # Archivo principal del servidor
├── package.json               # Dependencias
├── custom_votings.json        # Plantillas de votación personalizadas guardadas
├── public/                    # Activos del frontend
│   ├── index.html             # Página principal de navegación
│   ├── config.html            # Interfaz de configuración
│   ├── voting.html            # Overlay de votación
│   ├── ballon.html            # Overlay del reto del globo
│   ├── banner.html            # Overlay de banner personalizado
│   ├── advertising.html       # Overlay de videos publicitarios
│   ├── videos/                # Archivos de video para publicidad
│   └── sounds/                # Archivos de efectos de sonido
```

## 📝 Licencia

Este proyecto está licenciado bajo la Licencia MIT - consulta el archivo LICENSE para más detalles.

## 🤝 Contribuciones

¡Las contribuciones, problemas y solicitudes de funciones son bienvenidos! No dudes en consultar la [página de problemas](https://github.com/tuusuario/tiktok-decision-maker/issues).

## 🙏 Agradecimientos

- [tiktok-live-connector](https://github.com/zerodytrash/TikTok-Live-Connector) por la integración con la API de TikTok Live
- [Socket.io](https://socket.io/) para la comunicación en tiempo real
- [Bootstrap](https://getbootstrap.com/) para los componentes de UI

---

Hecho con ❤️ para streamers de TikTok
