import * as React from 'react';
import {
  ScrollView,
  View,
  type ScrollViewProps,
  type ViewProps,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cn } from '@/lib/utils';

interface ScreenProps extends ScrollViewProps {
  scrollable?: boolean;
  padded?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  safeArea?: boolean;
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
  containerProps,
  ...props
}: ScreenProps) {
  const Wrapper = safeArea ? SafeAreaView : View;

  if (!scrollable) {
    return (
      <Wrapper className="flex-1 bg-background">
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
      </Wrapper>
    );
  }

  return (
    <Wrapper className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerClassName={cn(padded && 'px-4 py-4', className)}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={refreshing ?? false} onRefresh={onRefresh} />
          ) : undefined
        }
        {...props}
      >
        {children}
      </ScrollView>
    </Wrapper>
  );
}

export { Screen };
export type { ScreenProps };
