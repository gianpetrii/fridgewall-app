import * as React from 'react';
import { View, Image, type ViewProps } from 'react-native';
import { cn } from '@/lib/utils';
import { Text } from './text';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps extends ViewProps {
  src?: string | null;
  alt?: string;
  fallback?: string;
  size?: AvatarSize;
}

const sizeClasses: Record<AvatarSize, string> = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-14 w-14',
  xl: 'h-20 w-20',
};

const textSizeClasses: Record<AvatarSize, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-lg',
  xl: 'text-2xl',
};

function getInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

const Avatar = React.forwardRef<View, AvatarProps>(
  ({ className, src, alt, fallback, size = 'md', ...props }, ref) => {
    const [imageError, setImageError] = React.useState(false);
    const showFallback = !src || imageError;

    return (
      <View
        ref={ref}
        className={cn(
          'rounded-full overflow-hidden bg-muted items-center justify-center',
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        {!showFallback ? (
          <Image
            source={{ uri: src }}
            className="w-full h-full"
            accessibilityLabel={alt}
            onError={() => setImageError(true)}
          />
        ) : (
          <Text
            className={cn('font-semibold text-muted-foreground', textSizeClasses[size])}
          >
            {fallback ? getInitials(fallback) : '?'}
          </Text>
        )}
      </View>
    );
  },
);
Avatar.displayName = 'Avatar';

export { Avatar };
export type { AvatarProps, AvatarSize };
