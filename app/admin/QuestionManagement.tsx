// app/admin/QuestionManagement.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Alert } from 'react-native';
import { ref, push, set, remove, onValue } from 'firebase/database';
import { database } from '../../firebase/firebaseConfig';

export default function QuestionManagement() {
    const [quizName, setQuizName] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [level, setLevel] = useState(''); // Added state for level
    const [points, setPoints] = useState('');
    const [questions, setQuestions] = useState([]);
    const [quizzes, setQuizzes] = useState([]);
    const [filteredQuizzes, setFilteredQuizzes] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');

    // Fetch quizzes from Firebase
    useEffect(() => {
        const quizzesRef = ref(database, 'quizzes');
        onValue(quizzesRef, (snapshot) => {
            const data = snapshot.val();
            const quizList = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })).reverse() : [];
            setQuizzes(quizList);
            setFilteredQuizzes(quizList);
        });
    }, []);

    // Validate each question to ensure fields are filled and correct answer is in options
    const validateCorrectAnswer = (question) => {
        const optionsArray = question.options.split(',').map(option => option.trim().toLowerCase());
        const correctAnswer = question.correctAnswer.trim().toLowerCase();
        return optionsArray.includes(correctAnswer);
    };

    const validateQuestionFields = (question) => question.questionText && question.options && question.correctAnswer;

    const areQuestionsValid = () => {
        if (questions.length === 0) {
            Alert.alert("Validation Error", "You must add at least one question.");
            return false;
        }
        for (let i = 0; i < questions.length; i++) {
            if (!validateQuestionFields(questions[i])) {
                Alert.alert("Validation Error", `Please fill all fields for Question ${i + 1}.`);
                return false;
            }
            if (!validateCorrectAnswer(questions[i])) {
                Alert.alert("Validation Error", `Correct answer for Question ${i + 1} must be one of the options.`);
                return false;
            }
        }
        return true;
    };

    // Validate the quiz data fields
    const areQuizFieldsValid = () => {
        if (!quizName || !description || !category || !level || !points) { // Added level to validation
            Alert.alert("Validation Error", "Please fill all the required fields for the quiz: Title, Description, Category, Level, and Points.");
            return false;
        }
        return true;
    };

    // Add new quiz with questions to Firebase
    const handleAddQuiz = () => {
        if (!areQuizFieldsValid() || !areQuestionsValid()) return;

        const quizzesRef = ref(database, 'quizzes');
        const newQuizRef = push(quizzesRef);
        const formattedQuestions = questions.map((q) => ({
            questionText: q.questionText,
            options: q.options.split(',').map(option => option.trim()),
            correctAnswer: q.correctAnswer
        }));

        set(newQuizRef, {
            name: quizName,
            description,
            category,
            level, // Added level to Firebase payload
            points: parseInt(points),
            questions: formattedQuestions
        });

        setQuizName('');
        setDescription('');
        setCategory('');
        setLevel(''); // Reset level
        setPoints('');
        setQuestions([]);
    };

    const addNewQuestion = () => {
        if (questions.length > 0 && (!validateQuestionFields(questions[questions.length - 1]) || !validateCorrectAnswer(questions[questions.length - 1]))) {
            Alert.alert("Validation Error", "Please complete all fields for the previous question before adding a new one.");
            return;
        }
        setQuestions([...questions, { questionText: '', options: '', correctAnswer: '', isValid: true }]);
    };

    const updateQuestion = (index, key, value) => {
        const updatedQuestions = [...questions];
        updatedQuestions[index][key] = value;
        setQuestions(updatedQuestions);
    };

    const validateCorrectAnswerOnBlur = (index) => {
        const updatedQuestions = [...questions];
        updatedQuestions[index].isValid = validateCorrectAnswer(updatedQuestions[index]);
        setQuestions(updatedQuestions);
    };

    const handleSearch = (query) => {
        setSearchQuery(query);
        filterQuizzes(query, selectedCategory);
    };

    const handleCategorySelect = (category) => {
        setSelectedCategory(category);
        filterQuizzes(searchQuery, category);
    };

    const filterQuizzes = (query, category) => {
        const filtered = quizzes.filter(quiz =>
            quiz.name.toLowerCase().includes(query.toLowerCase()) &&
            (category ? quiz.category === category : true)
        );
        setFilteredQuizzes(filtered);
    };

    const handleDeleteQuiz = (id) => {
        const quizRef = ref(database, `quizzes/${id}`);
        remove(quizRef);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Add Quiz</Text>
            <TextInput style={styles.input} placeholder="Quiz Title" value={quizName} onChangeText={setQuizName} />
            <TextInput style={styles.input} placeholder="Description" value={description} onChangeText={setDescription} />
            <TextInput style={styles.input} placeholder="Category" value={category} onChangeText={setCategory} />
            <TextInput style={styles.input} placeholder="Level" value={level} onChangeText={setLevel} />
            <TextInput style={styles.input} placeholder="Total Points" value={points} onChangeText={setPoints} keyboardType="numeric" />

            <Text style={styles.subHeading}>Questions ({questions.length})</Text>
            {questions.map((q, index) => (
                <View key={index} style={styles.questionContainer}>
                    <Text style={styles.questionCounter}>Question {index + 1}</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Question"
                        value={q.questionText}
                        onChangeText={(text) => updateQuestion(index, 'questionText', text)}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Options (comma-separated)"
                        value={q.options}
                        onChangeText={(text) => updateQuestion(index, 'options', text)}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Correct Option"
                        value={q.correctAnswer}
                        onChangeText={(text) => updateQuestion(index, 'correctAnswer', text)}
                        onBlur={() => validateCorrectAnswerOnBlur(index)}
                    />
                    {!q.isValid && (
                        <Text style={styles.validationError}>Correct answer must be one of the options (case insensitive).</Text>
                    )}
                </View>
            ))}
            <TouchableOpacity style={styles.addButton} onPress={addNewQuestion}>
                <Text style={styles.addButtonText}>+ Add Question</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitButton} onPress={handleAddQuiz}>
                <Text style={styles.submitButtonText}>Add Quiz</Text>
            </TouchableOpacity>

            <Text style={styles.title}>Available Quizzes</Text>
            <TextInput style={styles.input} placeholder="Search by name" value={searchQuery} onChangeText={handleSearch} />
            <TextInput style={styles.input} placeholder="Filter by category" value={selectedCategory} onChangeText={handleCategorySelect} />

            <FlatList
                data={filteredQuizzes}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <View style={styles.quizItem}>
                        <Text style={styles.quizName}>{item.name}</Text>
                        <Text style={styles.quizCategory}>Category: {item.category}</Text>
                        <Text style={styles.quizDescription}>Description: {item.description}</Text>
                        <Text style={styles.quizPoints}>Points: {item.points}</Text>
                        <Text style={styles.quizLevel}>Level: {item.level}</Text>
                        <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteQuiz(item.id)}>
                            <Text style={styles.deleteButtonText}>Delete</Text>
                        </TouchableOpacity>
                    </View>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F4F6F8',
        paddingHorizontal: 20,
    },
    title: {
        fontSize: 26,
        color: '#333',
        textAlign: 'center',
        marginVertical: 20,
    },
    subHeading: {
        fontSize: 18,
        color: '#333',
        marginVertical: 10,
    },
    input: {
        backgroundColor: '#fff',
        color: '#333',
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderRadius: 10,
        marginBottom: 10,
        fontSize: 15,
    },
    questionContainer: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 10,
        marginBottom: 15,
    },
    questionCounter: {
        fontSize: 16,
        color: '#333',
    },
    addButton: {
        backgroundColor: '#F7C948',
        paddingVertical: 8,
        borderRadius: 10,
        alignItems: 'center',
        marginVertical: 10,
    },
    addButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    submitButton: {
        backgroundColor: '#FF5A5F',
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
        marginBottom: 20,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
    },
    quizItem: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
        borderColor: '#ddd',
        borderWidth: 1,
    },
    quizName: {
        fontSize: 18,
        color: '#333',
    },
    quizCategory: {
        fontSize: 14,
        color: '#666',
        marginVertical: 5,
    },
    quizDescription: {
        fontSize: 14,
        color: '#555',
    },
    quizPoints: {
        fontSize: 14,
        color: '#333',
        marginTop: 5,
    },
    quizLevel: {
        fontSize: 14,
        color: '#333',
        marginTop: 5,
    },
    deleteButton: {
        backgroundColor: '#FF5A5F',
        padding: 8,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 10,
    },
    deleteButtonText: {
        color: '#fff',
    },
    validationError: {
        color: '#FF5A5F',
        fontSize: 12,
        marginTop: 5,
    },
});

