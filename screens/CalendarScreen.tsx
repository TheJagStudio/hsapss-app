import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, ImageBackground } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import Header from "../components/Header";
import { SafeAreaView } from "react-native-safe-area-context";
import Loading from "../components/Loading";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;



const CalendarScreen = ({ navigation }: { navigation: any }) => {
    const [now] = useState(new Date());
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
    const [selectedYear, setSelectedYear] = useState(now.getFullYear());
    const [events, setEvents] = useState([]);
    const [mandirEvents, setMandirEvents] = useState({});
    const [loading, setLoading] = useState(true);

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    // Calculate calendar data
    const firstDay = new Date(selectedYear, selectedMonth, 1);
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0);
    const startingDay = firstDay.getDay();
    const endingDay = 6 - lastDay.getDay();
    const monthDays = lastDay.getDate();
    const lastMonthDays = new Date(selectedYear, selectedMonth, 0).getDate();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            // Fetch events from API
            const eventsResponse = await fetch(`${BACKEND_URL}/api/event-list/`);
            const eventsData = await eventsResponse.json();
            setEvents(eventsData.events || []);

            // Load local calendar data
            const calendarData = require("../assets/json/calendar-data.json");
            setMandirEvents(calendarData);
        } catch (error) {
            console.error("Error fetching calendar data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handlePreviousMonth = () => {
        if (selectedMonth === 0) {
            setSelectedYear(selectedYear - 1);
            setSelectedMonth(11);
        } else {
            setSelectedMonth(selectedMonth - 1);
        }
    };

    const handleNextMonth = () => {
        if (selectedMonth === 11) {
            setSelectedYear(selectedYear + 1);
            setSelectedMonth(0);
        } else {
            setSelectedMonth(selectedMonth + 1);
        }
    };

    const getColorClass = (color: string, type: "bg" | "border" | "text") => {
        const colorMap: { [key: string]: { bg: string; border: string; text: string } } = {
            orange: { bg: "bg-orange-100", border: "border-orange-500", text: "text-orange-500" },
            green: { bg: "bg-green-100", border: "border-green-500", text: "text-green-500" },
            blue: { bg: "bg-blue-100", border: "border-blue-500", text: "text-blue-500" },
            red: { bg: "bg-red-100", border: "border-red-500", text: "text-red-500" },
            purple: { bg: "bg-purple-100", border: "border-purple-500", text: "text-purple-500" },
            yellow: { bg: "bg-yellow-100", border: "border-yellow-500", text: "text-yellow-500" },
            pink: { bg: "bg-pink-100", border: "border-pink-500", text: "text-pink-500" },
        };
        return colorMap[color]?.[type] || colorMap.blue[type];
    };

    const renderCalendarDay = (day: number, isCurrentMonth: boolean = true) => {
        if (!isCurrentMonth) {
            return (
                <View key={`prev-${day}`} className="w-[14.28%] aspect-square min-h-[60px] p-2 bg-gray-50 border-r border-b border-secondary-500/50">
                    <Text className="text-xs font-semibold text-gray-400">{day}</Text>
                </View>
            );
        }

        const dayDataRaw = mandirEvents?.[selectedYear]?.[monthNames[selectedMonth]]?.[day];
        const dayData = typeof dayDataRaw === 'object' ? dayDataRaw : undefined;
        const dayEvents = events.filter((event) => event.day === day && event.month - 1 === selectedMonth && event.year === selectedYear);
        const isToday = now.getDate() === day && now.getMonth() === selectedMonth && now.getFullYear() === selectedYear;

        return (
            <View key={`day-${day}`} className="w-[14.28%] aspect-square min-h-[60px] p-1 bg-white border-r border-b border-secondary-500/50">
                <View className={`w-6 h-6 items-center justify-center rounded-full ${isToday ? "bg-secondary-500" : ""}`}>
                    <Text className={`text-xs font-semibold ${isToday ? "text-white" : "text-primary-600"}`}>{day}</Text>
                </View>

                {dayData?.iconURL && dayData.iconURL !== "" ? (
                    <View className="items-center mt-1">
                        <Image source={{ uri: dayData.iconURL }} className="w-8 h-8" resizeMode="contain" />
                        <Text className="text-[10px] text-primary-600 text-center" numberOfLines={2}>
                            {dayData?.events?.[0]?.eventTitleGuj || `${dayData?.pakshaGuj} ${dayData?.tithiGuj}`}
                        </Text>
                    </View>
                ) : (
                    <Text className="text-[10px] text-primary-600 text-center mt-1" numberOfLines={2}>
                        {dayData?.pakshaGuj} {dayData?.tithiGuj}
                    </Text>
                )}

                {dayEvents.length > 0 && (
                    <View className="absolute bottom-1 left-1">
                        <View className={`w-2 h-2 rounded-full bg-${dayEvents[0].color}-500`} />
                    </View>
                )}
            </View>
        );
    };

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-white">
                <View className="flex-1 bg-background">
                    <Header navigation={navigation} />
                    <Loading />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="h-screen bg-white">
            <View className="flex-1 bg-background">
                <ImageBackground source={require("../assets/images/backgroundLight.png")} style={{ width: "100%", height: "100%", justifyContent: "center", alignItems: "center" }} resizeMode="repeat">
                    <Header navigation={navigation} />
                    <ScrollView className="flex-1">
                        <View className="p-4">
                            {/* Calendar Section */}
                            <View className="bg-gray-50 rounded-2xl p-4 mb-6">
                                {/* Month Navigation */}
                                <View className="flex-row items-center justify-between mb-4">
                                    <View className="flex-1">
                                        <Text className="text-2xl font-bold text-primary-600">
                                            {monthNames[selectedMonth]} {selectedYear}
                                        </Text>
                                        <Text className="text-sm text-primary-600 mt-1">{selectedMonth === 0 ? `( ${mandirEvents?.[selectedYear - 1]?.[monthNames[11]]?.monthNameGuj}-${mandirEvents?.[selectedYear]?.[monthNames[selectedMonth]]?.monthNameGuj} )` : `( ${mandirEvents?.[selectedYear]?.[monthNames[selectedMonth - 1]]?.monthNameGuj}-${mandirEvents?.[selectedYear]?.[monthNames[selectedMonth]]?.monthNameGuj} )`}</Text>
                                    </View>
                                    <View className="flex-row gap-2">
                                        <TouchableOpacity onPress={handlePreviousMonth} className="p-2 rounded-lg bg-secondary-100 active:bg-secondary-200">
                                            <ChevronLeft size={20} color="#f97316" />
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={handleNextMonth} className="p-2 rounded-lg bg-secondary-100 active:bg-secondary-200">
                                            <ChevronRight size={20} color="#f97316" />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* Calendar Grid */}
                                <View className="border border-secondary-500/50 rounded-xl overflow-hidden">
                                    {/* Day Headers */}
                                    <View className="flex-row bg-secondary-50">
                                        {dayNames.map((day, index) => (
                                            <View key={day} className={`w-[14.28%] py-3 items-center justify-center ${index < 6 ? "border-r" : ""} border-secondary-500/50`}>
                                                <Text className="text-xs font-medium text-secondary-600">{day}</Text>
                                            </View>
                                        ))}
                                    </View>

                                    {/* Calendar Days */}
                                    <View className="flex-row flex-wrap">
                                        {/* Previous month days */}
                                        {Array.from({ length: startingDay }).map((_, index) => renderCalendarDay(lastMonthDays - startingDay + index + 1, false))}

                                        {/* Current month days */}
                                        {Array.from({ length: monthDays }).map((_, index) => renderCalendarDay(index + 1, true))}

                                        {/* Next month days */}
                                        {Array.from({ length: endingDay }).map((_, index) => renderCalendarDay(index + 1, false))}
                                    </View>
                                </View>
                            </View>
                            {/* Upcoming Events Section */}
                            <View className="mb-6">
                                <Text className="text-2xl font-bold text-primary-600 mb-3">Upcoming Events</Text>
                                <ScrollView className="max-h-96">
                                    {events.map((event, index) => (
                                        <View key={index} className="p-4 mb-3 rounded-xl bg-white shadow-sm border border-gray-100">
                                            <View className="flex-row items-center justify-between mb-2">
                                                <View className="flex-row items-center gap-2">
                                                    <View className={`w-2 h-2 rounded-full bg-${event.color}-500`} />
                                                    <Text className="text-sm font-medium text-primary-600">{event.date}</Text>
                                                </View>
                                            </View>
                                            <Text className="text-base font-semibold text-primary-700 mb-1">{event.title}</Text>
                                            <Text className="text-sm text-gray-600">{event.description}</Text>
                                        </View>
                                    ))}
                                </ScrollView>
                            </View>
                        </View>
                    </ScrollView>
                </ImageBackground>
            </View>
        </SafeAreaView>
    );
};

export default CalendarScreen;
