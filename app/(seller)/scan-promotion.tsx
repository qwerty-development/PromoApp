import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, Alert, TouchableOpacity, View, Dimensions, Modal } from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useAuth } from '@/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { ActivityIndicator } from 'react-native';

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
  seller_id: string;
  unique_code: string;
}

export default function ScanPromotionScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [scannedPromotion, setScannedPromotion] = useState<Promotion | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();
  const cooldownRef = useRef<NodeJS.Timeout | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };

    getCameraPermissions();
    
    return () => {
      if (cooldownRef.current) {
        clearTimeout(cooldownRef.current);
      }
    };
  }, []);

  const handleBarcodeScanned = useCallback(async (result: { type: string, data: string }) => {
    if (!isScanning || !user || isProcessing) return;

    const { data } = result;
    setIsProcessing(true);
    setIsScanning(false);

    try {
      if (!data || typeof data !== 'string') {
        throw new Error('Invalid QR code format');
      }

      const { data: promotionData, error: promotionError } = await supabase
        .from('promotions')
        .select('*')
        .eq('unique_code', data)
        .single();

      if (promotionError) {
        throw new Error('Invalid Promotion: This QR code does not match any active promotion.');
      }

      if (!promotionData) {
        throw new Error('Promotion not found');
      }

      if (promotionData.seller_id !== user.id) {
        throw new Error('Unauthorized: You are not the seller of this promotion.');
      }

      if (promotionData.quantity <= promotionData.used_quantity) {
        throw new Error('This promotion has reached its usage limit.');
      }

      const { data: result, error: processError } = await supabase
        .rpc('process_promotion_scan', {
          p_promotion_id: promotionData.id,
          p_seller_id: user.id
        });

      if (processError || !result?.success) {
        throw new Error(result?.message || 'Failed to process the promotion.');
      }

      setScannedPromotion(promotionData);
      setModalVisible(true);
      Alert.alert('Success', 'Promotion scanned successfully!');

    } catch (error) {
      console.error('Error processing QR code:', error);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to process QR code. Please try again.'
      );
    } finally {
      setIsProcessing(false);
      cooldownRef.current = setTimeout(() => setIsScanning(true), 3000);
    }
  }, [isScanning, user, isProcessing]);

  if (hasPermission === null) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#4a90e2" />
        <ThemedText style={styles.loadingText}>Requesting camera permission...</ThemedText>
      </ThemedView>
    );
  }

  if (hasPermission === false) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <Ionicons name="camera-outline" size={50} color="#4a90e2" />
        <ThemedText style={styles.permissionText}>
          We need camera access to scan QR codes
        </ThemedText>
        <TouchableOpacity 
          style={styles.permissionButton} 
          onPress={() => Camera.requestCameraPermissionsAsync()}
        >
          <ThemedText style={styles.permissionButtonText}>
            Grant Camera Permission
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        onBarcodeScanned={isScanning && !isProcessing ? handleBarcodeScanned : undefined}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
      >
        <View style={styles.overlay}>
          <View style={styles.unfocusedContainer} />
          <View style={styles.middleContainer}>
            <View style={styles.unfocusedContainer} />
            <View style={styles.focusedContainer}>
              <Ionicons name="scan-outline" size={qrSize * 0.8} color="white" />
              {isProcessing && (
                <View style={styles.processingOverlay}>
                  <ActivityIndicator size="large" color="#4a90e2" />
                  <ThemedText style={styles.processingText}>
                    Processing...
                  </ThemedText>
                </View>
              )}
            </View>
            <View style={styles.unfocusedContainer} />
          </View>
          <View style={styles.unfocusedContainer} />
        </View>
      </CameraView>
      
      <View style={styles.bottomTextContainer}>
        <ThemedText style={styles.bottomText}>
          {isProcessing 
            ? 'Processing QR code...' 
            : 'Align QR code within the frame'}
        </ThemedText>
      </View>

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
                <View style={styles.successBadge}>
                  <Ionicons name="checkmark-circle" size={30} color="#4CAF50" />
                  <ThemedText style={styles.successText}>
                    Promotion Scanned!
                  </ThemedText>
                </View>

                <Image
                  source={{ uri: scannedPromotion.banner_url }}
                  style={styles.banner}
                  contentFit="cover"
                  transition={200}
                />

                <ThemedText style={styles.title}>
                  {scannedPromotion.title}
                </ThemedText>

                <ThemedText style={styles.description}>
                  {scannedPromotion.description}
                </ThemedText>

                <View style={styles.statsContainer}>
                  <View style={styles.statItem}>
                    <ThemedText style={styles.statLabel}>Price</ThemedText>
                    <ThemedText style={styles.statValue}>
                      ${scannedPromotion.promotional_price.toFixed(2)}
                    </ThemedText>
                  </View>

                  <View style={styles.statItem}>
                    <ThemedText style={styles.statLabel}>Remaining</ThemedText>
                    <ThemedText style={styles.statValue}>
                      {scannedPromotion.quantity - scannedPromotion.used_quantity} / {scannedPromotion.quantity}
                    </ThemedText>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => {
                    setModalVisible(false);
                    setIsScanning(true);
                  }}
                >
                  <ThemedText style={styles.closeButtonText}>Close</ThemedText>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  permissionText: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  permissionButton: {
    backgroundColor: '#4a90e2',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
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
    color: '#fff',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    margin: 20,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
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
    maxHeight: '80%',
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    marginBottom: 15,
  },
  successText: {
    color: '#4CAF50',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  banner: {
    width: '100%',
    height: 150,
    borderRadius: 10,
    marginBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    marginBottom: 15,
    textAlign: 'center',
    color: '#666',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4a90e2',
  },
  closeButton: {
    backgroundColor: '#f44336',
    borderRadius: 10,
    padding: 15,
    elevation: 2,
    width: '100%',
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },
});