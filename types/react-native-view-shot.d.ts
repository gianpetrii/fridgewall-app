declare module 'react-native-view-shot' {
  import type { RefObject } from 'react';
  import type { View } from 'react-native';

  export function captureRef(
    view: RefObject<View>,
    options?: {
      format?: 'jpg' | 'png' | 'webm';
      quality?: number;
      width?: number;
      height?: number;
    },
  ): Promise<string>;
}
