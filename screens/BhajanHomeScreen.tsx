import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput } from "react-native";
import { useAtom } from "jotai";
import { bhajansAtom, currentBhajanAtom, activeCategoryAtom, audioBaseAtom, lyricsBaseAtom } from "../state/atoms";
import { API_BASE_URL } from "../utils/api";
import { PlayCircle, ChevronLeft, SearchIcon } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ImageBackground } from "react-native";

const BhajanHomeScreen = ({ navigation, route }) => {
    const { catLink } = route.params || {};
    const [bhajans, setBhajans] = useAtom(bhajansAtom);
    const [currentBhajan, setCurrentBhajan] = useAtom(currentBhajanAtom);
    const [activeCategory, setActiveCategory] = useAtom(activeCategoryAtom);
    const [audioBase, setAudioBase] = useAtom(audioBaseAtom);
    const [lyricsBase, setLyricsBase] = useAtom(lyricsBaseAtom);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (catLink) {
            fetchBhajans();
        }
    }, [catLink]);

    const fetchBhajans = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/bhajan-list/${catLink}`);
            const data = await response.json();
            setBhajans(data?.bhajans || []);
            setAudioBase(data?.audioBase || "");
            setLyricsBase(data?.lyricsBase || "");
            setActiveCategory(data?.category || "");
            setLoading(false);
        } catch (error) {
            console.error("Error fetching bhajans:", error);
            setLoading(false);
        }
    };

    const filteredBhajans = bhajans.filter((bhajan) => {
        if (!search) return true;
        return bhajan.title.toLowerCase().includes(search.toLowerCase());
    });

    const handleBhajanPress = (bhajan) => {
        setCurrentBhajan(bhajan);
        navigation.navigate("BhajanDetail", {
            id: bhajan.id,
            catLink: catLink,
        });
    };

    const handlePlayPress = (bhajan) => {
        setCurrentBhajan(bhajan);
    };

    return (
        <SafeAreaView className="h-screen bg-white">
            <View className="flex-1 bg-background">
                <ImageBackground source={require("../assets/images/backgroundLight.png")} style={{ width: "100%", height: "100%", justifyContent: "center", alignItems: "center" }} resizeMode="repeat">
                    {/* Fixed Header */}
                    <View className="px-5 py-3 w-full bg-white border-b border-primary-600">
                        <View className="flex-row items-center mb-3">
                            <TouchableOpacity onPress={() => navigation.goBack()} className="mr-2">
                                <ChevronLeft size={24} color="#446785" />
                            </TouchableOpacity>
                            <Text className="text-3xl text-primary-700 font-bold flex-1">{activeCategory}</Text>
                        </View>

                        {/* Search Bar */}
                        <View className="relative">
                            <TextInput value={search} onChangeText={setSearch} placeholder={`Search ${activeCategory}`} placeholderTextColor="#999" className="w-full h-10 bg-white border-2 border-primary-600 rounded-full px-10 text-primary-600" />
                            <View className="absolute left-3 top-2.5">
                                <Text className="text-gray-500">
                                    <SearchIcon size={20} color="#6b7280" />
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Bhajan List */}
                    <ScrollView className="flex-1 w-full px-5 py-3">
                        {loading ? (
                            <View className="py-10 items-center justify-center">
                                <Text className="text-primary-600">Loading bhajans...</Text>
                            </View>
                        ) : filteredBhajans.length === 0 ? (
                            <View className="py-10 items-center justify-center">
                                <Text className="text-primary-600">No bhajans found</Text>
                            </View>
                        ) : (
                            filteredBhajans.map((bhajan, index) => (
                                <TouchableOpacity key={index} onPress={() => handleBhajanPress(bhajan)} className="bg-white rounded-lg p-3 mb-3 flex-row items-center justify-between" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 }}>
                                    <View className="flex-1">
                                        <Text className="text-lg text-primary-600 font-medium">{bhajan.title}</Text>
                                        <Text className="text-sm text-primary-500">{bhajan.title_guj}</Text>
                                    </View>
                                    <View className="flex-row items-center gap-2">
                                        {bhajan.isAudio && (
                                            <TouchableOpacity onPress={() => handlePlayPress(bhajan)}>
                                                <PlayCircle size={24} color="#446785" />
                                            </TouchableOpacity>
                                        )}
                                        {bhajan.isEng && <Text className="text-primary-500 text-sm">E</Text>}
                                        <View className="bg-primary-500 rounded-md px-3 py-1">
                                            <Text className="text-white text-sm">view</Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))
                        )}
                    </ScrollView>
                </ImageBackground>
            </View>
        </SafeAreaView>
    );
};

export default BhajanHomeScreen;
