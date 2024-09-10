import React from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';

interface PromotionModalProps {
  visible: boolean;
  promotion: any; // Replace 'any' with a proper type for your promotion object
  onClose: () => void;
  onClaim: () => void;
}

export default function PromotionModal({ visible, promotion, onClose, onClaim }: PromotionModalProps) {
  if (!promotion) return null;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <ThemedView style={styles.modalView}>
          <Image
            source={{ uri: promotion.banner_url }}
            style={styles.banner}
            resizeMode="cover"
          />
          <ThemedText style={styles.title}>{promotion.title}</ThemedText>
          <ThemedText style={styles.description}>{promotion.description}</ThemedText>
          
          <View style={styles.infoContainer}>
            <ThemedText style={styles.infoLabel}>Price:</ThemedText>
            <ThemedText style={styles.promotionalPrice}>
              ${promotion.promotional_price.toFixed(2)}
            </ThemedText>
          </View>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={[styles.button, styles.claimButton]} onPress={onClaim}>
              <ThemedText style={styles.buttonText}>Claim Promotion</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.closeButton]} onPress={onClose}>
              <ThemedText style={styles.buttonText}>Close</ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  infoLabel: {
    fontWeight: 'bold',
  },
  promotionalPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.primary,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  button: {
    borderRadius: 20,
    padding: 10,
    elevation: 2,
    minWidth: 100,
  },
  claimButton: {
    backgroundColor: Colors.light.primary,
  },
  closeButton: {
    backgroundColor: Colors.light.text,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});