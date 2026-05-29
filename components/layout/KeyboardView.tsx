import * as React from 'react';
import { View, type ScrollViewProps } from 'react-native';
import {
  KeyboardAwareScrollView,
  KeyboardAvoidingView,
} from 'react-native-keyboard-controller';
import { cn } from '@/lib/utils';
import { AnimatedScreen } from './AnimatedScreen';

interface KeyboardViewProps {
  className?: string;
  children: React.ReactNode;
  scrollable?: boolean;
  scrollProps?: ScrollViewProps;
  bottomOffset?: number;
  animated?: boolean;
}

function KeyboardView({
  className,
  children,
  scrollable = true,
  scrollProps,
  bottomOffset = 16,
  animated = true,
}: KeyboardViewProps) {
  const motion = (node: React.ReactNode) => (
    <AnimatedScreen disabled={!animated}>{node}</AnimatedScreen>
  );

  if (scrollable) {
    return motion(
        <KeyboardAwareScrollView
          className={cn('flex-1 bg-background', className)}
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="flex-grow"
          bottomOffset={bottomOffset}
          {...scrollProps}
        >
          {children}
        </KeyboardAwareScrollView>,
    );
  }

  return motion(
    <KeyboardAvoidingView
      className={cn('flex-1 bg-background', className)}
      behavior="padding"
    >
      {children}
    </KeyboardAvoidingView>,
  );
}

export { KeyboardView };
export type { KeyboardViewProps };
