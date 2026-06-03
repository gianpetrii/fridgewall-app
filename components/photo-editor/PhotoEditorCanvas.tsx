import * as React from 'react';
import {
  View,
  Image,
  Text,
  StyleSheet,
  Dimensions,
  PanResponder,
  Pressable,
  TextInput,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { EditorColor, EditorLayer, EditorMode, TextLayer } from './types';
import { EDITOR_COLORS, FONT_SIZES } from './types';

const { width: SCREEN_W } = Dimensions.get('window');
const CANVAS_SIZE = SCREEN_W;

function pointsToSvgPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  const [first, ...rest] = points;
  let d = `M ${first.x} ${first.y}`;
  for (const p of rest) {
    d += ` L ${p.x} ${p.y}`;
  }
  return d;
}

function DraggableText({
  layer,
  onMove,
  onEdit,
  selected,
  dragEnabled,
}: {
  layer: TextLayer;
  onMove: (id: string, x: number, y: number) => void;
  onEdit: (id: string) => void;
  selected: boolean;
  dragEnabled: boolean;
}) {
  const origin = React.useRef({ x: layer.x, y: layer.y });
  const [dragOffset, setDragOffset] = React.useState({ x: 0, y: 0 });

  React.useEffect(() => {
    origin.current = { x: layer.x, y: layer.y };
    setDragOffset({ x: 0, y: 0 });
  }, [layer.x, layer.y]);

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => dragEnabled,
        onMoveShouldSetPanResponder: () => dragEnabled,
        onPanResponderGrant: () => {
          origin.current = { x: layer.x, y: layer.y };
          setDragOffset({ x: 0, y: 0 });
        },
        onPanResponderMove: (_, gesture) => {
          setDragOffset({ x: gesture.dx, y: gesture.dy });
        },
        onPanResponderRelease: (_, gesture) => {
          const x = origin.current.x + gesture.dx;
          const y = origin.current.y + gesture.dy;
          setDragOffset({ x: 0, y: 0 });
          onMove(layer.id, x, y);
        },
      }),
    [dragEnabled, layer.id, layer.x, layer.y, onMove],
  );

  return (
    <View
      style={[
        styles.textLayer,
        {
          transform: [
            { translateX: layer.x + dragOffset.x },
            { translateY: layer.y + dragOffset.y },
          ],
        },
      ]}
      {...(dragEnabled ? panResponder.panHandlers : {})}
    >
      <Pressable onPress={() => onEdit(layer.id)}>
        <Text
          style={{
            color: layer.color,
            fontSize: layer.fontSize,
            fontWeight: '700',
            textShadowColor: 'rgba(0,0,0,0.6)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 4,
            borderWidth: selected ? 1 : 0,
            borderColor: '#fff',
            borderStyle: 'dashed',
            padding: 4,
          }}
        >
          {layer.text}
        </Text>
      </Pressable>
    </View>
  );
}

export interface PhotoEditorCanvasProps {
  uri: string;
  mode: EditorMode;
  color: EditorColor;
  fontSize: number;
  layers: EditorLayer[];
  onLayersChange: (layers: EditorLayer[]) => void;
  canvasRef: React.RefObject<View>;
}

