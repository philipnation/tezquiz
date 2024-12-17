// app/user/profile.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { auth, database } from '../../firebase/firebaseConfig';
import { ref, get } from 'firebase/database';
import { signOut } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
    const router = useRouter();
    const [userData, setUserData] = useState({
        fullName: 'Unavailable',
        username: 'Unavailable',
        email: 'Unavailable',
        referrals: 0,
        points: 0
    });
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        loadUserData();
    }, []);

    const loadUserData = async () => {
        try {
            const cachedData = await AsyncStorage.getItem('userData');
            let data;
            if (cachedData) {
                data = JSON.parse(cachedData);
                console.log("Points from cache before updating:", data.points); // Log points before updating
                setUserData({
                    fullName: data.fullName || 'Unavailable',
                    username: data.username || 'Unavailable',
                    referrals: data.referrals ?? 0,
                    points: data.points ?? 0
                });
                setLoading(false);

                // Check if points are available in cached data
                if (data.points != null) {
                    return; // Exit early if points are already available
                }
            }

            // Fetch data from the database if points are not available
            const userId = auth.currentUser?.uid;
            if (userId) {
                const userRef = ref(database, `users/${userId}`);
                const snapshot = await get(userRef);
                if (snapshot.exists()) {
                    data = snapshot.val();
                    const formattedData = {
                        fullName: data.fullName || 'Unavailable',
                        username: data.username || 'Unavailable',
                        referrals: data.referrals || 0,
                        points: data.points || 0
                    };
                    console.log("Points from database before updating:", formattedData.points); // Log points before updating
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

    const handleCopyReferralLink = async () => {
        const referralLink = `https://trivia.com/${userData.username}`;
        await Clipboard.setStringAsync(referralLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            await AsyncStorage.clear();
            Alert.alert('Logged out', 'You have successfully logged out.');
            router.replace('/');
        } catch (error) {
            console.error("Logout failed:", error);
            Alert.alert('Logout failed', error.message);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            {loading ? (
                <ActivityIndicator size="large" color="#F7C948" />
            ) : (
                <>
                    {/* User Information */}
                    <Text style={styles.fullName}>{userData.fullName}</Text>
                    <Text style={styles.username}>@{userData.username}</Text>
                    {/* Referrals and Points */}
                    <View style={styles.infoContainer}>
                        <Text style={styles.infoTitle}>Referrals</Text>
                        <Text style={styles.infoValue}>{userData.referrals}</Text>
                    </View>
                    <View style={styles.infoContainer}>
                        <Text style={styles.infoTitle}>Points</Text>
                        <Text style={styles.infoValue}>{userData.points}</Text>
                    </View>
                    {/* Referral Link Section */}
                    <Text style={styles.referralTitle}>Refer friends</Text>
                    <View style={styles.referralContainer}>
                        <Text style={styles.referralLink}>https://trivia.com/{userData.username}</Text>
                        <TouchableOpacity onPress={handleCopyReferralLink}>
                            <Text style={styles.copyButton}>📋</Text>
                        </TouchableOpacity>
                    </View>
                    {copied && <Text style={styles.copiedText}>Copied</Text>}
                    {/* Logout Button */}
                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                        <Text style={styles.logoutText}>Log Out</Text>
                    </TouchableOpacity>
                </>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        backgroundColor: '#FFF2CC',
        paddingHorizontal: 0,
        alignItems: 'flex-start',
        paddingVertical: 20,
    },
    fullName: {
        fontSize: 26,
        color: '#333',
        fontFamily: 'Poppins-Bold',
        marginLeft: 20,
    },
    username: {
        fontSize: 16,
        color: '#666',
        fontFamily: 'Poppins-Regular',
        marginLeft: 20,
        marginBottom: 15,
    },
    infoContainer: {
        backgroundColor: '#F5E3B8',
        borderRadius: 10,
        paddingVertical: 15,
        paddingHorizontal: 20,
        marginVertical: 5,
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    infoTitle: {
        fontSize: 16,
        color: '#333',
        fontFamily: 'Poppins-Bold',
    },
    infoValue: {
        fontSize: 16,
        color: '#333',
        fontFamily: 'Poppins-Regular',
    },
    referralTitle: {
        fontSize: 18,
        color: '#333',
        fontFamily: 'Poppins-Bold',
        marginVertical: 10,
        marginLeft: 20,
    },
    referralContainer: {
        backgroundColor: '#F5E3B8',
        borderRadius: 10,
        paddingVertical: 15,
        paddingHorizontal: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
    },
    referralLink: {
        fontSize: 16,
        color: '#333',
        fontFamily: 'Poppins-Regular',
    },
    copyButton: {
        fontSize: 18,
        color: '#333',
        fontFamily: 'Poppins-Bold',
    },
    copiedText: {
        fontSize: 14,
        color: '#000',
        fontFamily: 'Poppins-Bold',
        marginTop: 5,
        marginLeft: 20,
    },
    logoutButton: {
        backgroundColor: '#FF5A5F',
        borderRadius: 10,
        paddingVertical: 15,
        alignItems: 'center',
        width: '100%',
        marginTop: 20,
    },
    logoutText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontFamily: 'Poppins-Bold',
    },
});
