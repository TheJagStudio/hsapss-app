import React from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { PlayCircle, PlayIcon } from "lucide-react-native";

const MeditationSection = () => {
    const navigation = useNavigation();

    const meditationFunctions = [
        {
            id: 1,
            title: "Dhun with Swamiji",
            description: "Experience divine dhun with Swamiji",
            image: require("../assets/images/activity/dhun.png"),
            path: "MeditationDhunScreen",
            bgColor: "bg-yellow-200/50",
        },
        {
            id: 2,
            title: "Chesta with Swamiji",
            description: "Sacred chesta experience",
            image: require("../assets/images/activity/chesta.png"),
            path: "MeditationChestaScreen",
            bgColor: "bg-pink-200/50",
        },
        {
            id: 3,
            title: "5 Swami ni Vato",
            description: "Five sacred teachings",
            image: require("../assets/images/activity/swaminivato.png"),
            path: "MeditationSwamiVatoScreen",
            bgColor: "bg-teal-200/50",
        },
        {
            id: 4,
            title: "5 Slok from Shikshapatri",
            description: "Five verses from Shikshapatri",
            image: require("../assets/images/activity/shikshapatri.png"),
            path: "MeditationShikshapatriScreen",
            bgColor: "bg-orange-200/50",
        },
    ];

    return (
        <View className="p-4">
            <View className="flex-row justify-between items-center mb-2">
                <Text className="font-haspss text-3xl text-[#38546c]">Daily Todos</Text>
            </View>

            <View className="flex flex-row flex-wrap justify-between">
                {meditationFunctions.map((item) => (
                    <TouchableOpacity key={item.id} onPress={() => navigation.navigate(item.path as never)} className={`${item.bgColor} rounded-2xl shadow-lg overflow-hidden h-fit min-w-[49%] max-w-[49%] mb-2`} activeOpacity={0.7}>
                        <Image source={item.image} className="w-full h-32" resizeMode="cover" />
                        <View className="px-3 py-2">
                            <Text className="text-base font-bold text-gray-800 mb-1" numberOfLines={2}>
                                {item.title}
                            </Text>
                            <View className="flex-row justify-between items-center pr-1">
                                <Text className="text-xs text-gray-600 mb-2 w-[80%]" numberOfLines={2}>
                                    {item.description}
                                </Text>
                                <View className="w-8 h-8 p-2 aspect-square rounded-full bg-[#446785]">
                                    <Text className="text-lg text-white">
                                        <PlayIcon size={18} fill={"white"} color="white" />
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};

export default MeditationSection;
