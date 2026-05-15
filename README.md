# Aprender Inglés

PWA para aprender vocabulario en inglés mediante práctica de escritura y pronunciación. Funciona completamente offline una vez instalada.

## Características

- **Práctica de escritura** — se muestra la palabra en español y debes escribirla en inglés. Incluye pistas progresivas y avance automático al acertar.
- **Práctica de pronunciación** — pronuncia la palabra o la frase de ejemplo y recibe una puntuación de similitud en tiempo real usando Web Speech API.
- **Palabras difíciles** — marca palabras para repaso y accede a ellas desde la sección "Difíciles".
- **Progreso persistente** — el avance se guarda localmente con opción de exportar/importar como JSON.
- **PWA instalable** — funciona offline y se puede instalar en escritorio o móvil.

## Configuración disponible

| Opción | Descripción |
|---|---|
| Tema | Oscuro / Claro |
| Pronunciar automáticamente | Reproduce la palabra al cargar cada ejercicio |
| Qué pronunciar | Solo la palabra o toda la frase de ejemplo |
| Velocidad de voz | Slider de 0.5× a 1.5× con atajos rápidos |
| Voz | Selección de cualquier voz en inglés instalada en el sistema |

## Tecnologías

- [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/) + [vite-plugin-pwa](https://vite-pwa-org.netlify.app/)
- [Zustand](https://zustand-demo.pmnd.rs/) para estado global persistido
- [Tailwind CSS](https://tailwindcss.com/) para estilos
- [Framer Motion](https://www.framer.com/motion/) para animaciones
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API) para TTS y reconocimiento de voz

## Requisitos del navegador

El reconocimiento de voz requiere Chrome (desktop o Android) o Edge. Safari en iOS tiene soporte limitado. El TTS funciona en todos los navegadores modernos.

## Instalación y desarrollo

```bash
npm install
npm run dev
```

```bash
npm run build     # Genera el build de producción
npm run preview   # Previsualiza el build con soporte PWA
npm run typecheck # Verifica tipos sin compilar
```

## Estructura del proyecto

```
src/
├── components/   # Componentes reutilizables (Header, Layout, Toggle…)
├── hooks/        # useSpeak, useRecognize, useShortcuts, useDevice
├── pages/        # Home, TypingPractice, SpeakingPractice, Settings, DifficultReview
├── store/        # Zustand stores (settings, words, progress)
├── utils/        # normalize, similarity, hint
└── types.ts      # Tipos compartidos (Word, Batch, PracticeMode…)
public/
└── words.json    # Dataset de vocabulario (palabras, frases, IPA, traducciones)
```

## Licencia

MIT
