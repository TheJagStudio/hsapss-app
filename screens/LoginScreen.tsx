import React, { useState, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, ImageBackground } from "react-native";
import Svg, { Path } from 'react-native-svg';
import { useAtom } from "jotai";
import { userAtom } from "../state/atoms";
import AsyncStorage from '@react-native-async-storage/async-storage';
import Loading from '../components/Loading';
import { API_BASE_URL } from '../utils/api';
import Recaptcha, { RecaptchaRef } from 'react-native-recaptcha-that-works';

const LoginScreen = ({ navigation }: { navigation: any }) => {
    const [, setUser] = useAtom(userAtom);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const recaptchaRef = useRef<RecaptchaRef>(null);

    const handleLogin = async (captchaToken: string) => {
        setLoading(true);
        setError("");

        try {
            const formData = new FormData();
            formData.append("username", email);
            formData.append("password", password);
            formData.append("captcha_response", captchaToken);
            console.log(API_BASE_URL)
            const response = await fetch(`${API_BASE_URL}/api/login/`, {
                method: "POST",
                body: formData,
            });

            const data = await response.json();

            if (data?.status === "success") {
                await AsyncStorage.setItem('hsapss_user_data', JSON.stringify(data?.user));
                await AsyncStorage.setItem('hsapss_tokens', JSON.stringify(data?.tokens));
                
                setUser(data?.user);
                // Navigation is handled automatically by RootNavigator when user state changes
            } else {
                setError(data?.error || "Login failed");
            }
        } catch (err) {
            setError("An unexpected error occurred. Please try again later.");
            console.error("Error:", err);
        } finally {
            setLoading(false);
        }
    };

    const onRecaptchaVerify = (token: string) => {
        handleLogin(token);
    };

    return (
        <View className="flex-1 items-center justify-center bg-background">
            <ImageBackground source={require("../assets/images/backgroundLight.png")} style={{ width: "100%", height: "100%", justifyContent: "center", alignItems: "center" }} resizeMode="repeat">
                {loading && <Loading />}
                <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 16 }} className="w-full">
                    <View className="bg-white rounded-lg shadow p-8 w-full max-w-sm relative" style={{ opacity: 1 }}>
                        <Text className="text-4xl text-primary-700 mb-6 font-hsapss">Login</Text>

                        {/* Email Input */}
                        <View className="mb-4">
                            <Text className="text-primary-800 font-bold text-sm mb-2">Email</Text>
                            <TextInput className="border border-primary-300 rounded-lg px-3 py-2 text-primary-800 bg-white" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 }} placeholder="hari@gmail.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" editable={!loading} />
                        </View>

                        {/* Password Input */}
                        <View className="mb-3 relative">
                            <Text className="text-primary-800 font-bold text-sm mb-2">Password</Text>
                            <View className="border border-primary-300 rounded-lg bg-white relative" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 }}>
                                <TextInput className="px-3 py-2 pr-12 text-primary-800" placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} editable={!loading} />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: 5, top: 0 }} className="py-1 px-2 rounded-lg">
                                    {!showPassword ? (
                                        <Svg width={24} height={24} viewBox="0 -0.48 16.32 16.32">
                                            <Path fill="#5780a0" d="m3.24 1.8 10.8 10.8-.96.96-2.22-2.22q-1.23.66-2.7.66-1.92 0-3.54-1.17-1.65-1.17-2.7-3.15.45-.81 1.14-1.62.66-.84 1.26-1.26L2.28 2.76zm7.8 5.88q0-1.2-.84-2.04T8.16 4.8L6.87 3.51q.75-.15 1.29-.15 1.95 0 3.6 1.2 1.62 1.2 2.64 3.12-.18.39-.57.96t-.81 1.02zm-2.88 2.88q.81 0 1.5-.42l-.87-.87q-.3.09-.63.09-.69 0-1.17-.48-.51-.51-.51-1.2 0-.27.12-.6l-.9-.9q-.42.69-.42 1.5 0 1.2.84 2.04t2.04.84" />
                                        </Svg>
                                    ) : (
                                        <Svg height={24} width={24} viewBox="0 0 1.26 1.26">
                                            <Path fill="#5780a0" d="M.459.603c0 .093.078.171.171.171S.801.696.801.603.723.432.63.432.459.51.459.603m.243.369C.903.927 1.215.66 1.215.66S.984.3.675.261C.657.258.597.258.585.258c-.3.03-.54.411-.54.411s.261.258.51.297a.4.4 0 0 0 .147.006M.333.621C.333.465.465.339.63.339s.297.126.297.282S.795.9.63.9.333.774.333.621" />
                                        </Svg>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Error Message */}
                        {error ? <Text className="text-red-500 text-sm mt-2">{error}</Text> : null}

                        {/* Sign Up Link */}
                        <TouchableOpacity onPress={() => navigation.navigate("Register")} className="pb-1 items-end">
                            <Text className="text-primary-800 text-sm" style={{ opacity: 0.8 }}>
                                Don't have a account?
                            </Text>
                        </TouchableOpacity>

                        {/* Sign In Button */}
                        <TouchableOpacity onPress={() => recaptchaRef.current?.open()} disabled={loading} className="bg-primary-500 hover:bg-primary-700 text-white font-bold py-2 px-4 w-32 rounded-lg focus:outline-none focus:shadow-outline">
                            <Text className="text-white font-bold text-center">Sign In</Text>
                        </TouchableOpacity>

                        {/* reCAPTCHA */}
                        <Recaptcha ref={recaptchaRef} siteKey={process.env.EXPO_PUBLIC_RECAPTCHA_SITE_KEY || ""} baseUrl={"http://localhost:5173"} onVerify={onRecaptchaVerify} onExpire={() => setError("reCAPTCHA expired. Please try again.")} onError={() => setError("reCAPTCHA error. Please try again.")} size="invisible" />
                    </View>
                </ScrollView>
            </ImageBackground>
        </View>
    );
};

export default LoginScreen;
