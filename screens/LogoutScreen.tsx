import React from 'react';
import { View, Text } from 'react-native';

const LogoutScreen = ({ navigation }: { navigation: any }) => {
  return (
    <View className="flex-1 bg-background items-center justify-center">
      <Text className="text-2xl font-bold text-primary-700">Logout Screen</Text>
    </View>
  );
};

export default LogoutScreen;
