import React from 'react';
import { View, Platform } from 'react-native';

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function Container({ children, className = '' }: ContainerProps) {
  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }
  return (
    <View className="flex-1 bg-zinc-50 items-center">
      <View className={`flex-1 w-full ${className}`} style={{ maxWidth: 480 }}>
        {children}
      </View>
    </View>
  );
}
