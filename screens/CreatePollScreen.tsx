import React from "react";
import { View, Text } from "react-native";
import Header from "../components/Header";

const CreatePollScreen = ({ navigation }: { navigation: any }) => {
    return (
        <View className="flex-1 bg-background">
            <Header navigation={navigation} />
            <View className="flex-1 items-center justify-center">
                <Text className="text-2xl font-bold text-primary-700">Create Poll Screen</Text>
            </View>
        </View>
    );
};

export default CreatePollScreen;
