import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export default function NotificationManager() {
  const [expoPushToken] = useState<string>("ExponentPushToken[yFti8vPtWE2EaO1XqpWpaq]");
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      savePushTokenToDatabase(expoPushToken);
    }
  }, [user]);

  async function savePushTokenToDatabase(token: string) {
    if (!user) return;

    const { error } = await supabase
      .from('users')
      .update({ push_token: token })
      .eq('id', user.id);

    if (error) {
      console.error('Error saving push token:', error);
      Alert.alert('Error', 'Failed to save notification settings');
    } else {
      console.log('Push token saved successfully');
    }
  }

  async function sendTestNotification() {
    const message = {
      to: expoPushToken,
      sound: 'default',
      title: 'Test Notification',
      body: 'This is a test notification from your app!',
      data: { someData: 'goes here' },
    };

    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const responseData = await response.json();
      console.log('Test notification sent successfully', responseData);
      Alert.alert('Success', 'Test notification sent. You should receive it shortly.');
    } catch (error) {
      console.error('Error sending test notification:', error);
      Alert.alert('Error', 'Failed to send test notification');
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notification Manager</Text>
      <Text style={styles.tokenText}>Push Token: {expoPushToken}</Text>
      <TouchableOpacity style={styles.button} onPress={sendTestNotification}>
        <Text style={styles.buttonText}>Send Test Notification</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    margin: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  tokenText: {
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
  },
});