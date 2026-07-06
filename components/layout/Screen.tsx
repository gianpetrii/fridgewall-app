import * as React from 'react';
import {
  View,
  type ScrollViewProps,
  type ViewProps,
  RefreshControl,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { cn } from '@/lib/utils';
import { AnimatedScreen } from './AnimatedScreen';

interface ScreenProps extends ScrollViewProps {
  scrollable?: boolean;
  padded?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  safeArea?: boolean;
  safeAreaEdges?: Edge[];
  animated?: boolean;
  containerProps?: ViewProps;
}

function Screen({
  className,
  children,
  scrollable = true,
  padded = true,
  refreshing,
  onRefresh,
  safeArea = true,
  safeAreaEdges,
  animated = true,
  containerProps,
  ...props
}: ScreenProps) {
  const content = !scrollable ? (
    <View
      {...containerProps}
      className={cn(
        'flex-1',
        padded && 'px-4',
        containerProps?.className,
        className,
      )}
    >
      {children}
    </View>
  ) : (
    <KeyboardAwareScrollView
      className="flex-1 bg-background"
      contentContainerClassName={cn(padded && 'px-4 py-4', className)}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      bottomOffset={16}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing ?? false} onRefresh={onRefresh} />
        ) : undefined
      }
      {...props}
    >
      {children}
    </KeyboardAwareScrollView>
  );

  if (!safeArea) {
    return (
      <View className="flex-1 bg-background">
        <AnimatedScreen disabled={!animated}>{content}</AnimatedScreen>
      </View>
    );
  }

  return (
    <SafeAreaView
      className="flex-1 bg-background"
      edges={safeAreaEdges ?? ['top', 'left', 'right']}
    >
      <AnimatedScreen disabled={!animated}>{content}</AnimatedScreen>
    </SafeAreaView>
  );
}

export { Screen };
export type { ScreenProps };
