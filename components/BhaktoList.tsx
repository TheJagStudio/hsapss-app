import React from 'react';
import { View, Text, Image, ScrollView } from 'react-native';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8000';

interface Bhakto {
  user_type?: string;
  profile_image?: string;
  first_name?: string;
  last_name?: string;
}

interface BhaktoListProps {
  bhaktoList: Bhakto[];
  categoryName: string;
  categoryValue: string;
}

const BhaktoList: React.FC<BhaktoListProps> = ({ bhaktoList, categoryName, categoryValue }) => {
  const filteredList = bhaktoList?.filter(bhakto => bhakto?.user_type === categoryValue) || [];

  if (filteredList.length === 0) {
    return null;
  }

  return (
    <View className="px-3">
      <Text className="font-haspss text-3xl text-[#38546c] mb-1">{categoryName}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12 }}
      >
        {filteredList.map((bhakto, index) => (
          <View key={index} className="w-20 pt-1">
            <Image
              source={{ uri: `${BACKEND_URL}${bhakto?.profile_image}` }}
              className="w-20 h-20 rounded-lg"
              resizeMode="cover"
            />
            <Text className="text-[#31475b] text-center text-xs mt-1" numberOfLines={2}>
              {bhakto?.first_name} {bhakto?.last_name}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

export default BhaktoList;
