import React, { useEffect, useState, useRef } from "react";
import { View, Text, ScrollView, TouchableOpacity, Dimensions, Animated, PanResponder } from "react-native";
import { useAtom } from "jotai";
import { currentBhajanAtom, lyricsBaseAtom, audioBaseAtom, bhajansAtom, floatingPlayerActiveAtom } from "../state/atoms";
import { API_BASE_URL } from "../utils/api";
import { ChevronLeft, Music } from "lucide-react-native";
import { WebView } from "react-native-webview";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface Bhajan {
    id: number;
    title: string;
    title_guj: string;
    isAudio: boolean;
    isEng: boolean;
    isHnd: boolean;
    audio_url?: string;
    lyrics?: string;
    audioBase?: string;
    lyricsBase?: string;
    lyrics_html?: string;
}

interface BhajanPanels {
    left: Bhajan | null;
    center: Bhajan | null;
    right: Bhajan | null;
}

const styleWeb = `<style>
            @font-face {
                font-family: 'hsapss';
                src: url('https://hsapssconnect.vercel.app/static/fonts/AestheticRomance-Regular.woff2') format('woff2'),
                    url('https://hsapssconnect.vercel.app/static/fonts/AestheticRomance-Regular.woff') format('woff');
                font-weight: normal;
                font-style: normal;
                font-display: swap;
            }

            @font-face {
                font-family: 'ShreeHindi';
                src: url('https://hsapssconnect.vercel.app/static/fonts/S0728810.TTF');
                src: url('https://hsapssconnect.vercel.app/static/fonts/S0728810.otf');
            }
            body {
                font-family: 'Poppins', sans-serif;
                padding: 0; 
                margin: 0;
            }

            .custom-shadow {
                -webkit-box-shadow: 0px -10px 60px -15px rgba(56, 84, 108, 0.56);
                -moz-box-shadow: 0px -10px 60px -15px rgba(56, 84, 108, 0.56);
                box-shadow: 0px -10px 60px -15px rgba(56, 84, 108, 0.25);
            }

            *::-webkit-scrollbar {
                display: none;
            }

            .custom-scrollbar::-webkit-scrollbar {
                width: 8px;
                display: block;
            }

            .custom-scrollbar::-webkit-scrollbar-thumb {
                background-color: #446785;
                width: 12px;
                border-radius: 6px;
            }

            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                background-color: #31475b;
            }

            .custom-scrollbar::-webkit-scrollbar-track {
                background-color: #f1f1f1;
            }

            .gtitlev3 {
                font-size: 1.5rem;
                font-weight: 700;
                margin-bottom: 0.75rem;
                background-color: #fff8dc;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                padding-left: 0.5rem;
                padding-right: 0.5rem;
                text-align: center;
                border-radius: 0.375rem;
            }

            .chend {
                font-size: 1.875rem;
                line-height: 2.25rem;
                font-weight: 600;
                width: fit-content;
                margin-left: auto;
                margin-right: auto;
                color: #31475b;
                margin-top: 0.75rem;
                background-color: #fff8dc;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                border-radius: 0.375rem;
                padding-left: 1.25rem;
                padding-right: 1.25rem;
                text-align: center;
            }

            .gpara {
                color: #38546c;
                font-weight: 600;
            }

            .gparabhajan3 {
                color: #38546c;
                font-weight: 600
            }
        </style>`;

