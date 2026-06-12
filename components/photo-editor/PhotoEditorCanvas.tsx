import * as React from 'react';
import {
  View,
  Image,
  Text as RNText,
  StyleSheet,
  Dimensions,
  PanResponder,
  Pressable,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Animated as RNAnimated,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Trash2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type { BrushSize, EditorLayer, EditorMode, FontFamily, TextLayer } from './types';
import { BRUSH_SIZES, EDITOR_COLORS, FONT_FAMILIES } from './types';

const TRASH_CENTER_Y_RATIO = 0.84;

const { width: SCREEN_W } = Dimensions.get('window');
export const CANVAS_SIZE = SCREEN_W;

function getFontFamily(family: FontFamily): string | undefined {
  return FONT_FAMILIES.find((f) => f.id === family)?.fontFamily;
}

function pointsToSvgPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  const [first, ...rest] = points;
  let d = `M ${first.x} ${first.y}`;
  for (const p of rest) d += ` L ${p.x} ${p.y}`;
  return d;
}

// ─── Draggable / pinch-rotate text layer (RNGH v2 + Reanimated) ─────────────

interface DraggableTextProps {
  layer: TextLayer;
  dragEnabled: boolean;
  onUpdate: (id: string, updates: Partial<TextLayer>) => void;
  onSelect: (id: string) => void;
  onEditContent: (id: string) => void;
  onDragStart: () => void;
  onDragMove: (x: number, y: number) => void;
  onDrop: (id: string, x: number, y: number) => void;
}

