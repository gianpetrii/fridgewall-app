import * as React from 'react';
import {
  View,
  TextInput,
  type TextInputProps,
  type NativeSyntheticEvent,
  type TextInputFocusEventData,
} from 'react-native';
import { cn } from '@/lib/utils';
import { Text } from './text';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = React.forwardRef<TextInput, InputProps>(
  (
    {
      className,
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      onFocus,
      onBlur,
      editable = true,
      ...props
    },
    ref,
  ) => {
    const [isFocused, setIsFocused] = React.useState(false);

    const handleFocus = (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
      setIsFocused(true);
      onFocus?.(e);
    };

    const handleBlur = (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
      setIsFocused(false);
      onBlur?.(e);
    };

    return (
      <View className="w-full gap-1.5">
        {label && (
          <Text variant="small" className="font-medium text-foreground">
            {label}
          </Text>
        )}
        <View
          className={cn(
            'flex-row items-center h-11 rounded-lg border bg-transparent px-3',
            isFocused ? 'border-ring' : 'border-input',
            error && 'border-destructive',
            !editable && 'opacity-50',
          )}
        >
          {leftIcon && <View className="mr-2">{leftIcon}</View>}
          <TextInput
            ref={ref}
            className={cn(
              'flex-1 text-base text-foreground placeholder:text-muted-foreground',
              className,
            )}
            placeholderTextColor="#71717a"
            editable={editable}
            onFocus={handleFocus}
            onBlur={handleBlur}
            {...props}
          />
          {rightIcon && <View className="ml-2">{rightIcon}</View>}
        </View>
        {error && (
          <Text variant="small" className="text-destructive">
            {error}
          </Text>
        )}
        {hint && !error && (
          <Text variant="muted">{hint}</Text>
        )}
      </View>
    );
  },
);

Input.displayName = 'Input';

export { Input };
export type { InputProps };
