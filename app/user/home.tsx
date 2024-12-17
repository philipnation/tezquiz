// app/user/home.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, FlatList, Image, ActivityIndicator, BackHandler, Alert, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, database } from '../../firebase/firebaseConfig';
import { ref, get } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

export default function HomeScreen() {
    const router = useRouter();
    const [userName, setUserName] = useState('User');
    const [points, setPoints] = useState(0);
    const [fullName, setFullName] = useState('Unavailable');
    const [referrals, setReferrals] = useState(0);
    const [availableLevels, setAvailableLevels] = useState([]);
    const [finishedQuizzes, setFinishedQuizzes] = useState([]);
    const [quizCode, setQuizCode] = useState('');
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            const onBackPress = () => {
                Alert.alert("Exit App", "Are you sure you want to exit?", [
                    { text: "Cancel", style: "cancel" },
                    { text: "Yes", onPress: () => BackHandler.exitApp() }
                ]);
                return true;
            };
            BackHandler.addEventListener("hardwareBackPress", onBackPress);
            return () => BackHandler.removeEventListener("hardwareBackPress", onBackPress);
        }, [])
    );

    useFocusEffect(
        useCallback(() => {
            loadUserData();
        }, [])
    );

    const loadUserData = async () => {
        try {
            const userId = auth.currentUser?.uid;
            if (userId) {
                const cachedData = await AsyncStorage.getItem('userData');
                let data;

                if (cachedData) {
                    data = JSON.parse(cachedData);
                    setUserName(data.username || 'User');
                    setFullName(data.fullName || 'Unavailable');
                    setReferrals(data.referrals || 0);
                    setPoints(data.points || 0);
                }

                const userRef = ref(database, `users/${userId}`);
                const snapshot = await get(userRef);

                if (snapshot.exists()) {
                    data = snapshot.val();
                    const formattedData = {
                        username: data.username || 'User',
                        fullName: data.fullName || 'Unavailable',
                        referrals: data.referrals || 0,
                        points: data.points || 0,
                    };
                    setUserName(formattedData.username);
                    setFullName(formattedData.fullName);
                    setReferrals(formattedData.referrals);
                    setPoints(formattedData.points);

                    await AsyncStorage.setItem('userData', JSON.stringify(formattedData));
                }
            }
            fetchAvailableLevels();
            fetchFinishedQuizzes(); // Fetch finished quizzes separately
        } catch (error) {
            console.error("Failed to load user data:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAvailableLevels = async () => {
        try {
            setLoading(true);
            const quizzesRef = ref(database, 'quizzes');
            const quizzesSnapshot = await get(quizzesRef);
            const allQuizzes = quizzesSnapshot.exists() ? quizzesSnapshot.val() : {};
            const availableLevelsSet = new Set();
            const userId = auth.currentUser?.uid;

            if (userId) {
                const userRef = ref(database, `users/${userId}/completedQuizzes`);
                const userSnapshot = await get(userRef);
                const completedQuizzes = userSnapshot.exists() ? userSnapshot.val() : {};

                for (const [key, quiz] of Object.entries(allQuizzes)) {
                    if (!completedQuizzes[key]?.completed) {
                        availableLevelsSet.add(quiz.level);
                    }
                }

                const sortedLevels = Array.from(availableLevelsSet).sort((a, b) => a - b);
                setAvailableLevels(sortedLevels);
            }
        } catch (error) {
            console.log("Error fetching available levels:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchFinishedQuizzes = async () => {
        try {
            const quizzesRef = ref(database, 'quizzes');
            const quizzesSnapshot = await get(quizzesRef);
            const allQuizzes = quizzesSnapshot.exists() ? quizzesSnapshot.val() : {};
            const userId = auth.currentUser?.uid;

            if (userId) {
                const userRef = ref(database, `users/${userId}/completedQuizzes`);
                const userSnapshot = await get(userRef);
                const completedQuizzes = userSnapshot.exists() ? userSnapshot.val() : {};

                const finished = [];
                for (const [key, quiz] of Object.entries(allQuizzes)) {
                    if (completedQuizzes[key]?.completed) {
                        finished.push({ id: key, ...quiz });
                    }
                }

                setFinishedQuizzes(finished.reverse().slice(0, 5)); // Update finished quizzes
            }
        } catch (error) {
            console.log("Error fetching finished quizzes:", error);
        }
    };

    const handleEnterQuizCode = async () => {
        try {
            if (!quizCode.trim()) {
                Alert.alert("Invalid Code", "Please enter a valid quiz code.");
                return;
            }
            const quizRef = ref(database, `quizzes/${quizCode.trim()}`);
            const snapshot = await get(quizRef);

            if (snapshot.exists()) {
                router.push({ pathname: '/user/QuizScreen', params: { id: quizCode.trim() } });
            } else {
                Alert.alert("Invalid Quiz Code", "The quiz code you entered does not exist.");
            }
        } catch (error) {
            console.error("Error validating quiz code:", error);
            Alert.alert("Error", "Something went wrong while validating the quiz code. Please try again.");
        }
    };

    const renderLevelCard = ({ item }) => {
        const hue = Math.floor(Math.random() * 20) + 40;
        const primaryColor = `hsl(${hue}, 80%, 50%)`;
        const lighterColor = `hsl(${hue}, 80%, 70%)`;

        return (
            <TouchableOpacity onPress={() => router.push({ pathname: '/user/levels', params: { level: item } })}>
                <LinearGradient colors={[primaryColor, lighterColor]} style={styles.quizCard}>
                    <Text style={styles.quizTitle}>Level {item}</Text>
                </LinearGradient>
            </TouchableOpacity>
        );
    };

    const renderFinishedQuizCard = ({ item }) => {
        const hue = Math.floor(Math.random() * 20) + 40;
        const primaryColor = `hsl(${hue}, 80%, 50%)`;
        const lighterColor = `hsl(${hue}, 80%, 70%)`;

        return (
            <TouchableOpacity onPress={() => router.push({ pathname: '/user/QuizScreen', params: { id: item.id } })}>
                <LinearGradient colors={[primaryColor, lighterColor]} style={styles.quizCard}>
                    <Text style={styles.quizTitle}>{item.name}</Text>
                    <Text style={styles.quizDescription}>{item.description}</Text>
                </LinearGradient>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.welcomeContainer}>
                <View style={styles.welcomeHeader}>
                    <Text style={styles.welcomeText}>Welcome, {userName}</Text>
                    <View style={styles.pointsContainer}>
                        <Image source={require('../../assets/diamond.png')} style={styles.diamondIcon} />
                        <Text style={styles.pointsText}>{points}</Text>
                    </View>
                </View>
                <Text style={styles.subtitle}>Test your knowledge and have fun!</Text>
            </View>
            {loading ? (
                <ActivityIndicator size="large" color="#F7C948" style={styles.loader} />
            ) : (
                <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Available Levels</Text>
                        <TouchableOpacity onPress={() => router.push('/user/AllQuizzes')}>
                            <Text style={styles.seeMore}>See more</Text>
                        </TouchableOpacity>
                    </View>
                    {availableLevels.length > 0 ? (
                        <FlatList
                            data={availableLevels}
                            renderItem={renderLevelCard}
                            keyExtractor={(item) => `level-${item}`}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.horizontalList}
                        />
                    ) : (
                        <Text style={styles.noQuizzesText}>No available levels yet</Text>
                    )}
                    <View style={[styles.sectionHeader, { marginTop: 20 }]}>
                        <Text style={styles.sectionTitle}>Finished Quizzes</Text>
                        <TouchableOpacity onPress={() => router.push('/user/FinishedQuizzes')}>
                            <Text style={styles.seeMore}>See more</Text>
                        </TouchableOpacity>
                    </View>
                    {finishedQuizzes.length > 0 ? (
                        <FlatList
                            data={finishedQuizzes}
                            renderItem={renderFinishedQuizCard}
                            keyExtractor={(item) => item.id}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.horizontalList}
                        />
                    ) : (
                        <Text style={styles.noQuizzesText}>No finished quizzes yet</Text>
                    )}
                    {/* Add the "Enter Quiz Code" Section */}
                    <View style={styles.quizCodeSection}>
                        <Text style={styles.sectionTitle}>Enter Quiz Code</Text>
                        <View style={styles.quizCodeInputContainer}>
                            <TextInput
                                style={styles.quizCodeInput}
                                placeholder="Enter Quiz Code"
                                placeholderTextColor="#FFFFFF"
                                value={quizCode}
                                onChangeText={setQuizCode}
                            />
                            <TouchableOpacity style={styles.quizCodeButton} onPress={handleEnterQuizCode}>
                                <Text style={styles.buttonText}>Enter</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            )}
        </View>
    );
}

// Styling
const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.7;
const CARD_HEIGHT = 180 * 0.8;
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF2CC' },
    scrollContainer: { flex: 1 },
    welcomeContainer: {
        backgroundColor: '#FFDB74',
        borderRadius: 20,
        paddingVertical: 15,
        paddingHorizontal: 0,
        marginHorizontal: 0,
        marginBottom: 10,
    },
    welcomeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 15,
    },
    welcomeText: { fontSize: 18, fontFamily: 'Poppins-Bold', color: '#333333' },
    subtitle: {
        fontSize: 14,
        color: '#333333',
        fontFamily: 'Poppins-Regular',
        paddingHorizontal: 15,
        marginTop: 5,
    },
    pointsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F7C948',
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 20,
    },
    diamondIcon: {
        width: 16,
        height: 16,
        marginRight: 4,
    },
    pointsText: {
        fontSize: 14,
        color: '#333333',
        fontFamily: 'Poppins-Bold',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 20,
        paddingHorizontal: 0,
    },
    sectionTitle: {
        fontSize: 16,
        fontFamily: 'Poppins-Bold',
        color: '#333333',
    },
    seeMore: {
        fontSize: 14,
        color: '#007AFF',
        fontFamily: 'Poppins-Regular',
    },
    noQuizzesText: {
        fontSize: 14,
        color: '#333333',
        fontFamily: 'Poppins-Regular',
        marginLeft: 15,
        marginTop: 10,
    },
    horizontalList: {
        paddingHorizontal: 0,
        marginTop: 10,
    },
    quizCard: {
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        borderRadius: 15,
        marginHorizontal: 8,
        padding: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    quizTitle: {
        fontSize: 18,
        fontFamily: 'Poppins-Bold',
        color: '#FFFFFF',
    },
    quizDescription: {
        fontSize: 14,
        fontFamily: 'Poppins-Regular',
        color: '#FFFFFF',
    },
    loader: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 20,
    },
    quizCodeSection: {
        marginTop: 20,
        paddingHorizontal: 15,
    },
    quizCodeInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
    },
    quizCodeInput: {
        flex: 1,
        backgroundColor: '#F7C948',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 10,
        fontSize: 16,
        fontFamily: 'Poppins-Regular',
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    quizCodeButton: {
        backgroundColor: '#F7C948',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontFamily: 'Poppins-Bold',
        fontSize: 16,
    },
});
