import * as React from 'react';
import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { cn } from '@/lib/utils';

type TextVariant = 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'lead' | 'large' | 'small' | 'muted';

interface TextProps extends RNTextProps {
  variant?: TextVariant;
}

const variantClasses: Record<TextVariant, string> = {
  h1: 'text-4xl font-extrabold tracking-tight text-foreground',
  h2: 'text-3xl font-semibold tracking-tight text-foreground',
  h3: 'text-2xl font-semibold tracking-tight text-foreground',
  h4: 'text-xl font-semibold tracking-tight text-foreground',
  p: 'text-base leading-7 text-foreground',
  lead: 'text-xl text-muted-foreground',
  large: 'text-lg font-semibold text-foreground',
  small: 'text-sm font-medium text-foreground',
  muted: 'text-sm text-muted-foreground',
};

const Text = React.forwardRef<RNText, TextProps>(
  ({ className, variant = 'p', ...props }, ref) => (
    <RNText
      ref={ref}
      className={cn(variantClasses[variant], className)}
      {...props}
    />
  ),
);

Text.displayName = 'Text';

export { Text };
export type { TextProps, TextVariant };
