import React from 'react';
import { View, ActivityIndicator, Image, StyleSheet } from 'react-native';

const Loading = () => {
  return (
    <View style={StyleSheet.absoluteFill} className="items-center justify-center bg-white backdrop-blur-lg z-[99]">
      <View className="items-center">
        <Image
          source={require('../assets/icon.png')}
          style={{ width: 192, height: 192 }}
          resizeMode="contain"
          className='rounded-3xl drop-shadow-2xl'
        />
        <ActivityIndicator size="large" color="#446785" style={{ marginTop: 16 }} />
      </View>
    </View>
  );
};

export default Loading;
