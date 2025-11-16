import React from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';

interface NotificationMessage {
  title?: string;
  content?: string;
  sender?: string;
}

export const Toast = ({ message, onClose }: { message: NotificationMessage | string | any; onClose: () => void }) => {
  const opacity = React.useRef(new Animated.Value(0)).current;
  const slideY = React.useRef(new Animated.Value(50)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideY, {
          toValue: 50,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => onClose());
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  if (!message) return null;

  const isObject = typeof message === 'object';

  return (
    <Animated.View
      style={{
        opacity,
        transform: [{ translateY: slideY }],
        width: 256,
      }}
      className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg border border-[#446785] p-4 z-50"
    >
      <View className="flex-row items-start gap-2">
        <View className="flex-1">
          {isObject ? (
            <>
              <Text className="text-[#38546c] font-semibold text-base mb-1">
                {message?.title}
              </Text>
              <Text className="text-gray-600 text-sm">
                {message?.content}
              </Text>
              {message?.sender && (
                <Text className="text-gray-600 text-sm text-right mt-1">
                  - {message?.sender}
                </Text>
              )}
            </>
          ) : (
            <Text className="text-[#38546c] text-base">{message}</Text>
          )}
        </View>
        <TouchableOpacity
          onPress={onClose}
          className="w-8 h-8 items-center justify-center"
        >
          <Text className="text-[#446785] text-xl">✕</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

export default Toast;
