import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Text,
    Animated,
    Dimensions,
    Image,
    KeyboardAvoidingView,
    Platform,
    Keyboard,
    Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const flyingItems = [
    '👕', '🎮', '☂️', '🧦', '👜', '📱', '🎧', '👟',
    '👓', '🧥', '💼', '📚', '🖥️', '💻', '⌚', '📷',
    '🎒', '🎩', '💄', '💍', '🎿', '🏀', '⚽', '🏆',
    '🥾', '👗', '🕶️', '👠', '🧣', '🧢', '📀', '🎸',
    '🎺', '🎻', '🏓', '🏹', '🚲', '🛴', '🚗', '🛵'
];

export default function SignupScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [contactNumber, setContactNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);
    const router = useRouter();

    const animatedValues = useRef(flyingItems.map(() => new Animated.Value(0))).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(height)).current;

    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener(
            'keyboardDidShow',
            () => setKeyboardVisible(true)
        );
        const keyboardDidHideListener = Keyboard.addListener(
            'keyboardDidHide',
            () => setKeyboardVisible(false)
        );

        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
            }),
            Animated.spring(slideAnim, {
                toValue: 0,
                tension: 20,
                friction: 7,
                useNativeDriver: true,
            }),
        ]).start();

        return () => {
            keyboardDidShowListener.remove();
            keyboardDidHideListener.remove();
        };
    }, []);

    useEffect(() => {
        if (!isKeyboardVisible) {
            const animations = animatedValues.map((value) =>
                Animated.loop(
                    Animated.timing(value, {
                        toValue: 1,
                        duration: 10000 + Math.random() * 15000,
                        delay: Math.random() * 1000,
                        useNativeDriver: true,
                    })
                )
            );
            Animated.stagger(500, animations).start();
        } else {
            animatedValues.forEach((value) => value.stopAnimation());
        }
    }, [isKeyboardVisible]);

    async function handleSignup() {
        if (password !== confirmPassword) {
            Alert.alert("Error", "Passwords do not match");
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${process.env.EXPO_PUBLIC_APP_SCHEME}://confirm-email`
                }
            });

            if (error) throw error;

            if (data.user) {
                // Insert the user into the users table with a pending status
                const { error: insertError } = await supabase
                    .from('users')
                    .insert({
                        id: data.user.id,
                        email: data.user.email,
                        status: 'pending',
                        created_at: new Date().toISOString()
                    });

                if (insertError) throw insertError;

                // Redirect to the email confirmation page
                router.replace('/confirm-email');
            }
        } catch (error) {
            console.error('Signup error:', error);
            let errorMessage = 'An unexpected error occurred';
            if (error instanceof Error) {
                errorMessage = error.message;
            }
            Alert.alert("Error", errorMessage);
        } finally {
            setLoading(false);
        }
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <LinearGradient
                colors={['#4c669f', '#3b5998', '#192f6a']}
                style={StyleSheet.absoluteFillObject}
            />

            <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                <Image source={require('../../assets/3roudat-logo.png')} style={styles.logo} />

                {!isKeyboardVisible && flyingItems.map((item, index) => {
                    const startX = Math.random() * width;
                    const startY = Math.random() * height;
                    const endX = Math.random() * width;
                    const endY = Math.random() * height;

                    return (
                        <Animated.Text
                            key={index}
                            style={[
                                styles.flyingItem,
                                {
                                    transform: [
                                        {
                                            translateX: animatedValues[index].interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [startX, endX],
                                            }),
                                        },
                                        {
                                            translateY: animatedValues[index].interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [startY, endY],
                                            }),
                                        },
                                        {
                                            rotate: animatedValues[index].interpolate({
                                                inputRange: [0, 1],
                                                outputRange: ['0deg', `${Math.random() * 360}deg`],
                                            }),
                                        },
                                        {
                                            scale: animatedValues[index].interpolate({
                                                inputRange: [0, 0.5, 1],
                                                outputRange: [0.8, 1.2, 0.8],
                                            }),
                                        },
                                    ],
                                    opacity: animatedValues[index].interpolate({
                                        inputRange: [0, 0.2, 0.8, 1],
                                        outputRange: [0, 1, 1, 0],
                                    }),
                                },
                            ]}
                        >
                            {item}
                        </Animated.Text>
                    );
                })}

                <View style={styles.formContainer}>
                    <Text style={styles.title}>Create Account</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Email"
                        placeholderTextColor="#A0A0A0"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Password"
                        placeholderTextColor="#A0A0A0"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Confirm Password"
                        placeholderTextColor="#A0A0A0"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Contact Number"
                        placeholderTextColor="#A0A0A0"
                        value={contactNumber}
                        onChangeText={setContactNumber}
                        keyboardType="phone-pad"
                    />
                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleSignup}
                        disabled={loading}
                    >
                        <Text style={styles.buttonText}>{loading ? 'Signing up...' : 'Sign Up'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => router.push('/login')}>
                        <Text style={styles.link}>Already have an account? Log in</Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logo: {
        width: 150,
        height: 150,
        resizeMode: 'contain',
        marginBottom: 20,
    },
    formContainer: {
        width: '80%',
        padding: 20,
        borderRadius: 15,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 20,
        textAlign: 'center',
    },
    input: {
        height: 50,
        borderColor: '#DDD',
        borderWidth: 1,
        marginBottom: 15,
        padding: 15,
        borderRadius: 10,
        backgroundColor: '#F8F8F8',
        color: '#333',
    },
    button: {
        backgroundColor: '#4c669f',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    buttonDisabled: {
        backgroundColor: '#A0A0A0',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    link: {
        color: '#4c669f',
        marginTop: 15,
        textAlign: 'center',
        textDecorationLine: 'underline',
    },
    flyingItem: {
        position: 'absolute',
        fontSize: 30,
        zIndex: 0,
    },
});