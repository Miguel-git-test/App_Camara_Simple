# Fast Cam - Simple & Lightweight PWA Camera

Una aplicación de cámara ultra-rápida diseñada para ser usada como PWA (Progressive Web App) en dispositivos móviles. Enfocada en la simplicidad, velocidad y privacidad.

## ✨ Características

- **Detección Automática de Hardware**: La app prueba diferentes configuraciones (1080p, 720p, 480p) al inicio para encontrar la máxima calidad que tu dispositivo soporta de forma estable.
- **Grabación Híbrida**: Captura fotos de alta resolución mientras grabas vídeo sin interrumpir la grabación.
- **Interfaz Premium**: Botones con animaciones fluidas y estados claros (Círculo para grabar, Cuadrado para detener).
- **Integración con Galería Nativa**: El botón de biblioteca abre directamente el selector de archivos de tu sistema.
- **Privacidad Total**: Las fotos y vídeos se procesan localmente y se guardan en tu dispositivo. No hay servidores intermedios.
- **PWA Ready**: Instálala en tu pantalla de inicio para una experiencia similar a una app nativa.

## 🚀 Instalación y Despliegue

La aplicación requiere **HTTPS** para acceder a la cámara. La forma más sencilla de usarla es a través de GitHub Pages:

1.  **Sube los archivos** a un repositorio de GitHub (puedes usar GitHub Desktop).
2.  Ve a **Settings > Pages** en tu repositorio de GitHub.
3.  Selecciona la rama `main` y guarda.
4.  Abre la URL generada en tu móvil.
5.  **iOS**: Dale a *Compartir* > *Añadir a pantalla de inicio*.
6.  **Android**: Dale a *Instalar App* o *Añadir a pantalla de inicio*.

## 🛠️ Detalles Técnicos

- **Tecnología**: HTML5, CSS3 (Vanilla), JavaScript (ES6+).
- **Iconos**: Lucide Icons.
- **Almacenamiento**: IndexedDB para persistencia de la última captura y descarga automática al dispositivo.
- **Rendimiento**: Optimizado con bitrates controlados y codecs de alta compatibilidad (H.264).

## 📝 Notas de Versión (v1.2)

- Añadido sistema de diagnóstico y auto-ajuste de resolución.
- Corregida la lógica visual del botón de grabación.
- Añadida compatibilidad mejorada con diversos navegadores móviles.
