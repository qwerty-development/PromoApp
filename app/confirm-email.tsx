import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';

export default function ConfirmEmailScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const { token, type, email } = useLocalSearchParams<{ token: string; type: string; email: string }>();

  useEffect(() => {
    if (token && type === 'signup' && email) {
      confirmEmail();
    }
  }, [token, type, email]);

  async function confirmEmail() {
    setLoading(true);
    setError(null);

    try {
      if (!token || !email) {
        throw new Error('Missing token or email');
      }

      const { error } = await supabase.auth.verifyOtp({
        token,
        type: 'signup',
        email,
      });

      if (error) throw error;

      // Get the user data after successful confirmation
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      if (user) {
        // Insert the user into the users table
        const { error: insertError } = await supabase
          .from('users')
          .insert({ 
            id: user.id, 
            email: user.email,
            created_at: new Date().toISOString()
          });
        
        if (insertError) throw insertError;
      }

      setSuccess(true);
      // Wait for 2 seconds before redirecting to allow the user to see the success message
      setTimeout(() => router.replace('/login'), 2000);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function handleResendEmail() {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.email) {
        throw new Error('User email not found. Please try signing up again.');
      }

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
      });
      if (error) throw error;
      alert('Confirmation email resent. Please check your inbox.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <Text style={styles.message}>Confirming your email...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error ? (
        <>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.button} onPress={handleResendEmail}>
            <Text style={styles.buttonText}>Resend confirmation email</Text>
          </TouchableOpacity>
        </>
      ) : success ? (
        <>
          <Text style={styles.title}>Email Successfully Confirmed!</Text>
          <Text style={styles.message}>You'll be redirected to the login page shortly.</Text>
        </>
      ) : (
        <>
          <Text style={styles.title}>Confirm Your Email</Text>
          <Text style={styles.message}>
            Email confirmation sent. Please check your inbox and click the confirmation link.
          </Text>
          <TouchableOpacity style={styles.button} onPress={handleResendEmail}>
            <Text style={styles.buttonText}>Resend confirmation email</Text>
          </TouchableOpacity>
        </>
      )}
      <TouchableOpacity style={styles.secondaryButton} onPress={() => router.replace('/login')}>
        <Text style={styles.secondaryButtonText}>Back to Login</Text>
      </TouchableOpacity>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.light.background,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: Colors.light.text,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: Colors.light.text,
  },
  errorText: {
    color: 'red',
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: Colors.light.primary,
    padding: 15,
    borderRadius: 5,
    marginBottom: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    padding: 15,
    borderRadius: 5,
  },
  secondaryButtonText: {
    color: Colors.light.primary,
    fontSize: 16,
  },
});