export function PhotoEditorCanvas({
  uri,
  mode,
  color,
  fontSize,
  layers,
  onLayersChange,
  canvasRef,
}: PhotoEditorCanvasProps) {
  const [currentStroke, setCurrentStroke] = React.useState<{ x: number; y: number }[]>([]);
  const strokeRef = React.useRef<{ x: number; y: number }[]>([]);
  const [selectedTextId, setSelectedTextId] = React.useState<string | null>(null);
  const [editingText, setEditingText] = React.useState('');
  const [showTextInput, setShowTextInput] = React.useState(false);

  const strokes = layers.filter((l): l is EditorLayer & { type: 'stroke' } => l.type === 'stroke');
  const texts = layers.filter((l): l is TextLayer => l.type === 'text');

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => mode === 'draw',
        onMoveShouldSetPanResponder: () => mode === 'draw',
        onPanResponderGrant: (evt) => {
          const { locationX, locationY } = evt.nativeEvent;
          const start = [{ x: locationX, y: locationY }];
          strokeRef.current = start;
          setCurrentStroke(start);
        },
        onPanResponderMove: (evt) => {
          const { locationX, locationY } = evt.nativeEvent;
          strokeRef.current = [...strokeRef.current, { x: locationX, y: locationY }];
          setCurrentStroke(strokeRef.current);
        },
        onPanResponderRelease: () => {
          const pts = strokeRef.current;
          if (pts.length > 1) {
            onLayersChange([
              ...layers,
              { type: 'stroke', points: pts, color, strokeWidth: 4 },
            ]);
          }
          strokeRef.current = [];
          setCurrentStroke([]);
        },
      }),
    [mode, color, layers, onLayersChange],
  );

  const handleCanvasPress = () => {
    if (mode !== 'text') return;
    setSelectedTextId(null);
    setEditingText('');
    setShowTextInput(true);
  };

  const commitNewText = () => {
    const trimmed = editingText.trim();
    if (!trimmed) {
      setShowTextInput(false);
      return;
    }
    const id = `text-${Date.now()}`;
    onLayersChange([
      ...layers,
      {
        type: 'text',
        id,
        x: CANVAS_SIZE / 2 - 40,
        y: CANVAS_SIZE / 2 - 20,
        text: trimmed,
        color,
        fontSize,
      },
    ]);
    setShowTextInput(false);
    setEditingText('');
    setSelectedTextId(id);
  };

  const moveText = (id: string, x: number, y: number) => {
    onLayersChange(
      layers.map((l) => (l.type === 'text' && l.id === id ? { ...l, x, y } : l)),
    );
  };

  const editText = (id: string) => {
    const layer = texts.find((t) => t.id === id);
    if (!layer) return;
    setSelectedTextId(id);
    setEditingText(layer.text);
    setShowTextInput(true);
  };

  const saveEditedText = () => {
    if (!selectedTextId) {
      commitNewText();
      return;
    }
    const trimmed = editingText.trim();
    if (!trimmed) {
      onLayersChange(layers.filter((l) => !(l.type === 'text' && l.id === selectedTextId)));
    } else {
      onLayersChange(
        layers.map((l) =>
          l.type === 'text' && l.id === selectedTextId ? { ...l, text: trimmed, color, fontSize } : l,
        ),
      );
    }
    setShowTextInput(false);
    setSelectedTextId(null);
  };

  return (
    <View>
      <Pressable onPress={handleCanvasPress}>
        <View
          ref={canvasRef}
          collapsable={false}
          style={[styles.canvas, { width: CANVAS_SIZE, height: CANVAS_SIZE }]}
          {...(mode === 'draw' ? panResponder.panHandlers : {})}
        >
          <Image source={{ uri }} style={styles.photo} resizeMode="cover" />

          <Svg
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          >
            {strokes.map((s, i) => (
              <Path
                key={`stroke-${i}`}
                d={pointsToSvgPath(s.points)}
                stroke={s.color}
                strokeWidth={s.strokeWidth}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            {currentStroke.length > 1 && (
              <Path
                d={pointsToSvgPath(currentStroke)}
                stroke={color}
                strokeWidth={4}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </Svg>

          {texts.map((t) => (
            <DraggableText
              key={t.id}
              layer={t}
              selected={selectedTextId === t.id}
              dragEnabled={mode === 'text'}
              onMove={moveText}
              onEdit={editText}
            />
          ))}
        </View>
      </Pressable>

      {showTextInput && (
        <View style={styles.textInputOverlay}>
          <TextInput
            autoFocus
            value={editingText}
            onChangeText={setEditingText}
            placeholder="Escribí algo..."
            placeholderTextColor="#71717a"
            style={styles.textInput}
            maxLength={80}
            onSubmitEditing={saveEditedText}
          />
          <View style={styles.textInputActions}>
            <Pressable onPress={() => setShowTextInput(false)}>
              <Text style={styles.actionCancel}>Cancelar</Text>
            </Pressable>
            <Pressable onPress={saveEditedText}>
              <Text style={styles.actionOk}>Listo</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

export function ColorPicker({
  color,
  onColorChange,
}: {
  color: EditorColor;
  onColorChange: (c: EditorColor) => void;
}) {
  return (
    <View style={styles.colorRow}>
      {EDITOR_COLORS.map((c) => (
        <Pressable
          key={c}
          onPress={() => onColorChange(c)}
          style={[
            styles.colorDot,
            { backgroundColor: c },
            color === c && styles.colorDotSelected,
          ]}
        />
      ))}
    </View>
  );
}

export function FontSizePicker({
  fontSize,
  onFontSizeChange,
}: {
  fontSize: number;
  onFontSizeChange: (s: number) => void;
}) {
  return (
    <View style={styles.fontRow}>
      {FONT_SIZES.map((s) => (
        <Pressable
          key={s}
          onPress={() => onFontSizeChange(s)}
          style={[styles.fontBtn, fontSize === s && styles.fontBtnSelected]}
        >
          <Text style={{ fontSize: s / 2, color: '#fff', fontWeight: '700' }}>Aa</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    overflow: 'hidden',
    borderRadius: 0,
    backgroundColor: '#000',
  },
  photo: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  textLayer: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 10,
  },
  textInputOverlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 120,
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderRadius: 12,
    padding: 12,
  },
  textInput: {
    color: '#fff',
    fontSize: 18,
    padding: 8,
  },
  textInputActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    marginTop: 8,
  },
  actionCancel: { color: '#a1a1aa', fontSize: 16 },
  actionOk: { color: '#fff', fontSize: 16, fontWeight: '600' },
  colorRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorDotSelected: {
    borderColor: '#fff',
  },
  fontRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  fontBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  fontBtnSelected: {
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
});
