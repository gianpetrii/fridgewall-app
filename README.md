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

Copiá [`.env.example`](.env.example) y configurá las claves `EXPO_PUBLIC_*` y Google Maps según el archivo.
