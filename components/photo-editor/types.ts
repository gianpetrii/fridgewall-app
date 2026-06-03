export type EditorColor = '#ffffff' | '#000000' | '#facc15' | '#ef4444' | '#3b82f6';

export type EditorMode = 'draw' | 'text';

export interface DrawStroke {
  type: 'stroke';
  points: { x: number; y: number }[];
  color: EditorColor;
  strokeWidth: number;
}

export interface TextLayer {
  type: 'text';
  id: string;
  x: number;
  y: number;
  text: string;
  color: EditorColor;
  fontSize: number;
}

export type EditorLayer = DrawStroke | TextLayer;

export const EDITOR_COLORS: EditorColor[] = ['#ffffff', '#000000', '#facc15', '#ef4444', '#3b82f6'];

export const FONT_SIZES = [24, 36] as const;
