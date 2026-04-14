// Web stub for react-native-maps
// All exports are no-ops to prevent native module errors on web

import React from 'react';
import { View } from 'react-native';

const Stub = () => null;

export default class MapView extends React.Component {
  render() { return React.createElement(View, null); }
  animateToRegion() {}
  fitToCoordinates() {}
}

export const Marker = Stub;
export const Circle = Stub;
export const Polyline = Stub;
export const Polygon = Stub;
export const Callout = Stub;
export const Overlay = Stub;
export const Heatmap = Stub;
export const PROVIDER_GOOGLE = 'google';
export const PROVIDER_DEFAULT = null;

export type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export type MapPressEvent = {
  nativeEvent: {
    coordinate: { latitude: number; longitude: number };
  };
};
