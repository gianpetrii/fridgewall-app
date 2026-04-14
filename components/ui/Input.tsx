import React from 'react';
import { View, Text, TextInput, TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
}

export function Input({ label, error, ...props }: InputProps) {
  return (
    <View className="gap-1.5">
      <Text className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">{label}</Text>
      <TextInput
        className={`bg-white border rounded-xl px-4 text-base text-zinc-900 ${
          error ? 'border-red-400' : 'border-zinc-300'
        }`}
        style={{ paddingVertical: 14, lineHeight: 20, includeFontPadding: false } as any}
        placeholderTextColor="#a1a1aa"
        {...props}
      />
      {error ? <Text className="text-xs text-red-500">{error}</Text> : null}
    </View>
  );
}
