import * as React from 'react';
import {
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  type KeyboardAvoidingViewProps,
  type ScrollViewProps,
} from 'react-native';
import { cn } from '@/lib/utils';

interface KeyboardViewProps extends KeyboardAvoidingViewProps {
  scrollable?: boolean;
  scrollProps?: ScrollViewProps;
}

function KeyboardView({
  className,
  children,
  scrollable = true,
  scrollProps,
  ...props
}: KeyboardViewProps) {
  return (
    <KeyboardAvoidingView
      className={cn('flex-1', className)}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      {...props}
    >
      {scrollable ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="flex-grow"
          {...scrollProps}
        >
          {children}
        </ScrollView>
      ) : (
        children
      )}
    </KeyboardAvoidingView>
  );
}

export { KeyboardView };
export type { KeyboardViewProps };
