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
} from 'react-native';
import { Link, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Colors } from '../../constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const flyingItems = [
  '👕', '🎮', '☂️', '🧦', '👜', '📱', '🎧', '👟',
  '👓', '🧥', '💼', '📚', '🖥️', '💻', '⌚', '📷',
  '🎒', '🎩', '💄', '💍', '🎿', '🏀', '⚽', '🏆',
  '🥾', '👗', '🕶️', '👠', '🧣', '🧢', '📀', '🎸',
  '🎺', '🎻', '🏓', '🏹', '🚲', '🛴', '🚗', '🛵'
];

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

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

  async function handleLogin() {
    setLoading(true);
    try {
      const { data: { user }, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      if (user) {
        let { data, error: roleError } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();

        if (roleError && roleError.code === 'PGRST116') {
          const { error: insertError } = await supabase
            .from('users')
            .insert({ id: user.id, email: user.email, role: 'user' });

          if (insertError) throw insertError;

          ({ data, error: roleError } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single());
        }

        if (roleError) throw roleError;

        if (data) {
          router.replace(data.role === 'user' ? '/(tabs)' : '/(seller)');
        } else {
          throw new Error('Failed to create or fetch user profile');
        }
      }
    } catch (error) {
      console.error('Error during login:', error);
      alert('An error occurred during login. Please try again.');
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
          <Text style={styles.title}>Welcome Back!</Text>
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
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Logging in...' : 'Login'}</Text>
          </TouchableOpacity>
          <Link href="/signup" asChild>
            <TouchableOpacity>
              <Text style={styles.link}>Don't have an account? Sign up</Text>
            </TouchableOpacity>
          </Link>
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