import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';

interface Industry {
    id: number;
    name: string;
}

export default function EditPromotionScreen() {
    const { id } = useLocalSearchParams();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [industryId, setIndustryId] = useState<number | null>(null);
    const [industries, setIndustries] = useState<Industry[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        fetchPromotionDetails();
        fetchIndustries();
    }, [id]);
    async function fetchPromotionDetails() {
        if (!id) return;

        const { data, error } = await supabase
            .from('promotions')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching promotion details:', error);
            Alert.alert('Error', 'Failed to fetch promotion details');
        } else if (data) {
            setTitle(data.title);
            setDescription(data.description);
            setStartDate(new Date(data.start_date));
            setEndDate(new Date(data.end_date));
            setIndustryId(data.industry_id);
        }

        setLoading(false);
    }

    async function fetchIndustries() {
        const { data, error } = await supabase
            .from('industries')
            .select('*');

        if (error) {
            console.error('Error fetching industries:', error);
        } else {
            setIndustries(data as Industry[]);
        }
    }


    async function handleUpdate() {
        if (!user) {
            Alert.alert('Error', 'You must be logged in to update a promotion');
            return;
        }

        setLoading(true);

        const { error } = await supabase
            .from('promotions')
            .update({
                title,
                description,
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
                industry_id: industryId,
            })
            .eq('id', id);

        setLoading(false);

        if (error) {
            console.error('Error updating promotion:', error);
            Alert.alert('Error', 'Failed to update promotion');
        } else {
            Alert.alert('Success', 'Promotion updated successfully');
            router.back();
        }
    }

    if (loading) {
        return (
            <View style={[styles.container, styles.centerContent]}>
                <ActivityIndicator size="large" color="#0a7ea4" />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
                <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>

            <Text style={styles.label}>Title</Text>
            <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Enter promotion title"
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Enter promotion description"
                multiline
            />

            <Text style={styles.label}>Start Date</Text>
            <DateTimePicker
                value={startDate}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                    const currentDate = selectedDate || startDate;
                    setStartDate(currentDate);
                }}
            />

            <Text style={styles.label}>End Date</Text>
            <DateTimePicker
                value={endDate}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                    const currentDate = selectedDate || endDate;
                    setEndDate(currentDate);
                }}
            />

            <Text style={styles.label}>Industry</Text>
            <Picker
                selectedValue={industryId}
                onValueChange={(itemValue) => setIndustryId(itemValue)}
            >
                <Picker.Item label="Select an industry" value={null} />
                {industries.map((industry) => (
                    <Picker.Item key={industry.id} label={industry.name} value={industry.id} />
                ))}
            </Picker>

            <TouchableOpacity style={styles.button} onPress={handleUpdate}>
                <Text style={styles.buttonText}>Update Promotion</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f5f5f5',
    },
    centerContent: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButton: {
        position: 'absolute',
        top: 10,
        right: 10,
        zIndex: 1,
    },
    label: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 5,
        color: '#333',
    },
    input: {
        backgroundColor: 'white',
        borderRadius: 5,
        padding: 10,
        marginBottom: 15,
        fontSize: 16,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    button: {
        backgroundColor: '#0a7ea4',
        padding: 15,
        borderRadius: 5,
        alignItems: 'center',
        marginTop: 20,
    },
    buttonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
});