import * as React from 'react';
import { View, type ViewProps } from 'react-native';
import { cn } from '@/lib/utils';
import { Text } from './text';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

interface BadgeProps extends ViewProps {
  variant?: BadgeVariant;
  label: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-primary border-transparent',
  secondary: 'bg-secondary border-transparent',
  destructive: 'bg-destructive border-transparent',
  outline: 'bg-transparent border-border',
};

const textVariantClasses: Record<BadgeVariant, string> = {
  default: 'text-primary-foreground',
  secondary: 'text-secondary-foreground',
  destructive: 'text-destructive-foreground',
  outline: 'text-foreground',
};

const Badge = React.forwardRef<View, BadgeProps>(
  ({ className, variant = 'default', label, ...props }, ref) => (
    <View
      ref={ref}
      className={cn(
        'inline-flex flex-row items-center rounded-full border px-2.5 py-0.5',
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      <Text className={cn('text-xs font-semibold', textVariantClasses[variant])}>
        {label}
      </Text>
    </View>
  ),
);
Badge.displayName = 'Badge';

export { Badge };
export type { BadgeProps, BadgeVariant };
