"use client";
import * as React from 'react';
import { View, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { captureRef } from 'react-native-view-shot';
import { X, Undo2, Check, Pencil, Type } from 'lucide-react-native';
import { ShellProviders } from '@/components/layout/ShellProviders';
import { Text } from '@/components/ui/text';
import {
  PhotoEditorCanvas,
  ColorPicker,
  FontSizePicker,
} from '@/components/photo-editor/PhotoEditorCanvas';
import type { EditorColor, EditorLayer, EditorMode } from '@/components/photo-editor/types';

export default function PhotoEditorScreen() {
  return (
    <ShellProviders>
      <PhotoEditorContent />
    </ShellProviders>
  );
}

function PhotoEditorContent() {
  const router = useRouter();
  const { uri, source } = useLocalSearchParams<{ uri: string; source?: 'camera' | 'gallery' }>();
  const insets = useSafeAreaInsets();
  const canvasRef = React.useRef<View>(null);

  const [layers, setLayers] = React.useState<EditorLayer[]>([]);
  const [history, setHistory] = React.useState<EditorLayer[][]>([[]]);
  const [mode, setMode] = React.useState<EditorMode>('draw');
  const [color, setColor] = React.useState<EditorColor>('#ffffff');
  const [fontSize, setFontSize] = React.useState(36);
  const [exporting, setExporting] = React.useState(false);

  const handleClose = () => {
    if (source) {
      router.replace({
        pathname: '/upload-modal',
        params: { source, reopenPicker: '1' },
      });
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace('/(app)');
  };

  const pushLayers = (next: EditorLayer[]) => {
    setLayers(next);
    setHistory((h) => [...h, next]);
  };

  const handleUndo = () => {
    if (history.length <= 1) return;
    const nextHistory = history.slice(0, -1);
    setHistory(nextHistory);
    setLayers(nextHistory[nextHistory.length - 1] ?? []);
  };

  const handleDone = async () => {
    if (!uri || !canvasRef.current) return;
    setExporting(true);
    try {
      const editedUri = await captureRef(canvasRef, {
        format: 'jpg',
        quality: 0.9,
        width: 1080,
        height: 1080,
      });
      router.replace({
        pathname: '/upload-modal',
        params: { uri: editedUri, fromEditor: '1', ...(source ? { source } : {}) },
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

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.toolbar}>
        <Pressable onPress={handleClose} style={styles.toolBtn}>
          <X size={22} color="#fff" />
        </Pressable>
        <Pressable
          onPress={handleUndo}
          style={styles.toolBtn}
          disabled={history.length <= 1}
        >
          <Undo2 size={22} color={history.length <= 1 ? '#52525b' : '#fff'} />
        </Pressable>
        <Pressable onPress={handleDone} style={styles.toolBtn} disabled={exporting}>
          {exporting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Check size={22} color="#fff" />
          )}
        </Pressable>
      </View>

      <PhotoEditorCanvas
        uri={uri}
        mode={mode}
        color={color}
        fontSize={fontSize}
        layers={layers}
        onLayersChange={pushLayers}
        canvasRef={canvasRef}
      />

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <ColorPicker color={color} onColorChange={setColor} />
        {mode === 'text' && <FontSizePicker fontSize={fontSize} onFontSizeChange={setFontSize} />}

        <View style={styles.modeRow}>
          <Pressable
            style={[styles.modeBtn, mode === 'draw' && styles.modeBtnActive]}
            onPress={() => setMode('draw')}
          >
            <Pencil size={20} color="#fff" />
            <Text style={styles.modeLabel}>Dibujar</Text>
          </Pressable>
          <Pressable
            style={[styles.modeBtn, mode === 'text' && styles.modeBtnActive]}
            onPress={() => setMode('text')}
          >
            <Type size={20} color="#fff" />
            <Text style={styles.modeLabel}>Texto</Text>
          </Pressable>
        </View>
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
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  toolBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: {
    backgroundColor: 'rgba(0,0,0,0.9)',
    paddingTop: 8,
  },
  modeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 8,
  },
  modeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  modeBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  modeLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