function DraggableText({
  layer,
  dragEnabled,
  onUpdate,
  onSelect,
  onEditContent,
  onDragStart,
  onDragMove,
  onDrop,
}: DraggableTextProps) {
  // Reanimated shared values – driven on UI thread
  const translateX = useSharedValue(layer.x);
  const translateY = useSharedValue(layer.y);
  const scale = useSharedValue(layer.scale);
  const rotationRad = useSharedValue(layer.rotation * (Math.PI / 180));

  // Start-of-gesture snapshots
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startScale = useSharedValue(1);
  const startRotation = useSharedValue(0);

  // Sync from React state (after external updates like undo / edit)
  React.useEffect(() => { translateX.value = layer.x; }, [layer.x]);     // eslint-disable-line
  React.useEffect(() => { translateY.value = layer.y; }, [layer.y]);     // eslint-disable-line
  React.useEffect(() => { scale.value = layer.scale; }, [layer.scale]);  // eslint-disable-line
  React.useEffect(() => {                                                 // eslint-disable-line
    rotationRad.value = layer.rotation * (Math.PI / 180);
  }, [layer.rotation]);                                                   // eslint-disable-line

  const animatedStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 10,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotationRad.value}rad` },
      { scale: scale.value },
    ],
  }));

  const gesture = React.useMemo(() => {
    const doubleTap = Gesture.Tap()
      .numberOfTaps(2)
      .maxDuration(300)
      .enabled(dragEnabled)
      .onStart(() => { runOnJS(onEditContent)(layer.id); });

    const singleTap = Gesture.Tap()
      .numberOfTaps(1)
      .enabled(dragEnabled)
      .onStart(() => { runOnJS(onSelect)(layer.id); });

    const pan = Gesture.Pan()
      .minDistance(4)
      .enabled(dragEnabled)
      .onStart(() => {
        startX.value = translateX.value;
        startY.value = translateY.value;
        runOnJS(onSelect)(layer.id);
        runOnJS(onDragStart)();
      })
      .onUpdate((e) => {
        translateX.value = startX.value + e.translationX;
        translateY.value = startY.value + e.translationY;
        runOnJS(onDragMove)(translateX.value, translateY.value);
      })
      .onEnd(() => {
        runOnJS(onDrop)(layer.id, translateX.value, translateY.value);
      });

    const pinch = Gesture.Pinch()
      .enabled(dragEnabled)
      .onStart(() => { startScale.value = scale.value; })
      .onUpdate((e) => {
        scale.value = Math.max(0.3, Math.min(4, startScale.value * e.scale));
      })
      .onEnd(() => {
        runOnJS(onUpdate)(layer.id, { scale: scale.value });
      });

    const rot = Gesture.Rotation()
      .enabled(dragEnabled)
      .onStart(() => { startRotation.value = rotationRad.value; })
      .onUpdate((e) => { rotationRad.value = startRotation.value + e.rotation; })
      .onEnd(() => {
        runOnJS(onUpdate)(layer.id, { rotation: rotationRad.value * (180 / Math.PI) });
      });

    // Tap exclusive vs pan: if movement > minDistance, pan wins and taps are cancelled
    return Gesture.Simultaneous(
      Gesture.Exclusive(
        Gesture.Exclusive(doubleTap, singleTap),
        pan,
      ),
      pinch,
      rot,
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragEnabled, layer.id]);

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={animatedStyle}>
        <View style={layer.highlight ? styles.textHighlight : undefined}>
          <RNText
            style={{
              color: layer.color,
              fontSize: layer.fontSize,
              fontFamily: getFontFamily(layer.fontFamily),
              fontWeight: layer.bold ? '700' : '400',
              fontStyle: layer.italic ? 'italic' : 'normal',
              textDecorationLine: layer.underline ? 'underline' : 'none',
              textShadowColor: layer.highlight ? 'transparent' : 'rgba(0,0,0,0.7)',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: layer.highlight ? 0 : 4,
            }}
          >
            {layer.text}
          </RNText>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

// ─── Main canvas ─────────────────────────────────────────────────────────────

export interface PhotoEditorCanvasProps {
  uri: string;
  mode: EditorMode;
  color: string;
  fontSize: number;
  brushSize: BrushSize;
  fontFamily: FontFamily;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  highlight: boolean;
  layers: EditorLayer[];
  onLayersChange: (layers: EditorLayer[]) => void;
  canvasRef: React.RefObject<View>;
  selectedTextId: string | null;
  onSelectText: (id: string | null) => void;
}

export function PhotoEditorCanvas({
  uri,
  mode,
  color,
  fontSize,
  brushSize,
  fontFamily,
  bold,
  italic,
  underline,
  highlight,
  layers,
  onLayersChange,
  canvasRef,
  selectedTextId,
  onSelectText,
}: PhotoEditorCanvasProps) {
  const [currentStroke, setCurrentStroke] = React.useState<{ x: number; y: number }[]>([]);
  const strokeRef = React.useRef<{ x: number; y: number }[]>([]);
  const [showTextModal, setShowTextModal] = React.useState(false);
  const [textInput, setTextInput] = React.useState('');
  const [editingId, setEditingId] = React.useState<string | null>(null);

  // Trash zone state
  const [isDragging, setIsDragging] = React.useState(false);
  const [isOverTrash, setIsOverTrash] = React.useState(false);
  const trashScale = React.useRef(new RNAnimated.Value(1)).current;
  const trashOpacity = React.useRef(new RNAnimated.Value(0)).current;

  const checkOverTrash = (x: number, y: number) =>
    y > CANVAS_SIZE * TRASH_CENTER_Y_RATIO - 50 &&
    x > CANVAS_SIZE * 0.25 &&
    x < CANVAS_SIZE * 0.75;

  React.useEffect(() => {
    RNAnimated.timing(trashOpacity, {
      toValue: isDragging ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [isDragging, trashOpacity]);

  React.useEffect(() => {
    RNAnimated.spring(trashScale, {
      toValue: isOverTrash ? 1.3 : 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 6,
    }).start();
  }, [isOverTrash, trashScale]);

  // Always-fresh layers ref — prevents stale-closure bugs in callbacks
  const layersRef = React.useRef(layers);
  React.useEffect(() => { layersRef.current = layers; }, [layers]);

  const onLayersChangeRef = React.useRef(onLayersChange);
  React.useEffect(() => { onLayersChangeRef.current = onLayersChange; }, [onLayersChange]);

  const strokes = layers.filter(
    (l): l is EditorLayer & { type: 'stroke' } => l.type === 'stroke',
  );
  const texts = layers.filter((l): l is TextLayer => l.type === 'text');

  const drawPanResponder = React.useMemo(
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
          setCurrentStroke([...strokeRef.current]);
        },
        onPanResponderRelease: () => {
          const pts = strokeRef.current;
          if (pts.length > 1) {
            onLayersChange([
              ...layers,
              { type: 'stroke', points: pts, color, strokeWidth: brushSize },
            ]);
          }
          strokeRef.current = [];
          setCurrentStroke([]);
        },
      }),
    [mode, color, brushSize, layers, onLayersChange],
  );

  const openNewTextModal = React.useCallback(() => {
    onSelectText(null);
    setEditingId(null);
    setTextInput('');
    setShowTextModal(true);
  }, [onSelectText]);

  const canvasTapGesture = React.useMemo(
    () =>
      Gesture.Tap()
        .enabled(mode === 'text')
        .onStart(() => { runOnJS(openNewTextModal)(); }),
    [mode, openNewTextModal],
  );

  const openEditTextModal = (id: string) => {
    const t = texts.find((l) => l.id === id);
    if (!t) return;
    setEditingId(id);
    setTextInput(t.text);
    setShowTextModal(true);
  };

  const updateTextLayer = React.useCallback(
    (id: string, updates: Partial<TextLayer>) => {
      onLayersChangeRef.current(
        layersRef.current.map((l) => (l.type === 'text' && l.id === id ? { ...l, ...updates } : l)),
      );
    },
    [],
  );

  const handleDragStart = React.useCallback(() => {
    setIsDragging(true);
    setIsOverTrash(false);
  }, []);

  const handleDragMove = React.useCallback(
    (x: number, y: number) => {
      const over = checkOverTrash(x, y);
      setIsOverTrash((prev) => {
        if (over && !prev) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        }
        return over;
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const handleDrop = React.useCallback(
    (id: string, x: number, y: number) => {
      setIsDragging(false);
      setIsOverTrash(false);
      if (checkOverTrash(x, y)) {
        onLayersChangeRef.current(
          layersRef.current.filter((l) => !(l.type === 'text' && l.id === id)),
        );
        onSelectText(null);
      } else {
        onLayersChangeRef.current(
          layersRef.current.map((l) => (l.type === 'text' && l.id === id ? { ...l, x, y } : l)),
        );
      }
    },
    [onSelectText],
  );

  const commitText = () => {
    const trimmed = textInput.trim();
    setShowTextModal(false);
    setTextInput('');

    if (editingId) {
      if (!trimmed) {
        onLayersChange(layers.filter((l) => !(l.type === 'text' && l.id === editingId)));
      } else {
        onLayersChange(
          layers.map((l) =>
            l.type === 'text' && l.id === editingId ? { ...l, text: trimmed } : l,
          ),
        );
      }
      setEditingId(null);
    } else if (trimmed) {
      const id = `text-${Date.now()}`;
      onLayersChange([
        ...layers,
        {
          type: 'text',
          id,
          x: CANVAS_SIZE * 0.5 - 60,
          y: CANVAS_SIZE * 0.45,
          rotation: 0,
          scale: 1,
          text: trimmed,
          color,
          fontSize,
          fontFamily,
          bold,
          italic,
          underline,
          highlight,
        } as TextLayer,
      ]);
      onSelectText(id);
    }
  };

  return (
    <View>
      <GestureDetector gesture={canvasTapGesture}>
        <View
          ref={canvasRef}
          collapsable={false}
          style={[styles.canvas, { width: CANVAS_SIZE, height: CANVAS_SIZE }]}
          {...(mode === 'draw' ? drawPanResponder.panHandlers : {})}
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
                strokeWidth={brushSize}
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
              dragEnabled={mode === 'text'}
              onUpdate={updateTextLayer}
              onSelect={onSelectText}
              onEditContent={openEditTextModal}
              onDragStart={handleDragStart}
              onDragMove={handleDragMove}
              onDrop={handleDrop}
            />
          ))}

          {/* Trash zone overlay – visible while dragging a text */}
          <RNAnimated.View
            style={[
              styles.trashZone,
              { opacity: trashOpacity, transform: [{ scale: trashScale }] },
            ]}
            pointerEvents="none"
          >
            <View style={[styles.trashCircle, isOverTrash && styles.trashCircleHot]}>
              <Trash2 size={24} color={isOverTrash ? '#ef4444' : 'rgba(255,255,255,0.75)'} />
            </View>
          </RNAnimated.View>
        </View>
      </GestureDetector>

      <Modal
        visible={showTextModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTextModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalBg}
        >
          <View style={styles.textModalBox}>
            <TextInput
              autoFocus
              value={textInput}
              onChangeText={setTextInput}
              placeholder="Escribí algo..."
              placeholderTextColor="#71717a"
              style={styles.textInput}
              maxLength={80}
              multiline
              blurOnSubmit
              onSubmitEditing={commitText}
            />
            <View style={styles.textModalActions}>
              <Pressable
                onPress={() => {
                  setShowTextModal(false);
                  setTextInput('');
                  setEditingId(null);
                }}
                style={styles.modalBtn}
              >
                <RNText style={styles.modalBtnCancel}>Cancelar</RNText>
              </Pressable>
              <Pressable onPress={commitText} style={[styles.modalBtn, styles.modalBtnOkBg]}>
                <RNText style={styles.modalBtnOk}>Listo</RNText>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── Reusable tool components ─────────────────────────────────────────────────

export function ColorPicker({
  color,
  onColorChange,
}: {
  color: string;
  onColorChange: (c: string) => void;
}) {
  return (
    <View style={pickerStyles.colorRow}>
      {EDITOR_COLORS.map((c) => {
        const isSelected = color === c;
        const isLight = c === '#ffffff' || c === '#facc15';
        const defaultBorderColor = isLight ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.3)';
        return (
          <Pressable
            key={c}
            onPress={() => onColorChange(c)}
            style={[
              pickerStyles.colorOuterRing,
              { borderColor: isSelected ? '#ffffff' : defaultBorderColor },
            ]}
          >
            <View style={[pickerStyles.colorSwatch, { backgroundColor: c }]} />
          </Pressable>
        );
      })}
    </View>
  );
}

export function BrushSizePicker({
  brushSize,
  onBrushSizeChange,
}: {
  brushSize: BrushSize;
  onBrushSizeChange: (s: BrushSize) => void;
}) {
  return (
    <View style={pickerStyles.row}>
      {BRUSH_SIZES.map(({ size }) => (
        <Pressable
          key={size}
          onPress={() => onBrushSizeChange(size)}
          style={[pickerStyles.squareBtn, brushSize === size && pickerStyles.squareBtnActive]}
        >
          <View
            style={{
              width: size * 2,
              height: size * 2,
              borderRadius: size,
              backgroundColor: '#fff',
            }}
          />
        </Pressable>
      ))}
    </View>
  );
}

export function FontFamilyPicker({
  fontFamily,
  onFontFamilyChange,
}: {
  fontFamily: FontFamily;
  onFontFamilyChange: (f: FontFamily) => void;
}) {
  return (
    <View style={pickerStyles.row}>
      {FONT_FAMILIES.map(({ id, label, fontFamily: ff }) => (
        <Pressable
          key={id}
          onPress={() => onFontFamilyChange(id)}
          style={[pickerStyles.squareBtn, fontFamily === id && pickerStyles.squareBtnActive]}
        >
          <RNText
            style={{
              color: '#fff',
              fontSize: 20,
              fontFamily: ff,
              fontWeight: id === 'display' ? '900' : '400',
            }}
          >
            Aa
          </RNText>
          <RNText style={pickerStyles.squareBtnLabel}>{label}</RNText>
        </Pressable>
      ))}
    </View>
  );
}

export function StyleToggles({
  bold,
  italic,
  underline,
  highlight,
  onToggle,
}: {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  highlight: boolean;
  onToggle: (key: 'bold' | 'italic' | 'underline' | 'highlight') => void;
}) {
  const toggles: { key: 'bold' | 'italic' | 'underline' | 'highlight'; label: string; activeStyle?: object }[] = [
    { key: 'bold', label: 'B', activeStyle: { fontWeight: '700' as const } },
    { key: 'italic', label: 'I', activeStyle: { fontStyle: 'italic' as const } },
    { key: 'underline', label: 'U', activeStyle: { textDecorationLine: 'underline' as const } },
    { key: 'highlight', label: 'H' },
  ];
  const values = { bold, italic, underline, highlight };

  return (
    <View style={pickerStyles.row}>
      {toggles.map(({ key, label, activeStyle }) => (
        <Pressable
          key={key}
          onPress={() => onToggle(key)}
          style={[pickerStyles.squareBtn, values[key] && pickerStyles.squareBtnActive]}
        >
          <RNText style={[pickerStyles.toggleLabel, values[key] && activeStyle]}>
            {label}
          </RNText>
        </Pressable>
      ))}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  canvas: {
    overflow: 'hidden',
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
  trashZone: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
  },
  trashCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.7,
    shadowRadius: 4,
  },
  trashCircleHot: {},
  textHighlight: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  textModalBox: {
    backgroundColor: '#18181b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
  },
  textInput: {
    color: '#fff',
    fontSize: 18,
    padding: 12,
    backgroundColor: '#27272a',
    borderRadius: 12,
    minHeight: 60,
    maxHeight: 120,
  },
  textModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 12,
  },
  modalBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalBtnOkBg: {
    backgroundColor: '#3f3f46',
  },
  modalBtnCancel: { color: '#a1a1aa', fontSize: 15 },
  modalBtnOk: { color: '#fff', fontSize: 15, fontWeight: '600' },
});

const pickerStyles = StyleSheet.create({
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  colorOuterRing: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatch: {
    width: 24,
    height: 24,
    borderRadius: 5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  squareBtn: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  squareBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  squareBtnLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontWeight: '500',
  },
  toggleLabel: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '400',
  },
});
