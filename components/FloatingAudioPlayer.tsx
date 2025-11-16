import React, { useState, useRef, useEffect } from "react";
import { View, Text, TouchableOpacity, Animated, StyleSheet } from "react-native";
import { useAtom } from "jotai";
import { bhajansAtom, currentBhajanAtom, audioBaseAtom, floatingPlayerActiveAtom, type Bhajan } from "../state/atoms";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, ChevronDown, ChevronUp, X } from "lucide-react-native";
import { Audio } from "expo-av";
import Slider from "@react-native-community/slider";
import AsyncStorage from "@react-native-async-storage/async-storage";

const FloatingAudioPlayer = () => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    
    const [floatingPlayerActive] = useAtom(floatingPlayerActiveAtom);
    const [bhajans] = useAtom(bhajansAtom);
    const currentBhajanState = useAtom(currentBhajanAtom);
    const currentBhajan = currentBhajanState[0];
    const updateCurrentBhajan = currentBhajanState[1] as (bhajan: Bhajan | null) => void;
    const [audioBase] = useAtom(audioBaseAtom);
    
    const currentBhajanIndex = currentBhajan ? bhajans.findIndex((b) => b.id === currentBhajan.id) : -1;
    
    const slideAnim = useRef(new Animated.Value(300)).current;

    // Load volume from storage on mount and configure audio
    useEffect(() => {
        const initializeAudio = async () => {
            try {
                // Configure audio mode for playback
                await Audio.setAudioModeAsync({
                    allowsRecordingIOS: false,
                    playsInSilentModeIOS: true,
                    staysActiveInBackground: true,
                    shouldDuckAndroid: true,
                    playThroughEarpieceAndroid: false,
                    interruptionModeIOS: 1,
                    interruptionModeAndroid: 1,
                });
                await loadVolume();
            } catch (error) {
                console.error('Error initializing audio:', error);
            }
        };

        initializeAudio();

        return () => {
            if (sound) {
                sound.unloadAsync().catch(err => console.error('Error unloading sound:', err));
            }
        };
    }, []);

    const loadVolume = async () => {
        try {
            const savedVolume = await AsyncStorage.getItem('floatingPlayerVolume');
            if (savedVolume !== null) {
                const volumeValue = parseFloat(savedVolume);
                setVolume(volumeValue);
                setIsMuted(volumeValue === 0);
            }
        } catch (error) {
            console.error('Error loading volume:', error);
        }
    };

    const saveVolume = async (vol: number) => {
        try {
            await AsyncStorage.setItem('floatingPlayerVolume', vol.toString());
        } catch (error) {
            console.error('Error saving volume:', error);
        }
    };

    // Update audio source when current bhajan changes
    useEffect(() => {
        if (currentBhajan && currentBhajan.isAudio && floatingPlayerActive) {
            loadAudio();
            setIsVisible(true);
            showPlayer();
        } else if (!floatingPlayerActive || !currentBhajan || !currentBhajan.isAudio) {
            // Clean up when player is deactivated or no audio available
            if (sound) {
                sound.pauseAsync().catch(err => console.error('Error pausing:', err));
            }
            if (!floatingPlayerActive) {
                setIsVisible(false);
                hidePlayer();
                setIsPlaying(false);
            }
        }
    }, [currentBhajan?.id, audioBase, floatingPlayerActive]);

    const loadAudio = async () => {
        if (!currentBhajan?.audio_url) {
            return;
        }

        try {
            setIsLoading(true);
            
            // Unload previous sound
            if (sound) {
                await sound.unloadAsync();
                setSound(null);
            }

            let audioUrl = audioBase + currentBhajan.audio_url;
            
            // Encode URL to handle spaces and special characters
            const url = new URL(audioUrl);
            audioUrl = url.toString();

            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri: audioUrl },
                { shouldPlay: false, volume: isMuted ? 0 : volume },
                onPlaybackStatusUpdate
            );
            
            setSound(newSound);
            setIsLoading(false);
            
            // Start playback after a small delay to ensure everything is set up
            setTimeout(async () => {
                try {
                    await newSound.playAsync();
                    setIsPlaying(true);
                } catch (playError) {
                    console.error('Error starting playback:', playError);
                    setIsPlaying(false);
                }
            }, 100);
        } catch (error) {
            console.error('Error loading audio:', error);
            setIsLoading(false);
            setIsPlaying(false);
        }
    };

    const onPlaybackStatusUpdate = (status: any) => {
        if (status.isLoaded) {
            setCurrentTime(status.positionMillis / 1000);
            setDuration(status.durationMillis / 1000);
            setIsPlaying(status.isPlaying);
            
            // Auto-play next when finished
            if (status.didJustFinish && !status.isLooping) {
                playNextBhajan();
            }
        } else if (status.error) {
            console.error('Playback error:', status.error);
            setIsLoading(false);
            setIsPlaying(false);
        }
    };

    const togglePlay = async () => {
        if (!currentBhajan?.isAudio || isLoading) {
            return;
        }

        try {
            if (!sound) {
                await loadAudio();
                return;
            }

            if (isPlaying) {
                await sound.pauseAsync();
            } else {
                await sound.playAsync();
            }
        } catch (error) {
            console.error('Error toggling play:', error);
            setIsPlaying(false);
        }
    };

    const playNextBhajan = () => {
        if (!bhajans || bhajans.length === 0 || currentBhajanIndex === -1) return;

        let nextIndex = currentBhajanIndex + 1;
        const startIndex = nextIndex;

        // Skip bhajans without audio (circular search)
        while (nextIndex < bhajans.length) {
            if (bhajans[nextIndex]?.isAudio) {
                updateCurrentBhajan(bhajans[nextIndex]);
                return;
            }
            nextIndex++;
        }

        // Wrap to beginning if we reached the end
        nextIndex = 0;
        while (nextIndex < startIndex) {
            if (bhajans[nextIndex]?.isAudio) {
                updateCurrentBhajan(bhajans[nextIndex]);
                return;
            }
            nextIndex++;
        }
    };

    const playPreviousBhajan = () => {
        if (!bhajans || bhajans.length === 0 || currentBhajanIndex === -1) return;

        let prevIndex = currentBhajanIndex - 1;
        const startIndex = prevIndex;

        // Skip bhajans without audio (circular search backwards)
        while (prevIndex >= 0) {
            if (bhajans[prevIndex]?.isAudio) {
                updateCurrentBhajan(bhajans[prevIndex]);
                return;
            }
            prevIndex--;
        }

        // Wrap to end if we reached the beginning
        prevIndex = bhajans.length - 1;
        while (prevIndex > startIndex) {
            if (bhajans[prevIndex]?.isAudio) {
                updateCurrentBhajan(bhajans[prevIndex]);
                return;
            }
            prevIndex--;
        }
    };

    const handleVolumeChange = async (newVolume: number) => {
        setVolume(newVolume);
        setIsMuted(newVolume === 0);
        
        if (sound) {
            try {
                await sound.setVolumeAsync(newVolume);
            } catch (error) {
                console.error('Error setting volume:', error);
            }
        }
        
        saveVolume(newVolume);
    };

    const toggleMute = async () => {
        if (!sound) return;

        try {
            if (isMuted) {
                await sound.setVolumeAsync(volume > 0 ? volume : 1);
                setIsMuted(false);
            } else {
                await sound.setVolumeAsync(0);
                setIsMuted(true);
            }
        } catch (error) {
            console.error('Error toggling mute:', error);
        }
    };

    const handleTimeChange = async (value: number) => {
        if (sound) {
            try {
                await sound.setPositionAsync(value * 1000);
            } catch (error) {
                console.error('Error seeking:', error);
            }
        }
    };

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    };

    const showPlayer = () => {
        Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            tension: 65,
            friction: 11,
        }).start();
    };

    const hidePlayer = () => {
        Animated.timing(slideAnim, {
            toValue: 300,
            duration: 300,
            useNativeDriver: true,
        }).start();
    };

    const handleClose = async () => {
        try {
            if (sound) {
                await sound.pauseAsync();
            }
        } catch (error) {
            console.error('Error pausing on close:', error);
        }
        
        hidePlayer();
        setTimeout(() => {
            setIsVisible(false);
            setIsPlaying(false);
        }, 300);
    };

    if (!isVisible || !currentBhajan?.isAudio || !floatingPlayerActive) {
        return null;
    }

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    transform: [{ translateY: slideAnim }],
                },
            ]}
        >
            {isMinimized ? (
                // Minimized view
                <View>
                    <View className="flex-row items-center justify-between p-3">
                        <View className="flex-row items-center gap-3 flex-1">
                            <TouchableOpacity
                                onPress={togglePlay}
                                disabled={isLoading}
                                className="w-8 h-8 items-center justify-center bg-white rounded-full shadow-md border border-primary-700"
                                style={{ opacity: isLoading ? 0.5 : 1 }}
                            >
                                {isLoading ? (
                                    <Text className="text-primary-700">...</Text>
                                ) : isPlaying ? (
                                    <Pause size={16} color="#446785" />
                                ) : (
                                    <Play size={16} color="#446785" />
                                )}
                            </TouchableOpacity>
                            <View className="flex-1">
                                <Text 
                                    className="text-primary-700 text-lg font-medium" 
                                    numberOfLines={1}
                                >
                                    {currentBhajan.title}
                                </Text>
                                <Text 
                                    className="text-primary-700 text-sm" 
                                    numberOfLines={1}
                                >
                                    {currentBhajan.title_guj}
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            onPress={() => setIsMinimized(false)}
                            className="w-10 h-10 items-center justify-center"
                        >
                            <ChevronUp size={24} color="#446785" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleClose}
                            className="w-8 h-8 items-center justify-center ml-1"
                        >
                            <X size={20} color="#446785" />
                        </TouchableOpacity>
                    </View>
                    {/* Progress bar for minimized view */}
                    <View className="h-2 bg-primary-200/50 overflow-hidden">
                        <View
                            style={{
                                height: '100%',
                                width: `${duration ? (currentTime / duration) * 100 : 0}%`,
                                backgroundColor: '#446785',
                            }}
                        />
                    </View>
                </View>
            ) : (
                // Full view
                <View className="p-4">
                    <View className="flex-row items-center justify-between mb-3">
                        <View className="flex-row items-center gap-3 flex-1">
                            <TouchableOpacity
                                onPress={togglePlay}
                                disabled={isLoading}
                                className="w-10 h-10 items-center justify-center bg-white rounded-full shadow-md border border-primary-700"
                                style={{ opacity: isLoading ? 0.5 : 1 }}
                            >
                                {isLoading ? (
                                    <Text className="text-primary-700">...</Text>
                                ) : isPlaying ? (
                                    <Pause size={20} color="#446785" />
                                ) : (
                                    <Play size={20} color="#446785" />
                                )}
                            </TouchableOpacity>
                            <View className="flex-1">
                                <Text 
                                    className="text-primary-700 text-lg font-medium" 
                                    numberOfLines={1}
                                >
                                    {currentBhajan.title}
                                </Text>
                                <Text 
                                    className="text-primary-700 text-sm" 
                                    numberOfLines={1}
                                >
                                    {currentBhajan.title_guj}
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            onPress={() => setIsMinimized(true)}
                            className="w-10 h-10 items-center justify-center"
                        >
                            <ChevronDown size={24} color="#446785" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleClose}
                            className="w-8 h-8 items-center justify-center ml-1"
                        >
                            <X size={20} color="#446785" />
                        </TouchableOpacity>
                    </View>

                    {/* Progress bar */}
                    <View className="mb-3">
                        <Slider
                            style={{ width: '100%', height: 40 }}
                            minimumValue={0}
                            maximumValue={duration || 0}
                            value={currentTime}
                            onSlidingComplete={handleTimeChange}
                            minimumTrackTintColor="#446785"
                            maximumTrackTintColor="rgba(255,255,255,0.5)"
                            thumbTintColor="#446785"
                        />
                        <View className="flex-row justify-between">
                            <Text className="text-xs text-primary-500">
                                {formatTime(currentTime)}
                            </Text>
                            <Text className="text-xs text-primary-500">
                                {formatTime(duration)}
                            </Text>
                        </View>
                    </View>

                    {/* Controls */}
                    <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center gap-2">
                            <TouchableOpacity
                                onPress={playPreviousBhajan}
                                className="w-8 h-8 items-center justify-center"
                            >
                                <SkipBack size={16} color="#446785" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={playNextBhajan}
                                className="w-8 h-8 items-center justify-center"
                            >
                                <SkipForward size={16} color="#446785" />
                            </TouchableOpacity>
                        </View>

                        <View className="flex-row items-center gap-2">
                            <TouchableOpacity
                                onPress={toggleMute}
                                className="w-8 h-8 items-center justify-center"
                            >
                                {isMuted || volume === 0 ? (
                                    <VolumeX size={16} color="#446785" />
                                ) : (
                                    <Volume2 size={16} color="#446785" />
                                )}
                            </TouchableOpacity>
                            <Slider
                                style={{ width: 80, height: 40 }}
                                minimumValue={0}
                                maximumValue={1}
                                step={0.1}
                                value={isMuted ? 0 : volume}
                                onValueChange={handleVolumeChange}
                                minimumTrackTintColor="#446785"
                                maximumTrackTintColor="rgba(255,255,255,0.5)"
                                thumbTintColor="#446785"
                            />
                        </View>
                    </View>
                </View>
            )}
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 80,
        right: 16,
        left: 16,
        backgroundColor: 'rgba(240, 240, 240, 0.95)',
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
        borderWidth: 1,
        borderColor: '#446785',
        overflow: 'hidden',
    },
});

export default FloatingAudioPlayer;
