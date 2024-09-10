import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, Alert, TouchableOpacity, View, Dimensions, Modal } from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
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
  id: number;
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
  const { user } = useAuth();

  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();

    return () => {
      if (cooldownRef.current) {
        clearTimeout(cooldownRef.current);
      }
    };
  }, []);

  const handleBarCodeScanned = useCallback(async ({ data }: { data: string }) => {
    if (!isScanning || !user) return;
    
    setIsScanning(false);
    try {
      const { data: promotionData, error: promotionError } = await supabase
        .from('promotions')
        .select('*')
        .eq('unique_code', data)
        .single();

      if (promotionError) {
        if (promotionError.code === 'PGRST116') {
          throw new Error('Invalid Promotion: This QR code does not match any active promotion.');
        }
        throw promotionError;
      }

      const { data: claimedData, error: claimedError } = await supabase
        .from('claimed_promotions')
        .select('*')
        .eq('promotion_id', promotionData.id)
        .eq('user_id', user.id)
        .single();

      if (claimedError && claimedError.code !== 'PGRST116') {
        throw claimedError;
      }

      if (claimedData?.scanned) {
        throw new Error('Already Scanned: This promotion has already been scanned and used.');
      }

      if (promotionData.used_quantity >= promotionData.quantity) {
        throw new Error('Promotion Exhausted: This promotion has reached its usage limit.');
      }

      setScannedPromotion(promotionData);
      setModalVisible(true);
    } catch (error) {
      console.error('Error processing QR code:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to process QR code. Please try again.');
    } finally {
      cooldownRef.current = setTimeout(() => setIsScanning(true), 3000);
    }
  }, [isScanning, user]);

  const handleClaimPromotion = async () => {
    if (!scannedPromotion || !user) return;

    try {
      const { error: claimError } = await supabase
        .from('claimed_promotions')
        .insert({
          promotion_id: scannedPromotion.id,
          user_id: user.id,
          scanned: true,
          claimed_at: new Date().toISOString()
        });

      if (claimError) throw claimError;

      await supabase
        .from('promotions')
        .update({ used_quantity: scannedPromotion.used_quantity + 1 })
        .eq('id', scannedPromotion.id);

      Alert.alert('Success', 'Promotion claimed successfully!');
      setModalVisible(false);
      router.push(`/promotion-detail/${scannedPromotion.id}`);
    } catch (error) {
      console.error('Error claiming promotion:', error);
      Alert.alert('Error', 'Failed to claim promotion. Please try again.');
    }
  };

  if (hasPermission === null) {
    return <ThemedText>Requesting camera permission</ThemedText>;
  }
  if (hasPermission === false) {
    return <ThemedText>No access to camera</ThemedText>;
  }

  return (
    <ThemedView style={styles.container}>
      <BarCodeScanner
        onBarCodeScanned={isScanning ? handleBarCodeScanned : undefined}
        style={StyleSheet.absoluteFillObject}
      />
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
                  Available: {scannedPromotion.quantity - scannedPromotion.used_quantity} / {scannedPromotion.quantity}
                </ThemedText>
                <TouchableOpacity style={styles.claimButton} onPress={handleClaimPromotion}>
                  <ThemedText style={styles.claimButtonText}>Claim Promotion</ThemedText>
                </TouchableOpacity>
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