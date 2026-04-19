import * as React from 'react';
import { View, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { cn } from '@/lib/utils';
import { Text } from './text';

type ToastVariant = 'default' | 'success' | 'error' | 'warning';

interface ToastData {
  id: string;
  message: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastContextValue {
  toast: (data: Omit<ToastData, 'id'>) => void;
  dismiss: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue>({
  toast: () => null,
  dismiss: () => null,
});

const variantClasses: Record<ToastVariant, string> = {
  default: 'bg-foreground border-transparent',
  success: 'bg-green-600 border-transparent',
  error: 'bg-destructive border-transparent',
  warning: 'bg-yellow-500 border-transparent',
};

function ToastItem({
  data,
  onDismiss,
}: {
  data: ToastData;
  onDismiss: (id: string) => void;
}) {
  const translateY = useSharedValue(-80);
  const opacity = useSharedValue(0);

  const dismiss = React.useCallback(() => {
    translateY.value = withTiming(-80, { duration: 250 });
    opacity.value = withTiming(0, { duration: 250 }, (finished) => {
      if (finished) runOnJS(onDismiss)(data.id);
    });
  }, [translateY, opacity, onDismiss, data.id]);

  React.useEffect(() => {
    translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
    opacity.value = withTiming(1, { duration: 200 });

    const timeout = setTimeout(dismiss, data.duration ?? 4000);
    return () => clearTimeout(timeout);
  }, [dismiss, data.duration, translateY, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      className={cn(
        'flex-row items-start rounded-xl border px-4 py-3 shadow-lg mb-2',
        variantClasses[data.variant ?? 'default'],
      )}
      style={animatedStyle}
    >
      <View className="flex-1 gap-0.5">
        <Text className="text-sm font-semibold text-white">{data.message}</Text>
        {data.description && (
          <Text className="text-xs text-white/80">{data.description}</Text>
        )}
      </View>
      <Pressable onPress={dismiss} className="ml-3 mt-0.5">
        <X size={16} color="white" />
      </Pressable>
    </Animated.View>
  );
}

function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastData[]>([]);
  const insets = useSafeAreaInsets();

  const toast = React.useCallback((data: Omit<ToastData, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...data, id }]);
  }, []);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <View
        className="absolute left-4 right-4 z-50"
        style={{ top: insets.top + 8 }}
        pointerEvents="box-none"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} data={t} onDismiss={dismiss} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

function useToast() {
  return React.useContext(ToastContext);
}

export { ToastProvider, useToast };
export type { ToastData, ToastVariant };
