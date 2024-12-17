// app/user/profile.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Dimensions } from 'react-native';
import { auth, database } from '../../firebase/firebaseConfig';
import { ref, get } from 'firebase/database';
import { signOut } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
    const router = useRouter();
    const [userData, setUserData] = useState({
        fullName: 'Unavailable',
        username: 'Unavailable',
        email: 'Unavailable',
        points: 0,
        achievements: [],
        referrals: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadUserData();
    }, []);

    const loadUserData = async () => {
        try {
            const cachedData = await AsyncStorage.getItem('userData');
            let data;
            if (cachedData) {
                const parsedData = JSON.parse(cachedData);
                data = {
                    fullName: parsedData.fullName || 'Unavailable',
                    username: parsedData.username || 'Unavailable',
                    email: parsedData.email || 'Unavailable',
                    points: parsedData.points ?? 0,
                    achievements: Array.isArray(parsedData.achievements) ? parsedData.achievements : [],
                    referrals: parsedData.referrals ?? 0,
                };
                setUserData(data);
                setLoading(false);
                return;
            }
            const userId = auth.currentUser?.uid;
            if (userId) {
                const userRef = ref(database, `users/${userId}`);
                const snapshot = await get(userRef);
                if (snapshot.exists()) {
                    data = snapshot.val();
                    const formattedData = {
                        fullName: data.fullName || 'Unavailable',
                        username: data.username || 'Unavailable',
                        email: data.email || 'Unavailable',
                        points: data.points || 0,
                        achievements: data.achievements || [],
                        referrals: data.referrals || 0,
                    };
                    setUserData(formattedData);
                    await AsyncStorage.setItem('userData', JSON.stringify(formattedData));
                }
            }
            setLoading(false);
        } catch (error) {
            console.error("Failed to load user data:", error);
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            await AsyncStorage.removeItem('lastLogin');
            await AsyncStorage.removeItem('isAdmin');
            await AsyncStorage.removeItem('userData');
            Alert.alert('Logged out', 'You have successfully logged out.');
            router.replace('/');
        } catch (error) {
            Alert.alert('Logout failed', error.message);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            {loading ? (
                <ActivityIndicator size="large" color="#F7C948" />
            ) : (
                <>
                    <Text style={styles.fullName}>{userData.fullName}</Text>
                    <Text style={styles.username}>@{userData.username}</Text>

                    {/* Referrals Section */}
                    <View style={styles.infoContainer}>
                        <Text style={styles.sectionLabel}>Referrals</Text>
                        <Text style={styles.sectionValue}>{userData.referrals}</Text>
                    </View>

                    {/* Points Section */}
                    <View style={styles.infoContainer}>
                        <Text style={styles.sectionLabel}>Points</Text>
                        <Text style={styles.sectionValue}>{userData.points}</Text>
                    </View>

                    {/* Achievements Section */}
                    <Text style={styles.sectionTitle}>Achievements</Text>
                    <View style={styles.achievementsContainer}>
                        {userData.achievements.length > 0 ? (
                            userData.achievements.map((achievement, index) => (
                                <Text key={index} style={styles.achievement}>
                                    - {achievement}
                                </Text>
                            ))
                        ) : (
                            <Text style={styles.noAchievementsText}>No achievements yet.</Text>
                        )}
                    </View>

                    {/* Logout Button */}
                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                        <Text style={styles.logoutText}>Log Out</Text>
                    </TouchableOpacity>
                </>
            )}
        </ScrollView>
    );
}

const { width } = Dimensions.get('window');
const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        backgroundColor: '#FFF2CC', // Same background as QuizScreen
        alignItems: 'flex-start', // Align items to the left
        paddingHorizontal: 0, // Removed all horizontal padding
    },
    fullName: {
        fontSize: 26,
        color: '#333',
        fontFamily: 'Poppins-Bold',
        marginVertical: 10,
    },
    username: {
        fontSize: 16,
        color: '#666',
        fontFamily: 'Poppins-Regular',
        marginBottom: 15,
    },
    infoContainer: {
        backgroundColor: '#E6D5A3', // Color similar to search box on learn page
        borderRadius: 15,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
        paddingHorizontal: 20,
        width: '100%',
        marginVertical: 5, // Space between elements
    },
    sectionLabel: {
        fontSize: 16,
        color: '#333',
        fontFamily: 'Poppins-Regular',
    },
    sectionValue: {
        fontSize: 16,
        color: '#333',
        fontFamily: 'Poppins-Bold',
    },
    sectionTitle: {
        fontSize: 18,
        color: '#333',
        fontFamily: 'Poppins-Bold',
        marginVertical: 10,
    },
    achievementsContainer: {
        width: '100%',
        marginBottom: 30,
    },
    achievement: {
        fontSize: 14,
        color: '#555',
        fontFamily: 'Poppins-Regular',
        marginVertical: 2,
    },
    noAchievementsText: {
        fontSize: 14,
        color: '#999',
        fontFamily: 'Poppins-Regular',
        textAlign: 'center',
        marginVertical: 5,
    },
    logoutButton: {
        backgroundColor: '#FF5A5F', // Red background for logout
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 50,
        alignSelf: 'center', // Center align the button
        marginTop: 20,
    },
    logoutText: {
        color: '#FFFFFF', // White text for logout button
        fontSize: 16,
        fontFamily: 'Poppins-Bold',
        textAlign: 'center',
    },
});
