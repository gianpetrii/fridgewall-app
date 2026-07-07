# base-expo-app

## Descripción del proyecto

Plantilla móvil en **Expo ~52** con Expo Router, NativeWind, Zustand, React Hook Form + Zod y cliente **Supabase** para persistencia y auth según la configuración del proyecto.

## Problema que resuelve

Acelera el arranque de apps React Native con navegación por archivos, estilos utilitarios y cliente backend ya alineados, en lugar de configurar a mano router, tema, validación y Supabase en cada nuevo repositorio.

**Nota:** el [`app.config.ts`](app.config.ts) todavía usa nombre/slug *HappeningNow* (histórico compartido con [`happeningnow-app`](../happeningnow-app/)). Si partís de esta plantilla para otro producto, actualizá `name`, `slug`, `scheme` e identificadores de iOS/Android ahí.

## Stack

- Expo, Expo Router, React Native
- Supabase, NativeWind / Tailwind

## Requisitos

- Node.js LTS

## Instalación

```bash
npm install
npx expo start
```

Scripts: `npm run android`, `npm run ios`, `npm run web`.

## Variables de entorno

Copiá [`.env.local.example`](.env.local.example) y configurá las claves `EXPO_PUBLIC_*` y Google Maps según el archivo.


## Roadmap de features

### v1.1
- [ ] Push notifications (aviso cuando alguien sube una foto al wall)
- [ ] Visor fullscreen al tocar el widget
- [ ] Modo simple "solo fotos" (pantalla completa, mínima UI — accesibilidad)

### v1.2
- [ ] Widget de Lock Screen (foto del wall en pantalla bloqueada)
- [ ] Widget en modo StandBy (iPhone cargando)
- [ ] Modo accesible (texto y controles más grandes)

### v1.3
- [ ] Live Activity al publicar / recibir foto nueva (estilo atajo en lock screen)

### Más adelante
- [ ] Suscripciones de pago