import * as React from 'react';
import {
  Pressable,
  ActivityIndicator,
  type PressableProps,
  type ViewStyle,
} from 'react-native';
import { cn } from '@/lib/utils';
import { Text } from './text';

type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends PressableProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  default: 'bg-primary active:opacity-80',
  destructive: 'bg-destructive active:opacity-80',
  outline: 'border border-input bg-transparent active:bg-accent',
  secondary: 'bg-secondary active:opacity-80',
  ghost: 'bg-transparent active:bg-accent',
  link: 'bg-transparent',
};

const textVariantClasses: Record<ButtonVariant, string> = {
  default: 'text-primary-foreground',
  destructive: 'text-destructive-foreground',
  outline: 'text-foreground',
  secondary: 'text-secondary-foreground',
  ghost: 'text-foreground',
  link: 'text-primary underline',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 rounded-md',
  md: 'h-11 px-6 rounded-lg',
  lg: 'h-14 px-8 rounded-lg',
  icon: 'h-10 w-10 rounded-lg',
};

const textSizeClasses: Record<ButtonSize, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  icon: 'text-base',
};

const Button = React.forwardRef<React.ElementRef<typeof Pressable>, ButtonProps>(
  (
    {
      className,
      variant = 'default',
      size = 'md',
      loading = false,
      disabled,
      children,
      style,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    return (
      <Pressable
        ref={ref}
        disabled={isDisabled}
        className={cn(
          'flex-row items-center justify-center',
          variantClasses[variant],
          sizeClasses[size],
          isDisabled && 'opacity-50',
          className,
        )}
        style={style as ViewStyle}
        {...props}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={variant === 'default' || variant === 'destructive' ? '#fff' : '#18181b'}
          />
        ) : typeof children === 'string' ? (
          <Text
            className={cn(
              'font-semibold',
              textVariantClasses[variant],
              textSizeClasses[size],
            )}
          >
            {children}
          </Text>
        ) : (
          children
        )}
      </Pressable>
    );
  },
);

Button.displayName = 'Button';

export { Button };
export type { ButtonProps, ButtonVariant, ButtonSize };
