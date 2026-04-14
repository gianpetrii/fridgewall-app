import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  loading?: boolean;
  disabled?: boolean;
}

export function Button({ label, onPress, variant = 'primary', loading, disabled }: ButtonProps) {
  const isPrimary = variant === 'primary';
  return (
    <TouchableOpacity
      className={`rounded-xl py-3.5 items-center border ${
        isPrimary
          ? 'bg-indigo-600 border-indigo-600'
          : 'bg-white border-zinc-300'
      } ${disabled || loading ? 'opacity-50' : ''}`}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading
        ? <ActivityIndicator color={isPrimary ? '#ffffff' : '#4f46e5'} size="small" />
        : <Text className={`font-semibold text-base ${isPrimary ? 'text-white' : 'text-zinc-700'}`}>
            {label}
          </Text>
      }
    </TouchableOpacity>
  );
}
