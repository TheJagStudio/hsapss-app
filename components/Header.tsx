import React, { useState, useEffect, useRef } from "react";
import { View, Text, Image, TouchableOpacity, Modal, ScrollView, Animated } from "react-native";
import { useAtom } from "jotai";
import { userAtom } from "../state/atoms";
import { Home, Images, FileText, Search, Info, Share2, MessageSquare, Settings, Bell, Menu, X, StarIcon, SparkleIcon, SparklesIcon } from "lucide-react-native";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "http://localhost:8000";

export const Header = ({ navigation }) => {
    const [user] = useAtom(userAtom);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const slideAnim = useRef(new Animated.Value(300)).current;

    useEffect(() => {
        Animated.timing(slideAnim, {
            toValue: isDrawerOpen ? 0 : 300,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [isDrawerOpen]);

    if (!user || !user.id) {
        return null;
    }

    const menuItems = [
        { icon: Home, label: "Home", path: "HomeScreen" },
        { icon: Images, label: "Wallpapers", path: "Wallpapers" },
        { icon: SparklesIcon, label: "NarayanGPT", path: "NarayanGPT" },
        { icon: Search, label: "Search", path: "Search" },
        { icon: Info, label: "Info", path: "Info" },
        { icon: Share2, label: "Share App", path: "Share" },
        { icon: MessageSquare, label: "Feedback", path: "Feedback" },
        { icon: Settings, label: "Settings", path: "SettingsHome" },
    ];

    return (
        <>
            <View className="bg-white w-full rounded-b-2xl z-50 " style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 5 }}>
                <View className="w-full px-4 py-3 flex-row items-center justify-between">
                    <View className="flex-row items-center z-50">
                        <Image source={{ uri: `${BACKEND_URL}${user?.profile_image}` }} className="w-10 h-10 rounded-lg mr-2" />
                        <View>
                            <Text className="text-gray-700 font-medium">
                                {user?.first_name} {user?.last_name}
                            </Text>
                            <Text className="text-gray-500 text-sm">{user?.region}</Text>
                        </View>
                    </View>

                    <View className="flex-row items-center gap-2">
                        <TouchableOpacity onPress={() => navigation.navigate("Notification")} className="px-1.5 relative">
                            <Bell size={20} color="#31475b" />
                            <View className="bg-white absolute -top-0 right-0 w-3 h-3 rounded-full border-2 border-[#446785]">
                                <Text className="text-[#446785] text-[8px] text-center font-semibold leading-[10px]">3</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => setIsDrawerOpen(true)} className="p-2 px-1.5">
                            <Menu size={24} color="#2d3d4d" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <Modal visible={isDrawerOpen} transparent animationType="none" onRequestClose={() => setIsDrawerOpen(false)}>
                <TouchableOpacity activeOpacity={1} onPress={() => setIsDrawerOpen(false)} className="flex-1 bg-black/50">
                    <TouchableOpacity activeOpacity={1} className="absolute top-0 right-0 h-full w-72">
                        <Animated.View style={{ transform: [{ translateX: slideAnim }] }} className="h-full w-72 pt-10 bg-[#1a3d5c]">
                            <ScrollView className="flex-1">
                                <TouchableOpacity onPress={() => setIsDrawerOpen(false)} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 items-center justify-center z-10">
                                    <X size={24} color="white" />
                                </TouchableOpacity>

                                <View className="pt-10 px-4 h-full">
                                    {menuItems.map((item, index) => {
                                        const IconComponent = item.icon;
                                        return (
                                            <TouchableOpacity
                                                key={index}
                                                onPress={() => {
                                                    setIsDrawerOpen(false);
                                                    navigation.navigate(item.path);
                                                }}
                                                className="flex-row items-center gap-4 px-4 py-3 rounded-lg mb-2"
                                            >
                                                <IconComponent size={24} color="rgba(255,255,255,0.8)" />
                                                <Text className="text-lg text-white/80">{item.label}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>

                            </ScrollView>
                                <View className="p-4 border-t border-white/20 ">
                                    <TouchableOpacity
                                        onPress={() => {
                                            setIsDrawerOpen(false);
                                            navigation.navigate("Profile");
                                        }}
                                        className="flex-row items-center gap-3 p-3 rounded-lg"
                                    >
                                        <Image source={{ uri: `${BACKEND_URL}${user?.profile_image}` }} className="w-12 h-12 rounded-full border-2 border-white/30" />
                                        <View className="flex-1">
                                            <Text className="font-medium text-white">
                                                {user?.first_name} {user?.last_name}
                                            </Text>
                                            <Text className="text-sm text-white/60">{user?.region}</Text>
                                        </View>
                                    </TouchableOpacity>
                                </View>
                        </Animated.View>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>
        </>
    );
};

export default Header;
