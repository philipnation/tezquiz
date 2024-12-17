// app/user/QuizScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, BackHandler, ActivityIndicator, ScrollView } from 'react-native';
import { Clipboard } from 'react-native';
import { ref, get, update } from 'firebase/database';
import { database, auth } from '../../firebase/firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AnimatedCircularProgress } from 'react-native-circular-progress';

export default function QuizScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const [quiz, setQuiz] = useState(null);
    const [stage, setStage] = useState("details");
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState(15);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [correctAnswers, setCorrectAnswers] = useState(0);
    const [loading, setLoading] = useState(true);
    const [resultLogged, setResultLogged] = useState(false);
    const [alreadyCompleted, setAlreadyCompleted] = useState(false);
    const [completionData, setCompletionData] = useState(null);
    const userId = auth.currentUser?.uid;

    useEffect(() => {
        if (id) {
            const fetchQuizData = async () => {
                const quizRef = ref(database, `quizzes/${id}`);
                const userQuizRef = ref(database, `users/${userId}/completedQuizzes/${id}`);
                setLoading(true);
                try {
                    const [quizSnapshot, userQuizSnapshot] = await Promise.all([get(quizRef), get(userQuizRef)]);
                    if (quizSnapshot.exists()) {
                        setQuiz(quizSnapshot.val());
                        console.log("Quiz data fetched successfully:", quizSnapshot.val());
                    }
                    if (userQuizSnapshot.exists() && userQuizSnapshot.val().completed) {
                        setAlreadyCompleted(true);
                        setCompletionData(userQuizSnapshot.val());
                    } else {
                        markQuizStarted();
                    }
                } catch (error) {
                    console.error("Error fetching quiz data:", error);
                } finally {
                    setLoading(false);
                }
            };
            fetchQuizData();
        }
    }, [id]);

    const currentQuestion = quiz ? quiz.questions[currentQuestionIndex] : null;

    useEffect(() => {
        if (stage === "questions" && currentQuestion) {
            const timer = setInterval(() => {
                setTimeLeft((prevTime) => {
                    if (prevTime === 1) {
                        handleNext();
                        return 15;
                    }
                    return prevTime - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [stage, currentQuestionIndex, quiz]);

    useEffect(() => {
        const onBackPress = () => {
            if (stage === "questions") {
                Alert.alert("Exit Quiz", "If you exit now, the quiz will be marked as completed.", [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Exit",
                        onPress: () => {
                            markQuizAsCompleted();
                            router.replace('/dashboard');
                        },
                    },
                ]);
                return true;
            }
            return false;
        };
        BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    }, [stage]);

    const markQuizStarted = () => {
        if (userId && quiz) {
            const userQuizRef = ref(database, `users/${userId}/completedQuizzes/${id}`);
            update(userQuizRef, {
                started: true,
                completed: false,
                startTime: Date.now(),
            });
            console.log("Quiz marked as started.");
        }
    };

    const markQuizAsCompleted = () => {
        if (userId) {
            const userQuizRef = ref(database, `users/${userId}/completedQuizzes/${id}`);
            update(userQuizRef, {
                score: 0,
                correctAnswers: 0,
                totalQuestions: quiz.questions.length,
                completed: true,
                completedAt: Date.now()
            });
            console.log("Quiz marked as completed with 0 score due to early exit.");
        }
    };

    const handleNext = () => {
        if (selectedAnswer && selectedAnswer.trim().toLowerCase() === currentQuestion.correctAnswer.trim().toLowerCase()) {
            setCorrectAnswers((prev) => prev + 1);
        }
        setSelectedAnswer(null);
        if (currentQuestionIndex < quiz.questions.length - 1) {
            setCurrentQuestionIndex((prev) => prev + 1);
            setTimeLeft(15);
        } else {
            setStage("results");
        }
    };

    useEffect(() => {
        if (stage === "results" && !resultLogged) {
            handleFinishQuiz();
        }
    }, [stage, resultLogged]);

    const handleFinishQuiz = async () => {
        const totalQuestions = quiz.questions.length;
        const percentageCorrect = correctAnswers / totalQuestions;
        const earnedPoints = Math.round(percentageCorrect * quiz.points);
        if (userId) {
            const userRef = ref(database, `users/${userId}`);
            try {
                const snapshot = await get(userRef);
                const userData = snapshot.val() || {};
                const updatedPoints = (userData.points || 0) + earnedPoints;
                await update(userRef, {
                    points: updatedPoints,
                    [`completedQuizzes/${id}`]: {
                        score: earnedPoints,
                        correctAnswers,
                        totalQuestions,
                        completed: true,
                        completedAt: Date.now(),
                    },
                });
                const cachedData = await AsyncStorage.getItem('userData');
                let updatedUserData = cachedData ? JSON.parse(cachedData) : {};
                updatedUserData.points = updatedPoints;
                await AsyncStorage.setItem('userData', JSON.stringify(updatedUserData));
                console.log("User's total points and quiz result updated in the database and cached.");
                console.log("Updated points stored in AsyncStorage:", updatedUserData.points);
            } catch (error) {
                console.error("Failed to update user data:", error);
            }
            setResultLogged(true);
        }
    };

    const copyQuizCode = () => {
        const message = `Try out this quiz: ${quiz.name}! It has ${quiz.questions.length} questions and is worth ${quiz.points} points. Use the code: ${id}`;
        Clipboard.setString(message);
        Alert.alert("Quiz Code Copied", "The quiz code and information have been copied to your clipboard. Share it with your friends!");
    };

    const renderContent = () => {
        if (loading) {
            return (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color="#FFDB74" />
                    <Text style={styles.loadingText}>Loading Quiz...</Text>
                </View>
            );
        }
        if (alreadyCompleted && completionData) {
            return (
                <View style={styles.contentContainer}>
                    <Text style={styles.title}>Quiz Already Completed</Text>
                    <Text style={styles.info}>Correct Answers: {completionData.correctAnswers} / {completionData.totalQuestions}</Text>
                    <Text style={styles.info}>Score: {completionData.score} points</Text>
                    <Text style={styles.info}>Completed On: {new Date(completionData.completedAt).toLocaleString()}</Text>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/user/AllQuizzes')}>
                        <Text style={styles.buttonText}>Back to Quizzes</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.copyButton} onPress={copyQuizCode}>
                        <Text style={styles.buttonText}>Copy Quiz Code</Text>
                    </TouchableOpacity>
                </View>
            );
        }
        if (stage === "details") {
            return (
                <View style={styles.contentContainer}>
                    <Text style={styles.title}>{quiz.name}</Text>
                    <Text style={styles.description}>{quiz.description}</Text>
                    <Text style={styles.info}>Number of Questions: {quiz.questions.length}</Text>
                    <Text style={styles.info}>Estimated Time: {quiz.questions.length * 15} seconds</Text>
                    <TouchableOpacity style={styles.startButton} onPress={() => setStage("questions")}>
                        <Text style={styles.buttonText}>Start Quiz</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.copyButton} onPress={copyQuizCode}>
                        <Text style={styles.buttonText}>Copy Quiz Code</Text>
                    </TouchableOpacity>
                </View>
            );
        } else if (stage === "questions") {
            return (
                <View style={styles.contentContainer}>
                    <Text style={styles.questionCounter}>Question {currentQuestionIndex + 1} / {quiz.questions.length}</Text>
                    <AnimatedCircularProgress
                        size={70}
                        width={5}
                        fill={(15 - timeLeft) * (100 / 15)}
                        tintColor="#FF5A5F"
                        backgroundColor="#D3D3D3"
                    >
                        {() => <Text style={styles.timer}>{timeLeft}s</Text>}
                    </AnimatedCircularProgress>
                    <View style={styles.questionCard}>
                        <Text style={styles.question}>{currentQuestion.questionText}</Text>
                    </View>
                    <ScrollView style={styles.optionsContainer}>
                        {currentQuestion.options.map((option, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[styles.option, selectedAnswer === option && styles.selectedOption]}
                                onPress={() => setSelectedAnswer(option)}
                            >
                                <Text style={styles.optionText}>{option}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                    <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                        <Text style={styles.buttonText}>Next</Text>
                    </TouchableOpacity>
                </View>
            );
        } else if (stage === "results") {
            return (
                <View style={styles.contentContainer}>
                    <Text style={styles.title}>Congratulations!</Text>
                    <Text style={styles.info}>You completed the quiz.</Text>
                    <Text style={styles.resultText}>Correct Answers: {correctAnswers} / {quiz.questions.length}</Text>
                    <Text style={styles.points}>Points Earned: {Math.round((correctAnswers / quiz.questions.length) * quiz.points)}</Text>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/user/AllQuizzes')}>
                        <Text style={styles.buttonText}>Back to Quizzes</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.copyButton} onPress={copyQuizCode}>
                        <Text style={styles.buttonText}>Copy Quiz Code</Text>
                    </TouchableOpacity>
                </View>
            );
        }
    };

    return <View style={styles.container}>{renderContent()}</View>;
}


// Styles
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF2CC',
        padding: 20,
        justifyContent: 'center',
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
    contentContainer: {
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontFamily: 'Poppins-Bold',
        color: '#333',
        marginBottom: 10,
    },
    description: {
        fontSize: 16,
        fontFamily: 'Poppins-Regular',
        color: '#555',
        textAlign: 'center',
        marginBottom: 20,
    },
    info: {
        fontSize: 14,
        fontFamily: 'Poppins-Regular',
        color: '#666',
        marginBottom: 10,
    },
    questionCounter: {
        fontSize: 18,
        fontFamily: 'Poppins-Bold',
        color: '#333',
        marginBottom: 10,
    },
    startButton: {
        backgroundColor: '#F7C948',
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
        width: '100%',
    },
    questionCard: {
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 10,
        marginVertical: 20,
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    timer: {
        fontSize: 18,
        fontFamily: 'Poppins-Bold',
        color: '#FF5A5F',
        textAlign: 'center',
    },
    question: {
        fontSize: 18,
        fontFamily: 'Poppins-Regular',
        color: '#333',
        textAlign: 'center',
    },
    optionsContainer: {
        maxHeight: '50%', // Adjust based on design
        marginBottom: 10,
    },
    option: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 10,
        marginVertical: 5,
        width: '100%',
        alignItems: 'flex-start',
        alignSelf: 'stretch',
        minWidth: '100%',
    },
    selectedOption: {
        backgroundColor: '#F7C948',
    },
    optionText: {
        fontSize: 16,
        fontFamily: 'Poppins-Regular',
        color: '#333',
    },
    nextButton: {
        backgroundColor: '#FF5A5F',
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
        width: '100%',
        marginTop: 20,
    },
    backButton: {
        backgroundColor: '#4CAF50',
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
        width: '100%',
        marginTop: 20,
    },
    buttonText: {
        color: '#fff',
        fontFamily: 'Poppins-Bold',
        fontSize: 16,
    },
    resultText: {
        fontSize: 18,
        fontFamily: 'Poppins-Bold',
        color: '#333',
        marginTop: 15,
        textAlign: 'center',
    },
    points: {
        fontSize: 18,
        fontFamily: 'Poppins-Bold',
        color: '#333',
        marginBottom: 20,
    },
    bottomSpacer: {
        height: 20, // Space at the bottom of options for scroll padding
    },
    copyButton: {
    	backgroundColor: '#2196F3',  
    	paddingVertical: 12,        
    	borderRadius: 10,
    	alignItems: 'center', 
    	width: '100%',
    	marginTop: 10,
    },

});
