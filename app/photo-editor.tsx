"use client";
import * as React from 'react';
import { View, Pressable, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { captureRef } from 'react-native-view-shot';
import { ArrowLeft, ArrowRight, Pencil, Type, Undo2 } from 'lucide-react-native';
import { ShellProviders } from '@/components/layout/ShellProviders';
import { Text } from '@/components/ui/text';
import {
  PhotoEditorCanvas,
  ColorPicker,
  BrushSizePicker,
  FontFamilyPicker,
  StyleToggles,
} from '@/components/photo-editor/PhotoEditorCanvas';
import type { BrushSize, EditorLayer, EditorMode, FontFamily, TextLayer } from '@/components/photo-editor/types';
import { BRUSH_SIZES, EDITOR_COLORS } from '@/components/photo-editor/types';

export default function PhotoEditorScreen() {
  return (
    <ShellProviders>
      <PhotoEditorContent />
    </ShellProviders>
  );
}

function PhotoEditorContent() {
  const router = useRouter();
  const { uri, source, fromWidget } = useLocalSearchParams<{
    uri: string;
    source?: 'camera' | 'gallery';
    fromWidget?: string;
  }>();
  const insets = useSafeAreaInsets();
  const canvasRef = React.useRef<View>(null);

  // Layers + history
  const [layers, setLayers] = React.useState<EditorLayer[]>([]);
  const [history, setHistory] = React.useState<EditorLayer[][]>([[]]);

  // Mode
  const [mode, setMode] = React.useState<EditorMode>('none');

  // Draw tools
  const [brushSize, setBrushSize] = React.useState<BrushSize>(BRUSH_SIZES[1].size);

  // Active color (shared between draw and text)
  const [color, setColor] = React.useState(EDITOR_COLORS[0]);

  // Text style defaults (also synced to selected text)
  const [fontSize] = React.useState(32);
  const [fontFamily, setFontFamily] = React.useState<FontFamily>('default');
  const [bold, setBold] = React.useState(false);
  const [italic, setItalic] = React.useState(false);
  const [underline, setUnderline] = React.useState(false);
  const [highlight, setHighlight] = React.useState(false);

  // Text selection
  const [selectedTextId, setSelectedTextId] = React.useState<string | null>(null);

  const [exporting, setExporting] = React.useState(false);

  const widgetParam = fromWidget === '1' ? { fromWidget: '1' } : {};

  // ─── Sync text style state when a text is selected ───────────────────────

  React.useEffect(() => {
    if (!selectedTextId) return;
    const text = layers.find(
      (l): l is TextLayer => l.type === 'text' && l.id === selectedTextId,
    );
    if (!text) return;
    setColor(text.color);
    setFontFamily(text.fontFamily);
    setBold(text.bold);
    setItalic(text.italic);
    setUnderline(text.underline);
    setHighlight(text.highlight);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTextId]);

  // ─── Apply style changes to selected text in real time ────────────────────

  const updateSelected = React.useCallback(
    (updates: Partial<TextLayer>) => {
      if (!selectedTextId) return;
      setLayers((prev) =>
        prev.map((l) =>
          l.type === 'text' && l.id === selectedTextId ? { ...l, ...updates } : l,
        ),
      );
    },
    [selectedTextId],
  );

  const handleColorChange = (c: string) => {
    setColor(c);
    updateSelected({ color: c });
  };

  const handleFontFamilyChange = (ff: FontFamily) => {
    setFontFamily(ff);
    updateSelected({ fontFamily: ff });
  };

  const handleStyleToggle = (key: 'bold' | 'italic' | 'underline' | 'highlight') => {
    const next = { bold, italic, underline, highlight, [key]: !{ bold, italic, underline, highlight }[key] };
    setBold(next.bold);
    setItalic(next.italic);
    setUnderline(next.underline);
    setHighlight(next.highlight);
    updateSelected({ [key]: next[key] });
  };

  // ─── Layer management ─────────────────────────────────────────────────────

  const pushLayers = (next: EditorLayer[]) => {
    setLayers(next);
    setHistory((h) => [...h, next]);
  };

  const handleUndo = () => {
    if (history.length <= 1) return;
    const nextHistory = history.slice(0, -1);
    setHistory(nextHistory);
    const prev = nextHistory[nextHistory.length - 1] ?? [];
    setLayers(prev);
    if (selectedTextId && !prev.find((l) => l.type === 'text' && (l as TextLayer).id === selectedTextId)) {
      setSelectedTextId(null);
    }
  };

  // ─── Navigation ───────────────────────────────────────────────────────────

  const navigateBack = React.useCallback(() => {
    router.replace({ pathname: '/upload-modal', params: { ...widgetParam } });
  }, [router, widgetParam]);

  const handleBack = () => {
    if (layers.length === 0) {
      navigateBack();
      return;
    }
    Alert.alert(
      '¿Descartar cambios?',
      'Se perderán los trazos y texto que agregaste.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Descartar', style: 'destructive', onPress: navigateBack },
      ],
    );
  };

  const handleConfirm = async () => {
    if (!uri || !canvasRef.current) return;
    if (layers.length === 0) {
      // No edits → skip, pass original URI
      router.replace({
        pathname: '/upload-modal',
        params: { uri, fromEditor: '1', ...(source ? { source } : {}), ...widgetParam },
      });
      return;
    }
    setExporting(true);
    try {
      const editedUri = await captureRef(canvasRef, {
        format: 'jpg',
        quality: 0.7,
        width: 1080,
        height: 1080,
      });
      router.replace({
        pathname: '/upload-modal',
        params: { uri: editedUri, fromEditor: '1', ...(source ? { source } : {}), ...widgetParam },
      });
    } catch {
      Alert.alert('Error', 'No se pudo guardar la imagen editada.');
    } finally {
      setExporting(false);
    }
  };

  if (!uri) {
    return (
      <View style={styles.centered}>
        <Text>Imagen no encontrada</Text>
      </View>
    );
  }

  const hasSelected = selectedTextId !== null;
  const undoDisabled = history.length <= 1;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ── Top bar ──────────────────────────────────────────── */}
      <View style={styles.topBar}>
        <Pressable onPress={handleBack} style={styles.toolBtn} hitSlop={8}>
          <ArrowLeft size={22} color="#fff" />
        </Pressable>

        <Pressable
          onPress={() => {
            setMode((prev) => (prev === 'draw' ? 'none' : 'draw'));
            setSelectedTextId(null);
          }}
          style={[styles.toolBtn, mode === 'draw' && styles.toolBtnActive]}
          hitSlop={8}
        >
          <Pencil size={22} color="#fff" />
        </Pressable>

        <Pressable
          onPress={() => setMode((prev) => (prev === 'text' ? 'none' : 'text'))}
          style={[styles.toolBtn, mode === 'text' && styles.toolBtnActive]}
          hitSlop={8}
        >
          <Type size={22} color="#fff" />
        </Pressable>

        <Pressable
          onPress={handleUndo}
          style={[styles.toolBtn, undoDisabled && styles.toolBtnDisabled]}
          disabled={undoDisabled}
          hitSlop={8}
        >
          <Undo2 size={22} color={undoDisabled ? '#52525b' : '#fff'} />
        </Pressable>

        <Pressable onPress={handleConfirm} style={styles.toolBtn} disabled={exporting} hitSlop={8}>
          {exporting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <ArrowRight size={22} color="#fff" />
          )}
        </Pressable>
      </View>

      {/* ── Canvas ───────────────────────────────────────────── */}
      <PhotoEditorCanvas
        uri={uri}
        mode={mode}
        color={color}
        fontSize={fontSize}
        brushSize={brushSize}
        fontFamily={fontFamily}
        bold={bold}
        italic={italic}
        underline={underline}
        highlight={highlight}
        layers={layers}
        onLayersChange={pushLayers}
        canvasRef={canvasRef}
        selectedTextId={selectedTextId}
        onSelectText={setSelectedTextId}
      />

      {/* ── Bottom panel ─────────────────────────────────────── */}
      <View style={[styles.bottomPanel, { paddingBottom: insets.bottom + 8 }]}>
        {/* Draw mode */}
        {mode === 'draw' && (
          <>
            <Text style={styles.hint}>Deslizá el dedo sobre la imagen para dibujar</Text>
            <ColorPicker color={color} onColorChange={handleColorChange} />
            <Text style={styles.hint}>Elegí el color del trazo</Text>
            <BrushSizePicker brushSize={brushSize} onBrushSizeChange={setBrushSize} />
            <Text style={styles.hint}>Grosor del pincel</Text>
          </>
        )}

        {/* Text mode */}
        {mode === 'text' && (
          <>
            {hasSelected ? (
              <Text style={styles.hint}>Arrastrá con un dedo · Pellizcá con dos para mover y rotar</Text>
            ) : (
              <Text style={styles.hint}>Toca la imagen para agregar texto</Text>
            )}
            <ColorPicker color={color} onColorChange={handleColorChange} />
            <Text style={styles.hint}>Elegí el color del texto</Text>
            <FontFamilyPicker fontFamily={fontFamily} onFontFamilyChange={handleFontFamilyChange} />
            <StyleToggles
              bold={bold}
              italic={italic}
              underline={underline}
              highlight={highlight}
              onToggle={handleStyleToggle}
            />
            <Text style={styles.hint}>Estilo · Doble tap en el texto para editar su contenido</Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 6,
    minHeight: 52,
  },
  toolBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  toolBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.32)',
  },
  toolBtnDisabled: {
    opacity: 0.35,
  },
  bottomPanel: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    paddingTop: 12,
    paddingHorizontal: 12,
    gap: 8,
    justifyContent: 'flex-start',
  },
  hint: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    textAlign: 'center',
    marginTop: -5,
  },
});
