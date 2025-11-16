import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { FontAwesome5 } from "@expo/vector-icons";

// Screens - Authenticated
import HomeScreen from "../screens/HomeScreen";
import BhajanCategoryScreen from "../screens/BhajanCategoryScreen";
import BhajanHomeScreen from "../screens/BhajanHomeScreen";
import BhajanDetailScreen from "../screens/BhajanDetailScreen";
import CalendarScreen from "../screens/CalendarScreen";
import BooksScreen from "../screens/BooksScreen";
import BooksDetailsScreen from "../screens/BooksDetailsScreen";
import BookChapterScreen from "../screens/BookChapterScreen";
import SettingsScreen from "../screens/SettingsScreen";
import GalleryAllScreen from "../screens/GalleryAllScreen";
import WallpapersScreen from "../screens/WallpapersScreen";

// Screens - Meditation
import MeditationDhunScreen from "../screens/MeditationDhunScreen";
import MeditationChestaScreen from "../screens/MeditationChestaScreen";
import MeditationSwamiVatoScreen from "../screens/MeditationSwamiVatoScreen";
import MeditationShikshapatriScreen from "../screens/MeditationShikshapatriScreen";

// Screens - Auth
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import LogoutScreen from "../screens/LogoutScreen";

// Screens - Other
import ProfileScreen from "../screens/ProfileScreen";
import NotificationScreen from "../screens/NotificationScreen";
import CreatePollScreen from "../screens/CreatePollScreen";
import ChangePasswordScreen from "../screens/ChangePasswordScreen";
import { BookAIcon, BookIcon, BookTextIcon, CalculatorIcon, Calendar1Icon, HomeIcon, Music2Icon, Music3Icon, Music4Icon, MusicIcon, Settings2Icon, SettingsIcon } from "lucide-react-native";
import NarayanGPTScreen from "screens/NarayanGPTScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const AuthStack = () => (
    <Stack.Navigator
        screenOptions={{
            headerShown: false,
        }}
    >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
);

const HomeStack = () => (
    <Stack.Navigator
        screenOptions={{
            headerShown: false,
        }}
    >
        <Stack.Screen name="HomeScreen" component={HomeScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="NarayanGPT" component={NarayanGPTScreen} />
    </Stack.Navigator>
);

const BhajanStack = () => (
    <Stack.Navigator
        screenOptions={{
            headerShown: false,
        }}
    >
        <Stack.Screen name="BhajanCategory" component={BhajanCategoryScreen} />
        <Stack.Screen name="BhajanHome" component={BhajanHomeScreen} />
        <Stack.Screen name="BhajanDetail" component={BhajanDetailScreen} />
    </Stack.Navigator>
);

const BooksStack = () => (
    <Stack.Navigator
        screenOptions={{
            headerShown: false,
        }}
    >
        <Stack.Screen name="BooksHome" component={BooksScreen} />
        <Stack.Screen name="BooksDetails" component={BooksDetailsScreen} />
        <Stack.Screen name="BookChapter" component={BookChapterScreen} />
    </Stack.Navigator>
);

const SettingsStack = () => (
    <Stack.Navigator
        screenOptions={{
            headerShown: false,
        }}
    >
        <Stack.Screen name="SettingsHome" component={SettingsScreen} />
        <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
        <Stack.Screen name="Notification" component={NotificationScreen} />
    </Stack.Navigator>
);

const AppStack = () => (
    <Tab.Navigator
        screenOptions={({ route }) => ({
            headerShown: false,
            tabBarIcon: ({ focused, color, size }) => {
                if (route.name === "Home") return <HomeIcon size={size} color={color} />;
                else if (route.name === "Calendar") return <Calendar1Icon size={size} color={color} />;
                else if (route.name === "Bhajan") return <Music4Icon size={size} color={color} />;
                else if (route.name === "Books") return <BookTextIcon size={size} color={color} />;
                else if (route.name === "Settings") return <SettingsIcon size={size} color={color} />;
            },
            tabBarActiveTintColor: "#446785",
            tabBarInactiveTintColor: "#999999",
            tabBarStyle: {
                borderTopColor: "#E0E0E0",
                backgroundColor: "#FFFFFF",
                paddingBottom: 8,
                paddingTop: 4,
                height: 70,
            },
        })}
    >
        <Tab.Screen
            name="Home"
            component={HomeStack}
            options={{
                tabBarLabel: "Home",
            }}
        />
        <Tab.Screen
            name="Calendar"
            component={CalendarScreen}
            options={{
                tabBarLabel: "Calendar",
            }}
        />
        <Tab.Screen
            name="Bhajan"
            component={BhajanStack}
            options={{
                tabBarLabel: "Bhajan",
            }}
        />
        <Tab.Screen
            name="Books"
            component={BooksStack}
            options={{
                tabBarLabel: "Books",
            }}
        />
        <Tab.Screen
            name="Settings"
            component={SettingsStack}
            options={{
                tabBarLabel: "Settings",
            }}
        />
    </Tab.Navigator>
);

export const RootNavigator = ({ user }) => {
    return <NavigationContainer>{user && user.id ? <AppStack /> : <AuthStack />}</NavigationContainer>;
};
