import React, { useEffect, useState, useCallback } from "react";
import { StatusBar, ActivityIndicator, View } from "react-native";
import { useAtom } from "jotai";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { userAtom, newNotificationAtom } from "./state/atoms";
import { RootNavigator } from "./navigation/RootNavigator";
import Toast from "./components/Toast";
import Loading from "./components/Loading";
import FloatingAudioPlayer from "./components/FloatingAudioPlayer";
import { getUserData, getTokens } from "./utils/storage";
import "./global.css";

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function App() {
    const [user, setUser] = useAtom(userAtom);
    const [newNotification, setNewNotification] = useAtom(newNotificationAtom);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        initializeApp();
    }, []);

    const initializeApp = async () => {
        try {
            const userData = await getUserData();
            const tokens = await getTokens();

            if (userData && tokens) {
                setUser(userData);
            }
        } catch (error) {
            console.error("Error initializing app:", error);
        } finally {
            setLoading(false);
        }
    };

    const onLayoutRootView = useCallback(async () => {
            await SplashScreen.hideAsync();
    }, []);

    useEffect(() => {
            onLayoutRootView();
    }, [ onLayoutRootView]);


    if (loading) {
        return (
            <GestureHandlerRootView className="flex-1">
                <SafeAreaProvider>
                    <View className="flex-1 items-center justify-center bg-white">
                        <ActivityIndicator size="large" color="#446785" />
                    </View>
                </SafeAreaProvider>
            </GestureHandlerRootView>
        );
    }

    return (
        <GestureHandlerRootView className="flex-1">
            <SafeAreaProvider>
                <View className="flex-1">
                    <StatusBar barStyle="dark-content" />
                    <RootNavigator user={user} />
                    <FloatingAudioPlayer />
                    {newNotification && <Toast message={newNotification} onClose={() => setNewNotification(null)} />}
                </View>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}
