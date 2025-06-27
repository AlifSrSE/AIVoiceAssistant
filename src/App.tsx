import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, addDoc, setDoc, updateDoc, deleteDoc, onSnapshot, query, where } from 'firebase/firestore';

declare const __app_id: string | undefined;
declare const __firebase_config: string | undefined;
declare const __initial_auth_token: string | undefined;

// Global variables for Firebase configuration provided by the environment
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

const SpeechRecognition =
    typeof window !== 'undefined'
        ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
        : undefined;
const SpeechSynthesis =
    typeof window !== 'undefined'
        ? window.speechSynthesis
        : undefined;

const sanitizeText = (text: string) => {
    return text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
};

// Main App component
const App = () => {
    const [listening, setListening] = useState(false);
    const [spokenText, setSpokenText] = useState('');
    const [assistantResponse, setAssistantResponse] = useState('Hello! How can I help you today?');
    const [todos, setTodos] = useState<any[]>([]);
    const [newTodo, setNewTodo] = useState('');
    const [userId, setUserId] = useState<string | null>(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const recognitionRef = useRef<any>(null);
    const dbRef = useRef<any>(null);
    const authRef = useRef<any>(null);

    const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

    useEffect(() => {
        if (!window.speechSynthesis) return;
        const loadVoices = () => {
            const voices = window.speechSynthesis.getVoices();
            setAvailableVoices(voices);
        };
        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;
        return () => {
            window.speechSynthesis.onvoiceschanged = null;
        };
    }, []);

    // Function to speak text using SpeechSynthesis API
    const speak = (text: string, voiceName?: string) => {
        if (!window.speechSynthesis) {
          setAssistantResponse('Speech synthesis is not supported in this browser.');
          return;
        }
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1;
        utterance.pitch = 1;

        let selectedVoice: SpeechSynthesisVoice | undefined;
        if (voiceName && availableVoices.length > 0) {
            selectedVoice = availableVoices.find(voice => voice.name === voiceName);
            if (selectedVoice) {
                utterance.voice = selectedVoice;
            } else {
                console.warn(`Voice "${voiceName}" not found. Using default voice.`);
            }
        }

        utterance.onerror = (event) => {
            console.error('SpeechSynthesisUtterance.onerror', event);
            setAssistantResponse('Sorry, I encountered an error speaking.');
        };

        window.speechSynthesis.speak(utterance);
    };

    // Initialize Firebase and set up authentication
    useEffect(() => {
        try {
            const app = initializeApp(firebaseConfig);
            const auth = getAuth(app);
            const db = getFirestore(app);

            authRef.current = auth;
            dbRef.current = db;

            const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
                if (user) {
                    setUserId(user.uid);
                    setIsAuthReady(true);
                    console.log("Firebase Auth Ready. User ID:", user.uid);
                } else {
                    if (initialAuthToken) {
                        try {
                            await signInWithCustomToken(auth, initialAuthToken);
                            console.log("Signed in with custom token.");
                        } catch (error) {
                            console.error("Error signing in with custom token:", error);
                            try {
                                await signInAnonymously(auth);
                                console.log("Signed in anonymously due to custom token failure.");
                            } catch (anonError) {
                                console.error("Error signing in anonymously:", anonError);
                                setAssistantResponse("Failed to authenticate with Firebase.");
                            }
                        }
                    } else {
                        try {
                            await signInAnonymously(auth);
                            console.log("Signed in anonymously.");
                        } catch (error) {
                            console.error("Error signing in anonymously:", error);
                            setAssistantResponse("Failed to authenticate with Firebase.");
                        }
                    }
                }
            });

            return () => {
                unsubscribeAuth();
            };
        } catch (error) {
            console.error("Failed to initialize Firebase:", error);
            setAssistantResponse("Failed to initialize the application. Please check console for details.");
        }
    }, []);

    useEffect(() => {
        if (!SpeechRecognition) {
            setAssistantResponse('Speech Recognition is not supported in this browser.');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            setListening(true);
            setSpokenText('');
            console.log('Voice recognition started...');
        };

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setSpokenText(transcript);
            processCommand(transcript);
        };

        recognition.onerror = (event: any) => {
            console.error('Speech recognition error', event.error);
            setListening(false);
            setAssistantResponse('Sorry, I did not catch that. Please try again.');
            speak('Sorry, I did not catch that. Please try again.');
        };

        recognition.onend = () => {
            setListening(false);
            console.log('Voice recognition ended.');
        };

        recognitionRef.current = recognition;

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, []);

    // Effect for real-time Firestore todo list updates
    useEffect(() => {
        if (isAuthReady && userId && dbRef.current) {
            const todosCollectionRef = collection(dbRef.current, `artifacts/${appId}/users/${userId}/todos`);
            const q = query(todosCollectionRef);

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const fetchedTodos = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                fetchedTodos.sort((a: any, b: any) => (a.createdAt?.toDate() || 0) - (b.createdAt?.toDate() || 0));
                setTodos(fetchedTodos);
                console.log("Todos fetched:", fetchedTodos);
            }, (error) => {
                console.error("Error fetching todos:", error);
                setAssistantResponse("Failed to load your to-do list.");
            });
            return () => unsubscribe();
        }
    }, [isAuthReady, userId]);

    const processCommand = (command: string) => {
        const lowerCommand = command.toLowerCase();
        let response = '';

        if (lowerCommand.includes('hello') || lowerCommand.includes('hi assistant')) {
            response = 'Hello there! How can I assist you?';
        } else if (lowerCommand.includes('what time is it')) {
            const date = new Date();
            response = `The current time is ${date.toLocaleTimeString()}.`;
        } else if (lowerCommand.includes('add a todo') || lowerCommand.includes('add to do') || lowerCommand.includes('create a todo')) {
            const todoMatch = lowerCommand.match(/(?:add|create)\s+a\s+to\s*do\s+(?:item\s+)?(.*?)(?:\.|$)/);
            if (todoMatch && todoMatch[1]) {
                const task = todoMatch[1].trim();
                handleAddTodo(task);
                response = `Okay, I've added "${task}" to your to-do list.`;
            } else {
                response = "What would you like to add to your to-do list?";
            }
        } else if (lowerCommand.includes('show my todo list') || lowerCommand.includes('what are my todos')) {
            if (todos.length > 0) {
                const todoList = todos.map((todo: any, index: number) => `${index + 1}. ${todo.task}`).join(', ');
                response = `Here are your to-do items: ${todoList}.`;
            } else {
                response = "You don't have any to-do items yet.";
            }
        } else if (lowerCommand.includes('mark todo as complete') || lowerCommand.includes('complete todo')) {
            const markMatch = lowerCommand.match(/(?:mark|complete)\s+todo\s+(\d+)/);
            if (markMatch && markMatch[1]) {
                const todoIndex = parseInt(markMatch[1]) - 1;
                if (todoIndex >= 0 && todoIndex < todos.length) {
                    const todoId = todos[todoIndex].id;
                    handleToggleTodo(todoId, true); // Mark as complete
                    response = `Okay, I've marked "${todos[todoIndex].task}" as complete.`;
                } else {
                    response = "I couldn't find a to-do item with that number. Please specify a valid number.";
                }
            } else {
                response = "Which to-do item would you like to mark as complete? Please say 'mark todo as complete number X'.";
            }
        } else if (lowerCommand.includes('delete todo') || lowerCommand.includes('remove todo')) {
            const deleteMatch = lowerCommand.match(/(?:delete|remove)\s+todo\s+(\d+)/);
            if (deleteMatch && deleteMatch[1]) {
                const todoIndex = parseInt(deleteMatch[1]) - 1;
                if (todoIndex >= 0 && todoIndex < todos.length) {
                    const todoId = todos[todoIndex].id;
                    handleDeleteTodo(todoId);
                    response = `I've removed "${todos[todoIndex].task}" from your to-do list.`;
                } else {
                    response = "I couldn't find a to-do item with that number. Please specify a valid number.";
                }
            } else {
                response = "Which to-do item would you like to delete? Please say 'delete todo number X'.";
            }
        } else if (lowerCommand.includes('switch to female voice')) {
        const femaleVoice = availableVoices.find(voice => voice.name.toLowerCase().includes('female') && voice.lang === 'en-US');
          if (femaleVoice) {
              response = 'Switching to a female voice.';
              speak(response, femaleVoice.name);
              return;
          } else {
              response = 'Sorry, a suitable female voice is not available.';
          }
        } else if (lowerCommand.includes('switch to male voice')) {
            const maleVoice = availableVoices.find(voice => voice.name.toLowerCase().includes('male') && voice.lang === 'en-US');
            if (maleVoice) {
                response = 'Switching to a male voice.';
                speak(response, maleVoice.name);
                return;
            } else {
                response = 'Sorry, a suitable male voice is not available.';
            }
        }
        else {
            response = `I understand you said "${command}". I am still learning, but for now, I can tell time and manage your to-do list.`;
        }

        setAssistantResponse(response);
        speak(response);
    };

    // Start listening
    const startListening = () => {
        if (recognitionRef.current) {
            recognitionRef.current.start();
        } else {
            setAssistantResponse("Speech recognition not ready. Please try again.");
        }
    };

    // Stop listening
    const stopListening = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
    };

    // Firestore CRUD operations for Todo List
    const handleAddTodo = async (taskText: string) => {
        if (!userId || !dbRef.current) {
            setAssistantResponse("Authentication not ready. Cannot add to-do.");
            return;
        }
        if (!taskText.trim()) {
            setAssistantResponse("To-do task cannot be empty.");
            return;
        }
        try {
            const todosCollectionRef = collection(dbRef.current, `artifacts/${appId}/users/${userId}/todos`);
            await addDoc(todosCollectionRef, {
                task: taskText.trim(),
                completed: false,
                createdAt: new Date(),
            });
            setNewTodo('');
            setAssistantResponse("To-do added successfully!");
        } catch (error) {
            console.error("Error adding to-do:", error);
            setAssistantResponse("Failed to add to-do.");
        }
    };

    const handleToggleTodo = async (id: string, completed: boolean) => {
        if (!userId || !dbRef.current) {
            setAssistantResponse("Authentication not ready. Cannot update to-do.");
            return;
        }
        try {
            const todoDocRef = doc(dbRef.current, `artifacts/${appId}/users/${userId}/todos`, id);
            await updateDoc(todoDocRef, { completed: completed });
            setAssistantResponse("To-do updated!");
        } catch (error) {
            console.error("Error updating to-do:", error);
            setAssistantResponse("Failed to update to-do.");
        }
    };

    const handleDeleteTodo = async (id: string) => {
        if (!userId || !dbRef.current) {
            setAssistantResponse("Authentication not ready. Cannot delete to-do.");
            return;
        }
        try {
            const todoDocRef = doc(dbRef.current, `artifacts/${appId}/users/${userId}/todos`, id);
            await deleteDoc(todoDocRef);
            setAssistantResponse("To-do deleted!");
        } catch (error) {
            console.error("Error deleting to-do:", error);
            setAssistantResponse("Failed to delete to-do.");
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 text-white flex flex-col items-center justify-center p-4 font-inter">
            <div className="w-full max-w-4xl bg-gray-800 bg-opacity-70 backdrop-blur-sm rounded-xl shadow-2xl p-6 md:p-8">
                {/* User ID display */}
                {userId && (
                    <div className="text-sm text-gray-400 mb-4 break-words">
                        User ID: <span className="font-mono text-blue-300">{userId}</span>
                    </div>
                )}

                {/* Assistant Display */}
                <div className="bg-gray-900 rounded-lg p-6 mb-8 shadow-inner border border-gray-700">
                    <h1 className="text-3xl font-bold text-center mb-4 text-blue-300">
                        AI Voice Assistant
                    </h1>
                    <div className="text-lg text-center text-gray-200 min-h-[4rem] flex items-center justify-center">
                        {sanitizeText(assistantResponse)}
                    </div>
                    {spokenText && (
                        <div className="text-sm text-center text-gray-400 mt-2 italic">
                            You said: "{sanitizeText(spokenText)}"
                        </div>
                    )}
                </div>

                {/* Voice Control Buttons */}
                <div className="flex justify-center space-x-4 mb-8">
                    <button
                        onClick={startListening}
                        disabled={listening}
                        className={`px-8 py-3 rounded-full text-lg font-semibold transition-all duration-300 transform ${
                            listening
                                ? 'bg-red-600 animate-pulse cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700 hover:scale-105 active:scale-95'
                        } shadow-lg`}
                    >
                        {listening ? 'Listening...' : 'Start Voice Command'}
                    </button>
                    <button
                        onClick={stopListening}
                        disabled={!listening}
                        className={`px-8 py-3 rounded-full text-lg font-semibold transition-all duration-300 transform ${
                            !listening
                                ? 'bg-gray-500 cursor-not-allowed'
                                : 'bg-purple-600 hover:bg-purple-700 hover:scale-105 active:scale-95'
                        } shadow-lg`}
                    >
                        Stop Listening
                    </button>
                </div>

                {/* To-Do List Section */}
                <div className="bg-gray-700 bg-opacity-50 rounded-xl p-6 shadow-xl border border-gray-600">
                    <h2 className="text-2xl font-bold mb-4 text-center text-teal-300">Your To-Do List</h2>
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                        <input
                            type="text"
                            className="flex-grow p-3 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Add a new to-do item..."
                            value={newTodo}
                            onChange={(e) => setNewTodo(e.target.value)}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                    handleAddTodo(newTodo);
                                }
                            }}
                        />
                        <button
                            onClick={() => handleAddTodo(newTodo)}
                            className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-transform transform hover:scale-105 active:scale-95 shadow-md"
                        >
                            Add To-Do
                        </button>
                    </div>

                    {todos.length === 0 ? (
                        <p className="text-center text-gray-400 italic">No to-do items yet. Try adding one!</p>
                    ) : (
                        <ul className="space-y-3">
                            {todos.map((todo: any, index: number) => (
                                <li
                                    key={todo.id}
                                    className={`flex items-center justify-between p-4 rounded-lg shadow-md transition-all duration-200 ${
                                        todo.completed ? 'bg-gray-600 line-through text-gray-400' : 'bg-gray-800 text-white'
                                    }`}
                                >
                                    <span className="flex-grow text-lg">
                                        {index + 1}. {sanitizeText(todo.task)}
                                    </span>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => handleToggleTodo(todo.id, !todo.completed)}
                                            className={`p-2 rounded-full ${
                                                todo.completed
                                                    ? 'bg-yellow-500 hover:bg-yellow-600'
                                                    : 'bg-indigo-500 hover:bg-indigo-600'
                                            } text-white transition-transform transform hover:scale-110 active:scale-90 shadow-sm`}
                                            title={todo.completed ? 'Mark as Incomplete' : 'Mark as Complete'}
                                        >
                                            {todo.completed ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-rotate-ccw"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check-circle"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => handleDeleteTodo(todo.id)}
                                            className="p-2 rounded-full bg-red-500 hover:bg-red-600 text-white transition-transform transform hover:scale-110 active:scale-90 shadow-sm"
                                            title="Delete To-Do"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};

export default App;