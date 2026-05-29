import * as React from 'react';
import { useFocusEffect } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface AnimatedScreenProps {
  children: React.ReactNode;
  disabled?: boolean;
}

function AnimatedScreen({ children, disabled = false }: AnimatedScreenProps) {
  const opacity = useSharedValue(disabled ? 1 : 0);
  const translateY = useSharedValue(disabled ? 0 : 14);

  useFocusEffect(
    React.useCallback(() => {
      if (disabled) return;
      opacity.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) });
      translateY.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) });
      return () => {
        opacity.value = 0;
        translateY.value = 14;
      };
    }, [disabled, opacity, translateY]),
  );

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (disabled) {
    return <>{children}</>;
  }

  return <Animated.View style={[{ flex: 1 }, animatedStyle]}>{children}</Animated.View>;
}

export { AnimatedScreen };
