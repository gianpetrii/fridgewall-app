import React from 'react';
import { View } from 'react-native';
import { Feather } from '@expo/vector-icons';

const SIZES = {
  sm: { box: 40, radius: 10, icon: 18 },
  md: { box: 56, radius: 14, icon: 26 },
  lg: { box: 72, radius: 18, icon: 34 },
};

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = SIZES[size];
  return (
    <View
      style={{
        width: s.box,
        height: s.box,
        borderRadius: s.radius,
        backgroundColor: '#4f46e5',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Feather name="map-pin" size={s.icon} color="#ffffff" />
    </View>
  );
}
