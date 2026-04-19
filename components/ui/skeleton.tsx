import * as React from 'react';
import { type ViewProps } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { cn } from '@/lib/utils';

interface SkeletonProps extends ViewProps {
  width?: number | string;
  height?: number | string;
  rounded?: boolean;
}

const Skeleton = React.forwardRef<Animated.View, SkeletonProps>(
  ({ className, width, height, rounded = false, style, ...props }, ref) => {
    const opacity = useSharedValue(1);

    React.useEffect(() => {
      opacity.value = withRepeat(
        withTiming(0.4, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    }, [opacity]);

    const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

    return (
      <Animated.View
        ref={ref}
        className={cn('bg-muted', rounded ? 'rounded-full' : 'rounded-md', className)}
        style={[{ width, height }, animatedStyle, style]}
        {...props}
      />
    );
  },
);
Skeleton.displayName = 'Skeleton';

export { Skeleton };
export type { SkeletonProps };
