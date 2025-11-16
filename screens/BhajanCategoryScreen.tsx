import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, ImageBackground } from "react-native";
import { useAtom } from "jotai";
import { bhajanCategoryAtom, audioBaseAtom, lyricsBaseAtom, activeCategoryAtom, currentBhajanAtom } from "../state/atoms";
import { API_BASE_URL } from "../utils/api";
import Header from "../components/Header";
import { SafeAreaView } from "react-native-safe-area-context";

const BhajanCategoryScreen = ({ navigation }: { navigation: any }) => {
    const [categories, setCategories] = useAtom(bhajanCategoryAtom);
    const [audioBase, setAudioBase] = useAtom(audioBaseAtom);
    const [lyricsBase, setLyricsBase] = useAtom(lyricsBaseAtom);
    const [activeCategory, setActiveCategory] = useAtom(activeCategoryAtom);
    const [currentBhajan, setCurrentBhajan] = useAtom(currentBhajanAtom);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/bhajan-category-list/`);
            const data = await response.json();
            setCategories(data?.categories || []);
            setAudioBase(data?.audioBase || "");
            setLyricsBase(data?.lyricsBase || "");
            setLoading(false);
        } catch (error) {
            console.error("Error fetching bhajan categories:", error);
            setLoading(false);
        }
    };

    const handleCategoryPress = (category) => {
        setActiveCategory(category.name);
        navigation.navigate("BhajanHome", { catLink: category.link });
    };

    return (
        <SafeAreaView className="h-screen bg-white">
            <View className="flex-1 bg-background">
                <ImageBackground source={require("../assets/images/backgroundLight.png")} style={{ width: "100%", height: "100%", justifyContent: "center", alignItems: "center" }} resizeMode="repeat">
                    {/* Fixed Header */}
                    <View className="px-5 py-3 w-full bg-white border-b border-primary-600">
                        <Text className="text-4xl text-primary-700 font-bold">Bhakti Sudha</Text>
                    </View>

                    {/* Categories Grid */}
                    <ScrollView className="flex-1 px-5 py-3">
                        <View className="flex-row flex-wrap">
                            {loading ? (
                                <View className="w-full py-10 items-center justify-center">
                                    <Text className="text-primary-600">Loading categories...</Text>
                                </View>
                            ) : (
                                categories.map((category, index) => (
                                    <View key={index} className="w-1/2 p-2">
                                        <TouchableOpacity onPress={() => handleCategoryPress(category)} className="bg-white rounded-lg border border-primary-300 p-4 items-center justify-center" style={{ minHeight: 120, shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 }}>
                                            <Image source={{ uri: category.icon }} style={{ width: 48, height: 48 }} className="mb-2" />
                                            <Text className="text-center text-primary-600 font-medium">{category.name}</Text>
                                        </TouchableOpacity>
                                    </View>
                                ))
                            )}
                        </View>
                    </ScrollView>
                </ImageBackground>
            </View>
        </SafeAreaView>
    );
};

export default BhajanCategoryScreen;
