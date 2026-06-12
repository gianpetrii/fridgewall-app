export type EditorColor = string;

export type FontFamily = 'default' | 'serif' | 'mono' | 'display';

export type EditorMode = 'none' | 'draw' | 'text';

export interface DrawStroke {
  type: 'stroke';
  points: { x: number; y: number }[];
  color: string;
  strokeWidth: number;
}

export interface TextLayer {
  type: 'text';
  id: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  text: string;
  color: string;
  fontSize: number;
  fontFamily: FontFamily;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  highlight: boolean;
}

export type EditorLayer = DrawStroke | TextLayer;

export const EDITOR_COLORS: string[] = [
  '#ffffff', '#000000', '#facc15', '#ef4444',
  '#3b82f6', '#22c55e', '#f97316', '#ec4899', '#a855f7',
];

export const FONT_SIZES = [24, 32, 40] as const;

export const FONT_FAMILIES: { id: FontFamily; label: string; fontFamily?: string }[] = [
  { id: 'default', label: 'Sans' },
  { id: 'serif', label: 'Serif', fontFamily: 'Georgia' },
  { id: 'mono', label: 'Mono', fontFamily: 'Courier New' },
  { id: 'display', label: 'Bold', fontFamily: 'HelveticaNeue-CondensedBold' },
];

export const BRUSH_SIZES = [
  { label: 'S', size: 3 },
  { label: 'M', size: 6 },
  { label: 'L', size: 12 },
] as const;

export type BrushSize = typeof BRUSH_SIZES[number]['size'];
