import React, { useEffect, useState } from "react";
import { View, ScrollView, RefreshControl } from "react-native";
import { useAtom } from "jotai";
import { useNavigation } from "@react-navigation/native";
import { userAtom } from "../state/atoms";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Gallery from "../components/Gallery";
import MeditationSection from "../components/MeditationSection";
import BhaktoList from "../components/BhaktoList";
import PollForm from "../components/PollForm";
import Header from "../components/Header";
import { SafeAreaView } from "react-native-safe-area-context";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Bhakto {
    id: number;
    first_name: string;
    last_name: string;
    profile_image: string;
    user_type: string;
}

interface User {
    id: number;
    user_type: string;
}

const HomeScreen = () => {
    const navigation = useNavigation();
    const [bhaktoList, setBhaktoList] = useState<Bhakto[]>([]);
    const [user] = useAtom(userAtom) as [User, any];
    const [refreshing, setRefreshing] = useState(false);

    const fetchBhaktoList = async () => {
        try {
            const tokens = JSON.parse((await AsyncStorage.getItem("hsapss_tokens")) || "{}");
            const response = await fetch(`${BACKEND_URL}/api/bhakto-list/`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${tokens?.access_token}`,
                },
            });
            const data = await response.json();
            setBhaktoList(data?.bhaktos || []);
        } catch (error) {
            console.error("Error fetching bhakto list:", error);
        }
    };

    useEffect(() => {
        fetchBhaktoList();
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchBhaktoList();
        setRefreshing(false);
    };

    return (
        <SafeAreaView className="bg-white">
            <View className="h-screen bg-background">
                <Header navigation={navigation} />
                <ScrollView className="flex-1" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
                    {/* Gallery Section - Smruti */}
                    <Gallery />

                    {/* Meditation Section - Breathing/Meditation App Experience */}
                    <MeditationSection />

                    {/* User-specific sections */}
                    {user?.user_type === "regionadmin" && <BhaktoList bhaktoList={bhaktoList} categoryName="Karyakarta" categoryValue="karyakarta" />}
                    {user?.user_type === "karyakarta" && <BhaktoList bhaktoList={bhaktoList} categoryName="Bhakto" categoryValue="user" />}

                    {/* Polls Section */}
                    <PollForm />

                    {/* Bottom padding */}
                    <View className="h-20" />
                </ScrollView>
            </View>
        </SafeAreaView>
    );
};

export default HomeScreen;
