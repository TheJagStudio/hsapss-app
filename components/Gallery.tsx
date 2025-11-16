import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, Image, ActivityIndicator, Modal, Dimensions, Alert, Platform, Share, TouchableWithoutFeedback } from "react-native";
import { useAtom } from "jotai";
import { userAtom } from "../state/atoms";

import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CameraIcon, CameraOffIcon, ChevronLeft, ChevronRight, GalleryThumbnailsIcon, ImageIcon, DownloadIcon, XIcon } from "lucide-react-native";
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const Gallery = () => {
    const [galleryImages, setGalleryImages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [user] = useAtom(userAtom);
    const [selectedImage, setSelectedImage] = useState(null);
    const navigation = useNavigation();

    useEffect(() => {
        fetchGalleryImages();
    }, []);

    const fetchGalleryImages = async () => {
        try {
            const tokens = JSON.parse((await AsyncStorage.getItem("hsapss_tokens")) || "{}");
            const response = await fetch(`${BACKEND_URL}/api/gallery/`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${tokens?.access_token}`,
                },
            });

            if (!response.ok) {
                throw new Error("Failed to fetch gallery images");
            }

            const data = await response.json();
            setGalleryImages(data.gallery || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return "Today";
        } else if (date.toDateString() === yesterday.toDateString()) {
            return "Yesterday";
        } else {
            return date.toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
            });
        }
    };

    const groupImagesByDate = () => {
        const grouped = {};
        galleryImages?.forEach((image) => {
            const dateKey = new Date(image?.date).toDateString();
            if (!grouped[dateKey]) {
                grouped[dateKey] = [];
            }
            grouped[dateKey].push(image);
        });
        return grouped;
    };

    const downloadImage = async (imageUrl) => {
        try {
            // Request permission to access photo library
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Please grant permission to save images to your photo library.');
                return;
            }

            // Try to save directly from URL to photo library
            try {
                // Save directly to library - this should work for most images
                await MediaLibrary.saveToLibraryAsync(imageUrl);
                
                // Try to create album, but don't fail if it doesn't work
                try {
                    const album = await MediaLibrary.getAlbumAsync('TempleGallery');
                } catch (albumError) {
                    console.log('Album handling failed, but image saved:', albumError);
                }
                
                Alert.alert('Success', 'Image saved to your photo gallery successfully!');
                
            } catch (saveError) {
                console.log('Direct save failed, trying share method:', saveError);
                
                // Fallback: Share the image URL so user can save it manually
                Alert.alert('Save Image', 'Tap the share button and then "Save Image" or long-press the image to save it.');
                
                await Share.share({
                    url: imageUrl,
                    title: 'Temple Gallery Image',
                    message: 'Save this beautiful temple image!',
                });
            }
            
        } catch (error) {
            console.error('Download error:', error);
            Alert.alert('Error', 'Unable to save the image. Please try again or check your internet connection.');
        }
    };

    const closeModal = () => {
        setSelectedImage(null);
    };

    if (loading) {
        return (
            <View className="p-3">
                <View className="flex-row justify-between items-center mb-2">
                    <View className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
                    <View className="flex-row gap-3">
                        <View className="h-10 w-24 bg-gray-200 rounded-full animate-pulse" />
                    </View>
                </View>

                <View className="bg-white rounded-lg shadow-md p-3 mt-3">
                    <View className="flex-row items-center gap-3 mb-4">
                        <View className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
                        <View>
                            <View className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-2" />
                            <View className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
                        </View>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-3">
                        {[1, 2, 3, 4].map((img) => (
                            <View key={img} className="w-40 h-40 bg-gray-200 animate-pulse rounded-lg" />
                        ))}
                    </ScrollView>
                </View>
            </View>
        );
    }

    if (error) {
        return null;
    }

    const isAdmin = user?.user_type === "superadmin" || user?.user_type === "regionadmin";
    if (galleryImages?.length === 0 && !isAdmin) {
        return null;
    }

    const groupedImages = groupImagesByDate();
    const { width } = Dimensions.get("window");

    return (
        <View className="p-3">
            <View className="flex-row justify-between items-center mb-2">
                <Text className="font-bold text-3xl text-primary-700">Temple Gallery</Text>
                <View className="flex-row gap-3">
                    {galleryImages?.length > 0 && (
                        <TouchableOpacity onPress={() => navigation.navigate("GalleryAll" as never)} className="px-2 py-2 flex-row bg-primary-600 active:bg-primary-800 rounded-lg border border-primary-300">
                            <Text className="text-primary-100 text-sm font-medium">View All</Text>
                            <Text className="text-white text-lg ml-1">
                                <ChevronRight size={16} color="white" />
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {galleryImages?.length > 0 ? (
                <View>
                    {Object.entries(groupedImages).map(([dateKey, images]) => (
                        <View key={dateKey} className="bg-white rounded-lg shadow-md p-3 mt-3">
                            <View className="flex-row items-center gap-3 mb-4">
                                <View className="w-10 h-10 rounded-full bg-primary-100 items-center justify-center">
                                    <Text className="text-primary-600 text-xl">
                                        <ImageIcon size={24} color="#446785" />
                                    </Text>
                                </View>
                                <View>
                                    <Text className="text-primary-800 font-semibold">Smruti {formatDate(dateKey)}</Text>
                                    <Text className="text-sm text-primary-600">
                                        {images && images.length} {images && images.length === 1 ? "image" : "images"}
                                    </Text>
                                </View>
                            </View>

                            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
                                {images && images.map((image) => (
                                    <TouchableOpacity key={image?.id} onPress={() => setSelectedImage(`${BACKEND_URL}${image?.image}`)} className="bg-primary-50 mr-2 rounded-lg overflow-hidden">
                                        <Image source={{ uri: `${BACKEND_URL}${image?.image}` }} className="w-32 h-32" resizeMode="cover" />
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    ))}
                </View>
            ) : (
                <View className="bg-white rounded-lg shadow-md p-6 mt-3 items-center">
                    <View className="w-16 h-16 mb-4 rounded-full bg-primary-100 items-center justify-center">
                        <Text className="text-primary-600 text-3xl">📷</Text>
                    </View>
                    <Text className="text-lg font-semibold text-primary-800 mb-2">No Gallery Images</Text>
                    <Text className="text-primary-600 text-center mb-4">There are no images in the gallery yet. Be the first to add some temple photos!</Text>
                </View>
            )}

            {/* Image Viewer Modal */}
            <Modal visible={selectedImage !== null} transparent animationType="fade">
                <TouchableWithoutFeedback onPress={closeModal}>
                    <View className="flex-1 bg-black/95">
                        {/* Header with close and download buttons */}
                        <View className="absolute top-12 left-0 right-0 z-20 flex-row justify-between items-center px-4">
                            <TouchableOpacity
                                onPress={closeModal}
                                className="bg-black/50 rounded-full p-3"
                            >
                                <XIcon size={24} color="white" />
                            </TouchableOpacity>
                            
                            {selectedImage && (
                                <TouchableOpacity
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        downloadImage(selectedImage);
                                    }}
                                    className="bg-black/50 rounded-full p-3"
                                >
                                    <DownloadIcon size={24} color="white" />
                                </TouchableOpacity>
                            )}
                        </View>
                        
                        {/* Image display area - prevent tap to close when tapping on image */}
                        <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                            <View className="flex-1 justify-center items-center">
                                {selectedImage && (
                                    <Image
                                        source={{ uri: selectedImage }}
                                        className="w-full h-full"
                                        resizeMode="contain"
                                        style={{ maxWidth: '100%', maxHeight: '100%' }}
                                    />
                                )}
                            </View>
                        </TouchableWithoutFeedback>
                        
                        {/* Footer with image info */}
                        <View className="absolute bottom-8 left-0 right-0 z-20 px-4">
                            <View className="bg-black/50 rounded-lg p-4 mx-4">
                                <Text className="text-white text-center text-sm">
                                    Tap anywhere to close • Use download button to save
                                </Text>
                            </View>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </View>
    );
};

export default Gallery;
