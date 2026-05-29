/** Textos de producto — un wall es la pared compartida de FridgeWall */
export const copy = {
  wall: 'wall',
  walls: 'walls',
  myWalls: 'Mis walls',
  tabWalls: 'Walls',
  createWall: 'Crear wall',
  joinWall: 'Unirme a un wall',
  createOrJoin: 'Crear o unirme a un wall',
  firstWall: 'Crear mi primer wall',
  wallNameLabel: 'Nombre del wall',
  noWallsYet: 'Todavía no tenés walls',
  deleteWall: 'Eliminar wall',
  leaveWall: 'Salir del wall',
  shareInvite: (name: string, code: string) =>
    `Unite a mi wall "${name}" en FridgeWall con el código: ${code}`,
  deleteWallConfirm: (name: string) =>
    `¿Eliminar "${name}"? Se borrarán todas las fotos del wall para todos los integrantes.`,
  leaveWallConfirm: (name: string) =>
    `¿Salir de "${name}"? Dejarás de ver las fotos de este wall.`,
  widgetPhotosHint:
    'Las fotos de tu wall están en el widget. Acá ves quién forma parte de cada una.',
  publishToWall: 'Publicar en la wall',
} as const;
