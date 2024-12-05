import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, Alert, TouchableOpacity, View, Dimensions, Modal } from 'react-native';
import { RNCamera } from 'react-native-camera';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useAuth } from '@/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

const { width } = Dimensions.get('window');
const qrSize = width * 0.7;

interface Promotion {
  id: string;
  title: string;
  description: string;
  banner_url: string;
  promotional_price: number;
  quantity: number;
  used_quantity: number;
}

export default function ScanPromotionScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [scannedPromotion, setScannedPromotion] = useState<Promotion | null>(null);
  const router = useRouter();
  const cooldownRef = useRef<NodeJS.Timeout | null>(null);
  const cameraRef = useRef<RNCamera | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    // Permission is handled by RNCamera component itself
    return () => {
      if (cooldownRef.current) {
        clearTimeout(cooldownRef.current);
      }
    };
  }, []);

  const handleBarCodeRead = useCallback(async ({ data }: { data: string }) => {
    if (!isScanning || !user) return;

    setIsScanning(false);
    try {
      console.log('Scanned QR code:', data);
      console.log('Current seller ID:', user.id);

      const { data: promotionData, error: promotionError } = await supabase
        .from('promotions')
        .select('*')
        .eq('unique_code', data)
        .single();

      if (promotionError) {
        console.error('Error fetching promotion:', promotionError);
        throw new Error('Invalid Promotion: This QR code does not match any active promotion.');
      }

      console.log('Fetched promotion:', promotionData);

      if (promotionData.seller_id !== user.id) {
        throw new Error('Unauthorized: You are not the seller of this promotion.');
      }

      const { data: result, error } = await supabase
        .rpc('process_promotion_scan', {
          p_promotion_id: promotionData.id,
          p_seller_id: user.id
        });

      if (error) {
        console.error('Error calling process_promotion_scan:', error);
        throw error;
      }

      console.log('process_promotion_scan result:', JSON.stringify(result, null, 2));

      if (!result.success) {
        throw new Error(result.message || 'Failed to process the promotion.');
      }

      setScannedPromotion(promotionData);
      setModalVisible(true);
      Alert.alert('Success', result.message);
    } catch (error) {
      console.error('Error processing QR code:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to process QR code. Please try again.');
    } finally {
      cooldownRef.current = setTimeout(() => setIsScanning(true), 3000);
    }
  }, [isScanning, user]);

  const handleClaimPromotion = useCallback(async () => {
    if (!scannedPromotion || !user) {
      Alert.alert('Error', 'Unable to claim promotion at this time.');
      return;
    }

    try {
      const { data: existingClaim, error: checkError } = await supabase
        .from('claimed_promotions')
        .select('*')
        .eq('promotion_id', scannedPromotion.id)
        .eq('user_id', user.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing claim:', checkError);
        throw new Error('Failed to check existing claim');
      }

      if (existingClaim) {
        Alert.alert('Info', 'You have already claimed this promotion');
        return;
      }

      if (scannedPromotion.used_quantity >= scannedPromotion.quantity) {
        Alert.alert('Error', 'This promotion has been fully claimed');
        return;
      }

      const { data: newClaim, error: claimError } = await supabase
        .from('claimed_promotions')
        .insert({
          promotion_id: scannedPromotion.id,
          user_id: user.id,
          scanned: false,
          claimed_at: new Date().toISOString()
        })
        .single();

      if (claimError) {
        console.error('Error claiming promotion:', claimError);
        throw new Error('Failed to claim promotion');
      }

      console.log('Promotion claimed successfully:', newClaim);
      Alert.alert('Success', 'Promotion claimed successfully');
      setModalVisible(false);
    } catch (error) {
      console.error('Error in handleClaimPromotion:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'An unknown error occurred');
    }
  }, [scannedPromotion, user]);

  return (
    <ThemedView style={styles.container}>
      <RNCamera
        ref={cameraRef}
        style={StyleSheet.absoluteFillObject}
        type={RNCamera.Constants.Type.back}
        onBarCodeRead={isScanning ? handleBarCodeRead : undefined}
        barCodeTypes={[RNCamera.Constants.BarCodeType.qr]}
        captureAudio={false}
        androidCameraPermissionOptions={{
          title: 'Permission to use camera',
          message: 'We need your permission to use your camera',
          buttonPositive: 'Ok',
          buttonNegative: 'Cancel',
        }}
      >
        <View style={styles.overlay}>
          <View style={styles.unfocusedContainer} />
          <View style={styles.middleContainer}>
            <View style={styles.unfocusedContainer} />
            <View style={styles.focusedContainer}>
              <Ionicons name="scan-outline" size={qrSize} color="white" />
            </View>
            <View style={styles.unfocusedContainer} />
          </View>
          <View style={styles.unfocusedContainer} />
        </View>
      </RNCamera>
      
      <View style={styles.bottomTextContainer}>
        <ThemedText style={styles.bottomText}>Align QR code within the frame</ThemedText>
      </View>

      {!isScanning && (
        <TouchableOpacity
          style={styles.button}
          onPress={() => setIsScanning(true)}
          disabled={isScanning}
        >
          <ThemedText style={styles.buttonText}>
            {isScanning ? 'Scanning...' : 'Tap to Scan Again'}
          </ThemedText>
        </TouchableOpacity>
      )}

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(false);
          setIsScanning(true);
        }}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            {scannedPromotion && (
              <>
                <ThemedText style={styles.claimedText}>
                  Promotion successfully claimed!
                </ThemedText>
                <Image
                  source={{ uri: scannedPromotion.banner_url }}
                  style={styles.banner}
                  contentFit="cover"
                />
                <ThemedText style={styles.title}>{scannedPromotion.title}</ThemedText>
                <ThemedText style={styles.description}>{scannedPromotion.description}</ThemedText>
                <ThemedText style={styles.price}>
                  Price: ${scannedPromotion.promotional_price.toFixed(2)}
                </ThemedText>
                <ThemedText style={styles.quantity}>
                  Promotion Left: {scannedPromotion.quantity - scannedPromotion.used_quantity - 1} / {scannedPromotion.quantity}
                </ThemedText>
              </>
            )}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                setModalVisible(false);
                setIsScanning(true);
              }}
            >
              <ThemedText style={styles.closeButtonText}>Close</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  claimedText: {
    fontSize: 25,
    textAlign: 'center',
    fontWeight: '700',
    borderColor: 'green',
    borderWidth: 3,
    margin: 10,
    padding: 10,
    marginTop: 2,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  unfocusedContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  middleContainer: {
    flexDirection: 'row',
    height: qrSize,
  },
  focusedContainer: {
    width: qrSize,
    height: qrSize,
    borderWidth: 2,
    borderColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomTextContainer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  bottomText: {
    fontSize: 18,
    color: 'white',
    textAlign: 'center',
  },
  button: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 15,
    borderRadius: 10,
    margin: 20,
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '90%',
  },
  banner: {
    width: '100%',
    height: 150,
    borderRadius: 10,
    marginBottom: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    marginBottom: 15,
    textAlign: 'center',
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  quantity: {
    fontSize: 16,
    marginBottom: 20,
  },
  claimButton: {
    backgroundColor: '#2196F3',
    borderRadius: 20,
    padding: 10,
    elevation: 2,
    marginBottom: 15,
  },
  claimButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  closeButton: {
    backgroundColor: '#FF0000',
    borderRadius: 20,
    padding: 10,
    elevation: 2,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});