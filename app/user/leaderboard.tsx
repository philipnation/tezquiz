// app/user/leaderboard.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { ref, query, orderByChild, limitToLast, get } from 'firebase/database';
import { database } from '../../firebase/firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = 'leaderboardData';
const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 hours in milliseconds

export default function LeaderboardScreen() {
    const [quizMasters, setQuizMasters] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const cachedData = await AsyncStorage.getItem(CACHE_KEY);
                const cachedTimestamp = await AsyncStorage.getItem(`${CACHE_KEY}_timestamp`);
                const now = Date.now();

                // Use cache if available and within the cache duration
                if (cachedData && cachedTimestamp && now - parseInt(cachedTimestamp) < CACHE_DURATION) {
                    setQuizMasters(JSON.parse(cachedData));
                    setLoading(false);
                    console.log("Loaded leaderboard data from cache.");
                } else {
                    // Fetch data from Firebase if cache is not available or expired
                    const usersRef = query(ref(database, 'users'), orderByChild('points'), limitToLast(100));
                    const snapshot = await get(usersRef);
                    if (snapshot.exists()) {
                        const users = Object.entries(snapshot.val())
                            .map(([id, user]) => ({ id, ...user }))
                            .sort((a, b) => b.points - a.points) // Sort in descending order
                            .map((user, index) => ({ ...user, rank: index + 1 })); // Add rank

                        setQuizMasters(users);
                        // Cache the leaderboard data and current timestamp
                        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(users));
                        await AsyncStorage.setItem(`${CACHE_KEY}_timestamp`, now.toString());
                        console.log("Fetched and cached leaderboard data from Firebase.");
                    } else {
                        console.log('No users found in the database.');
                    }
                }
            } catch (error) {
                console.error("Failed to fetch leaderboard:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
    }, []);

    const renderQuizMaster = ({ item }) => {
        // Determine emoji for the top 3 ranks
        let medalEmoji;
        if (item.rank === 1) medalEmoji = '';
        else if (item.rank === 2) medalEmoji = '';
        else if (item.rank === 3) medalEmoji = '';

        return (
            <View style={styles.quizMasterContainer}>
                <View style={styles.rankCircle}>
                    <Text style={styles.rankText}>{item.rank}</Text>
                </View>
                <View style={styles.userInfo}>
                    <Text style={styles.username}>{item.username}</Text>
                    <Text style={styles.points}>{item.points} points</Text>
                </View>
                {medalEmoji && <Text style={styles.medal}>{medalEmoji}</Text>}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.stickyHeader}>
                <Text style={styles.title}>Top Quiz Masters</Text>
                <Text style={styles.subtitle}>See how you rank among the best quiz players!</Text>
            </View>
            {loading ? (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color="#F7C948" />
                    <Text style={styles.loadingText}>Loading Leaderboard...</Text>
                </View>
            ) : (
                <FlatList
                    data={quizMasters}
                    renderItem={renderQuizMaster}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF2CC',
        paddingHorizontal: 0,
        paddingVertical: 20,
    },
    stickyHeader: {
        backgroundColor: '#FFF2CC',
        paddingBottom: 10,
        position: 'sticky',
        top: 0,
        zIndex: 1,
    },
    title: {
        fontSize: 24,
        color: '#333',
        fontFamily: 'Poppins-Bold',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 12,
        color: '#555',
        fontFamily: 'Poppins-Regular',
        textAlign: 'center',
        marginBottom: 10,
    },
    listContent: {
        paddingHorizontal: 0,
    },
    quizMasterContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5E3B8',
        borderRadius: 10,
        paddingVertical: 15,
        paddingHorizontal: 20,
        marginBottom: 10,
    },
    rankCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#C4B299',
        marginRight: 15,
    },
    rankText: {
        fontSize: 16,
        color: '#FFFFFF',
        fontFamily: 'Poppins-Bold',
    },
    userInfo: {
        flex: 1,
    },
    username: {
        fontSize: 16,
        fontFamily: 'Poppins-Bold',
        color: '#333333',
        marginBottom: 3,
    },
    points: {
        fontSize: 14,
        fontFamily: 'Poppins-Regular',
        color: '#333333',
    },
    medal: {
        fontSize: 18,
        marginLeft: 10,
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 16,
        color: '#333',
        fontFamily: 'Poppins-Regular',
        marginTop: 10,
    },
});
