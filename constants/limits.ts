/**
 * Límites para controlar costos de Firebase (Storage + bandwidth).
 * Las fotos vencen a las 24h (TTL), así que "activas" = vigentes en este momento.
 */
export const LIMITS = {
  /** Cantidad máxima de walls a las que un usuario puede pertenecer (creadas + unidas). */
  WALLS_PER_USER: 5,
  /** Fotos activas que cada usuario puede tener al mismo tiempo dentro de un wall. */
  PHOTOS_PER_USER_PER_WALL: 3,
  /** Tope duro de fotos activas por wall (red de seguridad ante grupos grandes). */
  PHOTOS_PER_WALL: 30,
} as const;

export const limitMessages = {
  wallsPerUser: `Llegaste al máximo de ${LIMITS.WALLS_PER_USER} walls. Salí de uno para crear o unirte a otro.`,
  photosPerUser: `Ya tenés ${LIMITS.PHOTOS_PER_USER_PER_WALL} fotos activas en este wall. Esperá a que alguna venza (24h) para subir otra.`,
  photosPerWall: `Este wall llegó al máximo de ${LIMITS.PHOTOS_PER_WALL} fotos activas. Esperá a que alguna venza para subir otra.`,
} as const;
