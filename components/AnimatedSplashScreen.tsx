import React, { useEffect, useRef } from 'react';
import { View, Image, Animated, Dimensions, StyleSheet } from 'react-native';

const { width, height } = Dimensions.get('window');

interface AnimatedSplashScreenProps {
  onAnimationComplete: () => void;
}

const AnimatedSplashScreen: React.FC<AnimatedSplashScreenProps> = ({ onAnimationComplete }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const fadeIn = Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 2000, // 2 seconds for fade in
      useNativeDriver: true,
    });

    const hold = Animated.delay(1000); // 1 second hold at full opacity

    const fadeOut = Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 2000, // 2 seconds for fade out
      useNativeDriver: true,
    });

    Animated.sequence([fadeIn, hold, fadeOut]).start(() => {
      onAnimationComplete();
    });
  }, [fadeAnim, onAnimationComplete]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logoContainer, { opacity: fadeAnim }]}>
        <Image
          source={require('../assets/logo/Full-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    width: width * 0.8, // 80% of screen width
    height: height * 0.8, // 80% of screen height
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
});

export default AnimatedSplashScreen;