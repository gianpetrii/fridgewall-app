import * as React from 'react';
import { View, type ViewProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { cn } from '@/lib/utils';

interface ProgressProps extends ViewProps {
  value?: number;
  max?: number;
}

const Progress = React.forwardRef<View, ProgressProps>(
  ({ className, value = 0, max = 100, ...props }, ref) => {
    const progress = useSharedValue(0);

    React.useEffect(() => {
      const clamped = Math.min(Math.max(value, 0), max);
      progress.value = withTiming(clamped / max, {
        duration: 400,
        easing: Easing.out(Easing.cubic),
      });
    }, [value, max, progress]);

    const animatedStyle = useAnimatedStyle(() => ({
      width: `${progress.value * 100}%`,
    }));

    return (
      <View
        ref={ref}
        className={cn('h-2 w-full overflow-hidden rounded-full bg-secondary', className)}
        {...props}
      >
        <Animated.View
          className="h-full bg-primary rounded-full"
          style={animatedStyle}
        />
      </View>
    );
  },
);
Progress.displayName = 'Progress';

export { Progress };
export type { ProgressProps };
