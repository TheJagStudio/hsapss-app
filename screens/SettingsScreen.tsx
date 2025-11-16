import React from "react";
import { View, Text } from "react-native";
import Header from "../components/Header";

const SettingsScreen = ({ navigation }: { navigation: any }) => {
    return (
        <View className="flex-1 bg-background">
            <Header navigation={navigation} />
            <View className="flex-1 items-center justify-center">
                <Text className="text-2xl font-bold text-primary-700">Settings Screen</Text>
            </View>
        </View>
    );
};

export default SettingsScreen;
