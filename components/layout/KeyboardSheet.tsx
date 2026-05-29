import * as React from 'react';
import { Modal, Pressable, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cn } from '@/lib/utils';

interface KeyboardSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  contentClassName?: string;
}

function KeyboardSheet({
  visible,
  onClose,
  children,
  contentClassName,
}: KeyboardSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end">
        <Pressable
          className="absolute inset-0 bg-black/50"
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
        />
        <KeyboardAvoidingView behavior="padding" className="bg-background">
          <View
            className={cn(
              'rounded-t-3xl bg-background px-6 pt-6',
              contentClassName,
            )}
            style={{ paddingBottom: Math.max(insets.bottom, 16) + 24 }}
          >
            {children}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export { KeyboardSheet };
export type { KeyboardSheetProps };
