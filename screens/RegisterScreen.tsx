import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, ImageBackground, Alert } from "react-native";
import Svg, { Path } from "react-native-svg";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../utils/api";
import { Picker } from "@react-native-picker/picker";

interface FormData {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phoneNumber?: string;
    region?: string;
    birthday?: string;
    streetName?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
}

const RegisterScreen = ({ navigation }: { navigation: any }) => {
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState<FormData>({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
    });
    const [errors, setErrors] = useState<any>({});
    const [showPassword, setShowPassword] = useState(false);
    const [regionList, setRegionList] = useState<string[]>([]);

    // Load saved data from AsyncStorage
    useEffect(() => {
        loadFormData();
        fetchRegions();
    }, []);

    const loadFormData = async () => {
        try {
            const firstName = (await AsyncStorage.getItem("reg_firstName")) || "";
            const lastName = (await AsyncStorage.getItem("reg_lastName")) || "";
            const email = (await AsyncStorage.getItem("reg_email")) || "";
            const password = (await AsyncStorage.getItem("reg_password")) || "";
            const phoneNumber = (await AsyncStorage.getItem("reg_phoneNumber")) || "";
            const region = (await AsyncStorage.getItem("reg_region")) || "";
            const birthday = (await AsyncStorage.getItem("reg_birthday")) || "";
            const streetName = (await AsyncStorage.getItem("reg_streetName")) || "";
            const city = (await AsyncStorage.getItem("reg_city")) || "";
            const state = (await AsyncStorage.getItem("reg_state")) || "";
            const pincode = (await AsyncStorage.getItem("reg_pincode")) || "";
            const country = (await AsyncStorage.getItem("reg_country")) || "";

            setFormData({
                firstName,
                lastName,
                email,
                password,
                phoneNumber,
                region,
                birthday,
                streetName,
                city,
                state,
                pincode,
                country,
            });
        } catch (error) {
            console.error("Error loading form data:", error);
        }
    };

    const fetchRegions = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/regions/`);
            const data = await response.json();
            if (data?.regions) {
                setRegionList(data.regions);
            }
        } catch (error) {
            console.error("Error fetching regions:", error);
        }
    };

    // Save data to AsyncStorage
    const saveFormData = async (key: string, value: string) => {
        try {
            await AsyncStorage.setItem(`reg_${key}`, value);
        } catch (error) {
            console.error("Error saving form data:", error);
        }
    };

    const validateStep1 = () => {
        const newErrors: any = {};
        if (!formData.firstName.trim()) {
            newErrors.firstName = "First name is required";
        } else if (!/^[a-zA-Z]+$/.test(formData.firstName)) {
            newErrors.firstName = "First name must contain only letters";
        }
        if (!formData.lastName.trim()) {
            newErrors.lastName = "Last name is required";
        } else if (!/^[a-zA-Z]+$/.test(formData.lastName)) {
            newErrors.lastName = "Last name must contain only letters";
        }
        if (!formData.email.trim()) {
            newErrors.email = "Email is required";
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = "Invalid email format";
        }
        if (!formData.password.trim()) {
            newErrors.password = "Password is required";
        } else if (formData.password.length < 6) {
            newErrors.password = "Password must be at least 6 characters long";
        } else if (!/\d/.test(formData.password) || !/[a-zA-Z]/.test(formData.password)) {
            newErrors.password = "Password must contain at least one number and one letter";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validateStep2 = () => {
        const newErrors: any = {};
        if (!formData.phoneNumber?.trim()) {
            newErrors.phoneNumber = "Phone number is required";
        } else if (!/^\d{10}$/.test(formData.phoneNumber)) {
            newErrors.phoneNumber = "Invalid phone number format (must be 10 digits)";
        }
        if (!formData.region?.trim()) {
            newErrors.region = "Region is required";
        }
        if (!formData.birthday?.trim()) {
            newErrors.birthday = "Birthday is required";
        }
        if (!formData.streetName?.trim()) {
            newErrors.streetName = "Street name is required";
        }
        if (!formData.city?.trim()) {
            newErrors.city = "City is required";
        }
        if (!formData.state?.trim()) {
            newErrors.state = "State is required";
        }
        if (!formData.pincode?.trim()) {
            newErrors.pincode = "Pincode is required";
        }
        if (!formData.country?.trim()) {
            newErrors.country = "Country is required";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (validateStep1()) {
            setCurrentStep(2);
        }
    };

    const handleBack = () => {
        setCurrentStep(1);
    };

    const handleRegister = async () => {
        if (!validateStep2()) return;

        try {
            const registrationData = new FormData();
            registrationData.append("first_name", formData.firstName);
            registrationData.append("last_name", formData.lastName);
            registrationData.append("email", formData.email);
            registrationData.append("password", formData.password);
            registrationData.append("phone", formData.phoneNumber || "");
            registrationData.append("region", formData.region || "");
            registrationData.append("birth_date", formData.birthday || "");
            registrationData.append("street_name", formData.streetName || "");
            registrationData.append("city", formData.city || "");
            registrationData.append("state", formData.state || "");
            registrationData.append("pincode", formData.pincode || "");
            registrationData.append("country", formData.country || "");

            const response = await fetch(`${API_BASE_URL}/api/register/`, {
                method: "POST",
                body: registrationData,
            });

            const data = await response.json();

            if (data?.status === "success") {
                // Clear AsyncStorage
                const keys = Object.keys(formData);
                for (const key of keys) {
                    await AsyncStorage.removeItem(`reg_${key}`);
                }

                Alert.alert("Success", "Registration successful! Please login.");
                navigation.navigate("Login");
            } else {
                Alert.alert("Error", data?.error || "Registration failed");
            }
        } catch (error) {
            console.error("Error:", error);
            Alert.alert("Error", "An unexpected error occurred. Please try again later.");
        }
    };

    const updateFormData = (key: string, value: string) => {
        setFormData({ ...formData, [key]: value });
        saveFormData(key, value);
    };

    if (currentStep === 1) {
        return (
            <View className="flex-1 items-center justify-center">
                <ImageBackground source={require("../assets/images/backgroundLight.png")} style={{ width: "100%", height: "100%", justifyContent: "center", alignItems: "center" }} resizeMode="repeat">
                    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 16 }} className="w-full">
                        <View className="bg-white p-8 rounded-xl shadow-xl w-full max-w-sm">
                            <Text className="text-4xl text-primary-700 mb-6">Register - Step 1</Text>

                            <View className="mb-4">
                                <Text className="text-primary-800 font-bold text-sm mb-2">First Name</Text>
                                <TextInput className={`border rounded-lg px-3 py-2 text-primary-800 ${errors.firstName ? "border-red-500" : ""}`} style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 }} placeholder="First Name" value={formData.firstName} onChangeText={(text) => updateFormData("firstName", text)} />
                                {errors.firstName && <Text className="text-red-500 text-xs mt-1">{errors.firstName}</Text>}
                            </View>

                            <View className="mb-4">
                                <Text className="text-primary-800 font-bold text-sm mb-2">Last Name</Text>
                                <TextInput className={`border rounded-lg px-3 py-2 text-primary-800 ${errors.lastName ? "border-red-500" : ""}`} style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 }} placeholder="Last Name" value={formData.lastName} onChangeText={(text) => updateFormData("lastName", text)} />
                                {errors.lastName && <Text className="text-red-500 text-xs mt-1">{errors.lastName}</Text>}
                            </View>

                            <View className="mb-4">
                                <Text className="text-primary-800 font-bold text-sm mb-2">Email</Text>
                                <TextInput className={`border rounded-lg px-3 py-2 text-primary-800 ${errors.email ? "border-red-500" : ""}`} style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 }} placeholder="Email" value={formData.email} onChangeText={(text) => updateFormData("email", text)} keyboardType="email-address" autoCapitalize="none" />
                                {errors.email && <Text className="text-red-500 text-xs mt-1">{errors.email}</Text>}
                            </View>

                            <View className="mb-4 relative">
                                <Text className="text-primary-800 font-bold text-sm mb-2">Password</Text>
                                <View className={`border rounded-lg relative ${errors.password ? "border-red-500" : ""}`} style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 }}>
                                    <TextInput className="px-3 py-2 pr-12 text-primary-800" placeholder="Password" value={formData.password} onChangeText={(text) => updateFormData("password", text)} secureTextEntry={!showPassword} />
                                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: 12, top: 10, opacity: 0.7 }}>
                                        {!showPassword ? (
                                            <Svg width={24} height={24} viewBox="0 -0.48 16.32 16.32">
                                                <Path fill="#6366f1" d="m3.24 1.8 10.8 10.8-.96.96-2.22-2.22q-1.23.66-2.7.66-1.92 0-3.54-1.17-1.65-1.17-2.7-3.15.45-.81 1.14-1.62.66-.84 1.26-1.26L2.28 2.76zm7.8 5.88q0-1.2-.84-2.04T8.16 4.8L6.87 3.51q.75-.15 1.29-.15 1.95 0 3.6 1.2 1.62 1.2 2.64 3.12-.18.39-.57.96t-.81 1.02zm-2.88 2.88q.81 0 1.5-.42l-.87-.87q-.3.09-.63.09-.69 0-1.17-.48-.51-.51-.51-1.2 0-.27.12-.6l-.9-.9q-.42.69-.42 1.5 0 1.2.84 2.04t2.04.84" />
                                            </Svg>
                                        ) : (
                                            <Svg height={24} width={24} viewBox="0 0 1.26 1.26">
                                                <Path fill="#6366f1" d="M.459.603c0 .093.078.171.171.171S.801.696.801.603.723.432.63.432.459.51.459.603m.243.369C.903.927 1.215.66 1.215.66S.984.3.675.261C.657.258.597.258.585.258c-.3.03-.54.411-.54.411s.261.258.51.297a.4.4 0 0 0 .147.006M.333.621C.333.465.465.339.63.339s.297.126.297.282S.795.9.63.9.333.774.333.621" />
                                            </Svg>
                                        )}
                                    </TouchableOpacity>
                                </View>
                                {errors.password && <Text className="text-red-500 text-xs mt-1">{errors.password}</Text>}
                            </View>

                            <TouchableOpacity onPress={() => navigation.navigate("Login")} className="pb-1 items-end">
                                <Text className="text-primary-800 text-sm" style={{ opacity: 0.8 }}>
                                    Already have a account?
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={handleNext} className="py-2 px-4 rounded-lg" style={{ backgroundColor: "#6366f1" }}>
                                <Text className="text-white font-bold text-center">Next</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </ImageBackground>
            </View>
        );
    }

    // Step 2
    return (
        <View className="flex-1 items-center justify-center">
            <ImageBackground source={require("../assets/images/backgroundLight.png")} style={{ width: "100%", height: "100%", justifyContent: "center", alignItems: "center" }} resizeMode="repeat">
                <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 16, paddingVertical: 32 }} className="w-full">
                    <View className="bg-white p-8 rounded-xl shadow-xl w-full max-w-sm">
                        <Text className="text-4xl text-primary-700 mb-6">Register - Step 2</Text>
                        <View className="mb-4">
                            <Text className="text-primary-800 font-bold text-sm mb-2">Phone Number</Text>
                            <TextInput className={`border rounded-lg px-3 py-2 text-primary-800 ${errors.phoneNumber ? "border-red-500" : ""}`} style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 }} placeholder="Phone Number" value={formData.phoneNumber} onChangeText={(text) => updateFormData("phoneNumber", text)} keyboardType="phone-pad" />
                            {errors.phoneNumber && <Text className="text-red-500 text-xs mt-1">{errors.phoneNumber}</Text>}
                        </View>
                        <View className="mb-4">
                            <Text className="text-primary-800 font-bold text-sm mb-2">Region</Text>
                            <View className={`border rounded-lg ${errors.region ? "border-red-500" : ""}`} style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 }}>
                                <Picker selectedValue={formData.region} onValueChange={(value: string) => updateFormData("region", value)} style={{ height: 40 }}>
                                    <Picker.Item label="Select Region" value="" />
                                    {regionList.map((region, index) => (
                                        <Picker.Item key={index} label={region} value={region} />
                                    ))}
                                </Picker>
                            </View>
                            {errors.region && <Text className="text-red-500 text-xs mt-1">{errors.region}</Text>}
                        </View>{" "}
                        <View className="mb-4">
                            <Text className="text-primary-800 font-bold text-sm mb-2">Birthday</Text>
                            <TextInput className={`border rounded-lg px-3 py-2 text-primary-800 ${errors.birthday ? "border-red-500" : ""}`} style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 }} placeholder="YYYY-MM-DD" value={formData.birthday} onChangeText={(text) => updateFormData("birthday", text)} />
                            {errors.birthday && <Text className="text-red-500 text-xs mt-1">{errors.birthday}</Text>}
                        </View>
                        <View className="mb-4">
                            <Text className="text-primary-800 font-bold text-sm mb-2">Street Name</Text>
                            <TextInput className={`border rounded-lg px-3 py-2 text-primary-800 ${errors.streetName ? "border-red-500" : ""}`} style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 }} placeholder="Street Name" value={formData.streetName} onChangeText={(text) => updateFormData("streetName", text)} />
                            {errors.streetName && <Text className="text-red-500 text-xs mt-1">{errors.streetName}</Text>}
                        </View>
                        <View className="mb-4 flex-row">
                            <View className="mr-2 flex-1">
                                <Text className="text-primary-800 font-bold text-sm mb-2">City</Text>
                                <TextInput className={`border rounded-lg px-3 py-2 text-primary-800 ${errors.city ? "border-red-500" : ""}`} style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 }} placeholder="City" value={formData.city} onChangeText={(text) => updateFormData("city", text)} />
                                {errors.city && <Text className="text-red-500 text-xs mt-1">{errors.city}</Text>}
                            </View>
                            <View className="flex-1">
                                <Text className="text-primary-800 font-bold text-sm mb-2">Pincode</Text>
                                <TextInput className={`border rounded-lg px-3 py-2 text-primary-800 ${errors.pincode ? "border-red-500" : ""}`} style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 }} placeholder="Pincode" value={formData.pincode} onChangeText={(text) => updateFormData("pincode", text)} keyboardType="number-pad" maxLength={6} />
                                {errors.pincode && <Text className="text-red-500 text-xs mt-1">{errors.pincode}</Text>}
                            </View>
                        </View>
                        <View className="mb-4 flex-row">
                            <View className="mr-2 flex-1">
                                <Text className="text-primary-800 font-bold text-sm mb-2">State</Text>
                                <TextInput className={`border rounded-lg px-3 py-2 text-primary-800 ${errors.state ? "border-red-500" : ""}`} style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 }} placeholder="State" value={formData.state} onChangeText={(text) => updateFormData("state", text)} />
                                {errors.state && <Text className="text-red-500 text-xs mt-1">{errors.state}</Text>}
                            </View>
                            <View className="flex-1">
                                <Text className="text-primary-800 font-bold text-sm mb-2">Country</Text>
                                <TextInput className={`border rounded-lg px-3 py-2 text-primary-800 ${errors.country ? "border-red-500" : ""}`} style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 }} placeholder="Country" value={formData.country} onChangeText={(text) => updateFormData("country", text)} />
                                {errors.country && <Text className="text-red-500 text-xs mt-1">{errors.country}</Text>}
                            </View>
                        </View>
                        <View className="flex-row gap-2">
                            <TouchableOpacity onPress={handleRegister} className="flex-1 py-2 px-4 rounded-lg mr-2" style={{ backgroundColor: "#6366f1" }}>
                                <Text className="text-white font-bold text-center">Register</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleBack} className="py-2 px-4 rounded-lg" style={{ backgroundColor: "#d1d5db" }}>
                                <Text className="text-white font-bold text-center">Back</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </ImageBackground>
        </View>
    );
};

export default RegisterScreen;
