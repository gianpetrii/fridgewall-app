import * as React from 'react';
import {
  Modal,
  View,
  Pressable,
  type ModalProps,
  type ViewProps,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { cn } from '@/lib/utils';
import { Text } from './text';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  modalProps?: Omit<ModalProps, 'visible' | 'onRequestClose' | 'transparent' | 'animationType'>;
}

interface DialogContentProps extends ViewProps {
  children: React.ReactNode;
}

interface DialogHeaderProps extends ViewProps {
  children: React.ReactNode;
}

interface DialogTitleProps extends React.ComponentPropsWithoutRef<typeof Text> {}

interface DialogDescriptionProps extends React.ComponentPropsWithoutRef<typeof Text> {}

interface DialogFooterProps extends ViewProps {
  children: React.ReactNode;
}

const DialogContext = React.createContext<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>({
  open: false,
  onOpenChange: () => null,
});

function Dialog({ open, onOpenChange, children, modalProps }: DialogProps) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.95);

  React.useEffect(() => {
    if (open) {
      opacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) });
      scale.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.back(1.05)) });
    } else {
      opacity.value = withTiming(0, { duration: 150 });
      scale.value = withTiming(0.95, { duration: 150 });
    }
  }, [open, opacity, scale]);

  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      <Modal
        visible={open}
        transparent
        animationType="none"
        onRequestClose={() => onOpenChange(false)}
        statusBarTranslucent
        {...modalProps}
      >
        <Animated.View
          className="flex-1 items-center justify-center bg-black/60 px-4"
          style={{ opacity }}
        >
          <Pressable
            className="absolute inset-0"
            onPress={() => onOpenChange(false)}
          />
          {children}
        </Animated.View>
      </Modal>
    </DialogContext.Provider>
  );
}

function DialogContent({ className, children, ...props }: DialogContentProps) {
  const { open } = React.useContext(DialogContext);
  const scale = useSharedValue(0.95);

  React.useEffect(() => {
    if (open) {
      scale.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.back(1.05)) });
    }
  }, [open, scale]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      className={cn(
        'w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-lg',
        className,
      )}
      style={animatedStyle}
      {...props}
    >
      {children}
    </Animated.View>
  );
}

function DialogHeader({ className, children, ...props }: DialogHeaderProps) {
  return (
    <View className={cn('mb-4 gap-1.5', className)} {...props}>
      {children}
    </View>
  );
}

function DialogTitle({ className, ...props }: DialogTitleProps) {
  return <Text variant="h4" className={cn('text-card-foreground', className)} {...props} />;
}

function DialogDescription({ className, ...props }: DialogDescriptionProps) {
  return <Text variant="muted" className={cn(className)} {...props} />;
}

function DialogFooter({ className, children, ...props }: DialogFooterProps) {
  return (
    <View className={cn('mt-6 flex-row justify-end gap-3', className)} {...props}>
      {children}
    </View>
  );
}

export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter };
export type { DialogProps };