const BhajanDetailScreen = ({ navigation, route }: { navigation: any; route: any }) => {
    const { id, catLink } = route.params || {};
    const currentBhajanState = useAtom(currentBhajanAtom);
    const currentBhajan = currentBhajanState[0];
    const setCurrentBhajan = currentBhajanState[1] as (bhajan: Bhajan | null) => void;
    const [audioBase, setAudioBase] = useAtom(audioBaseAtom);
    const [lyricsBase, setLyricsBase] = useAtom(lyricsBaseAtom);
    const [bhajans, setBhajans] = useAtom(bhajansAtom);
    const [floatingPlayerActive, setFloatingPlayerActive] = useAtom(floatingPlayerActiveAtom);
    const [activeLanguage, setActiveLanguage] = useState("");
    const [fontSize, setFontSize] = useState(48);
    const [panels, setPanels] = useState<BhajanPanels>({ left: null, center: null, right: null });
    const [loading, setLoading] = useState(false);

    const pan = useRef(new Animated.Value(0)).current;
    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
            },
            onPanResponderMove: (_, gestureState) => {
                // Limit swipe when no adjacent panel exists
                if ((gestureState.dx > 0 && !panels?.left) || (gestureState.dx < 0 && !panels?.right)) {
                    pan.setValue(gestureState.dx * 0.3);
                } else {
                    pan.setValue(gestureState.dx);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                const threshold = SCREEN_WIDTH * 0.25;

                if (Math.abs(gestureState.dx) > threshold) {
                    if (gestureState.dx > 0 && panels?.left) {
                        // Swipe right - go to previous
                        Animated.timing(pan, {
                            toValue: SCREEN_WIDTH,
                            duration: 300,
                            useNativeDriver: true,
                        }).start(() => {
                            navigateToPrevious();
                        });
                    } else if (gestureState.dx < 0 && panels?.right) {
                        // Swipe left - go to next
                        Animated.timing(pan, {
                            toValue: -SCREEN_WIDTH,
                            duration: 300,
                            useNativeDriver: true,
                        }).start(() => {
                            navigateToNext();
                        });
                    } else {
                        resetPosition();
                    }
                } else {
                    resetPosition();
                }
            },
        })
    ).current;

    const resetPosition = () => {
        Animated.spring(pan, {
            toValue: 0,
            useNativeDriver: true,
        }).start();
    };

    const navigateToPrevious = async () => {
        if (panels?.left) {
            const { prev } = getAdjacentBhajans(panels?.left.id);
            const newLeftData = prev ? await fetchBhajanDetails(prev.id) : null;

            setPanels({
                left: newLeftData,
                center: panels?.left,
                right: panels?.center,
            });

            setCurrentBhajan(panels?.left);
            setAudioBase(panels?.left.audioBase || "");
            setLyricsBase(panels?.left.lyricsBase || "");
        }
        pan.setValue(0);
    };

    const navigateToNext = async () => {
        if (panels?.right) {
            const { next } = getAdjacentBhajans(panels?.right.id);
            const newRightData = next ? await fetchBhajanDetails(next.id) : null;

            setPanels({
                left: panels?.center,
                center: panels?.right,
                right: newRightData,
            });

            setCurrentBhajan(panels?.right);
            setAudioBase(panels?.right.audioBase || "");
            setLyricsBase(panels?.right.lyricsBase || "");
        }
        pan.setValue(0);
    };

    const getAdjacentBhajans = (currentId: number) => {
        if (!bhajans || bhajans.length === 0) return { prev: null, current: null, next: null };

        const currentIndex = bhajans.findIndex((b: Bhajan) => b.id === parseInt(currentId.toString()));
        if (currentIndex === -1) return { prev: null, current: null, next: null };

        return {
            prev: currentIndex > 0 ? bhajans[currentIndex - 1] : null,
            current: bhajans[currentIndex],
            next: currentIndex < bhajans.length - 1 ? bhajans[currentIndex + 1] : null,
        };
    };

    const fetchBhajanDetails = async (bhajanId: number): Promise<Bhajan | null> => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/bhajan-detail/${bhajanId}`);
            const data = await response.json();

            // Load lyrics
            const lyricsResponse = await fetch(data.lyricsBase + activeLanguage + data.lyrics);
            const lyricsText = await lyricsResponse.text();

            return {
                ...data,
                lyrics_html: lyricsText,
            };
        } catch (error) {
            console.error("Error fetching bhajan details:", error);
            return null;
        }
    };

    const fetchBhajanList = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/bhajan-list/${catLink}`);
            const data = await response.json();
            if (data?.bhajans) {
                setBhajans(data.bhajans);
            }
        } catch (error) {
            console.error("Error fetching bhajan list:", error);
        }
    };

    const initializePanels = async (currentId: number) => {
        setLoading(true);

        const centerData = await fetchBhajanDetails(currentId);
        if (!centerData) {
            setLoading(false);
            return;
        }

        setCurrentBhajan(centerData);
        setAudioBase(centerData.audioBase || "");
        setLyricsBase(centerData.lyricsBase || "");

        let leftData = null;
        let rightData = null;

        if (bhajans && bhajans.length > 0) {
            const { prev, next } = getAdjacentBhajans(currentId);
            leftData = prev ? await fetchBhajanDetails(prev.id) : null;
            rightData = next ? await fetchBhajanDetails(next.id) : null;
        }

        setPanels({
            left: leftData,
            center: centerData,
            right: rightData,
        });

        setLoading(false);
    };

    useEffect(() => {
        if (!bhajans || bhajans.length === 0) {
            fetchBhajanList();
        } else if (id) {
            initializePanels(id);
        }
    }, [id, bhajans]);

    useEffect(() => {
        if (panels?.center && id) {
            initializePanels(id);
        }
    }, [activeLanguage]);

    const toggleFloatingPlayer = () => {
        if (!floatingPlayerActive) {
            setFloatingPlayerActive(true);
            if (panels?.center) {
                setCurrentBhajan(panels?.center);
                setAudioBase(panels?.center.audioBase || "");
                setLyricsBase(panels?.center.lyricsBase || "");
            }
        } else {
            setFloatingPlayerActive(false);
        }
    };

    return (
        <SafeAreaView className="bg-white h-screen">
            <View className="flex-1 bg-background">
                {/* Fixed Header */}
                <View className="bg-white border-b border-primary-600 " style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 }}>
                    <View className="flex-row items-center justify-between px-5 py-3">
                        <View className="flex-row items-center flex-1">
                            <TouchableOpacity onPress={() => navigation.goBack()} className="mr-2">
                                <ChevronLeft size={24} color="#446785" />
                            </TouchableOpacity>
                            <View className="flex-1">
                                <Text className="text-2xl text-primary-800 font-bold">{currentBhajan?.title || "Loading..."}</Text>
                                <Text className="text-primary-800">{currentBhajan?.title_guj || ""}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Controls */}
                    <View className="flex-row items-center justify-between px-5 py-2 border-t border-primary-700">
                        <View className="flex-row items-center gap-2">
                            {currentBhajan?.isAudio && (
                                <TouchableOpacity onPress={toggleFloatingPlayer} className={`px-3 py-1 rounded-full border-2 border-primary-600 ${floatingPlayerActive ? "bg-primary-600" : "bg-white"}`}>
                                    <Music size={20} color={floatingPlayerActive ? "#fff" : "#446785"} />
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                onPress={() => {
                                    setActiveLanguage("");
                                    setFontSize(16);
                                }}
                                className={`px-3 py-1 rounded-full border-2 border-primary-600 ${activeLanguage === "" ? "bg-primary-600" : "bg-white"}`}
                            >
                                <Text className={activeLanguage === "" ? "text-white" : "text-primary-600"}>Gujarati</Text>
                            </TouchableOpacity>
                            {currentBhajan?.isEng && (
                                <TouchableOpacity
                                    onPress={() => {
                                        setActiveLanguage("E");
                                        setFontSize(16);
                                    }}
                                    className={`px-3 py-1 rounded-full border-2 border-primary-600 ${activeLanguage === "E" ? "bg-primary-600" : "bg-white"}`}
                                >
                                    <Text className={activeLanguage === "E" ? "text-white" : "text-primary-600"}>English</Text>
                                </TouchableOpacity>
                            )}
                            {currentBhajan?.isHnd && (
                                <TouchableOpacity
                                    onPress={() => {
                                        setActiveLanguage("H");
                                        setFontSize(16);
                                    }}
                                    className={`px-3 py-1 rounded-full border-2 border-primary-600 ${activeLanguage === "H" ? "bg-primary-600" : "bg-white"}`}
                                >
                                    <Text className={activeLanguage === "H" ? "text-white" : "text-primary-600"}>Hindi</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                        <View className="flex-row items-center gap-1">
                            <TouchableOpacity onPress={() => setFontSize(fontSize + 3)} className="w-8 h-8 items-center justify-center bg-primary-600 rounded-full border-2 border-primary-600">
                                <Text className="text-white text-xl">+</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setFontSize(fontSize - 3)} className="w-8 h-8 items-center justify-center bg-primary-600 rounded-full border-2 border-primary-600">
                                <Text className="text-white text-xl">-</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Three-Panel Carousel */}
                <View className="flex-1">
                    {loading ? (
                        <View className="flex-1 items-center justify-center">
                            <Text className="text-primary-600">Loading...</Text>
                        </View>
                    ) : (
                        <Animated.View
                            style={{
                                flexDirection: "row",
                                width: SCREEN_WIDTH * 3,
                                height: "100%",
                                transform: [
                                    {
                                        translateX: Animated.add(pan, new Animated.Value(-SCREEN_WIDTH)),
                                    },
                                ],
                            }}
                            {...panResponder.panHandlers}
                        >
                            {/* Left Panel */}
                            <View style={{ width: SCREEN_WIDTH }}>
                                {panels?.left && (
                                    <ScrollView className="flex-1 p-5">
                                        <View className="bg-white rounded-xl shadow-inner p-5">
                                            <WebView
                                                originWhitelist={["*"]}
                                                source={{
                                                    html: `
                                                        ${styleWeb}
                                                        <style>
                                                        *{
                                                        font-size: ${fontSize}px;
                                                        }
                                                        </style>
                                                        ${panels?.left?.lyrics_html || ""}
                                                `,
                                                }}
                                                style={{ height: 500 }}
                                            />
                                        </View>
                                    </ScrollView>
                                )}
                            </View>

                            {/* Center Panel (Current) */}
                            <View style={{ width: SCREEN_WIDTH }}>
                                {panels?.center && (
                                    <ScrollView className="flex-1 p-5">
                                        <View className="bg-white rounded-xl shadow-inner p-5">
                                            <WebView
                                                originWhitelist={["*"]}
                                                source={{
                                                    html: `
                                                            ${styleWeb}
                                                            <style>
                                                        *{
                                                        font-size: ${fontSize}px;
                                                        }
                                                        </style>
                                                            ${panels?.center?.lyrics_html || ""}
                                                `,
                                                }}
                                                style={{ height: 500 }}
                                            />
                                        </View>
                                    </ScrollView>
                                )}
                            </View>

                            {/* Right Panel */}
                            <View style={{ width: SCREEN_WIDTH }}>
                                {panels?.right && (
                                    <ScrollView className="flex-1 p-5">
                                        <View className="bg-white rounded-xl shadow-inner p-5">
                                            <WebView
                                                originWhitelist={["*"]}
                                                source={{
                                                    html: `
                                                    ${styleWeb}
                                                    <style>
                                                        *{
                                                        font-size: ${fontSize}px;
                                                        }
                                                        </style>
                                                    ${panels?.right?.lyrics_html || ""}
                                                `,
                                                }}
                                                style={{ height: 500 }}
                                            />
                                        </View>
                                    </ScrollView>
                                )}
                            </View>
                        </Animated.View>
                    )}
                </View>
            </View>
        </SafeAreaView>
    );
};

export default BhajanDetailScreen;
