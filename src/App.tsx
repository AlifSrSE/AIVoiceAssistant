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

// Define backend URL (Flask backend)
const BACKEND_URL = 'http://127.0.0.1:5000';

// Main App component
const App = () => {
    const [listening, setListening] = useState(false);
    const [spokenText, setSpokenText] = useState('');
    const [assistantResponse, setAssistantResponse] = useState('Hello! How can I help you today?');
    const [todos, setTodos] = useState<any[]>([]);
    const [newTodo, setNewTodo] = useState('');
    const [userId, setUserId] = useState<string | null>(null);
    const [isAuthReady, setIsAuthReady] = useState(false);

    const [weatherData, setWeatherData] = useState<any>(null);
    const [loadingWeather, setLoadingWeather] = useState(false);
    const [newsArticles, setNewsArticles] = useState<any[]>([]);
    const [loadingNews, setLoadingNews] = useState(false);
    const [wikipediaData, setWikipediaData] = useState<any>(null);
    const [loadingWikipedia, setLoadingWikipedia] = useState(false);
    const [dictionaryData, setDictionaryData] = useState<any>(null);
    const [loadingDictionary, setLoadingDictionary] = useState(false);
    const [youtubeResults, setYoutubeResults] = useState<any[]>([]);
    const [loadingYouTube, setLoadingYouTube] = useState(false);
    const [currentPlayingVideoId, setCurrentPlayingVideoId] = useState<string | null>(null);
    const [sendingEmail, setSendingEmail] = useState(false);
    const [emailStatusMessage, setEmailStatusMessage] = useState<string | null>(null);

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

    // Speak text using SpeechSynthesis API
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

    // Weather data from the Python backend
    const fetchWeather = async (city: string) => {
        setLoadingWeather(true);
        setAssistantResponse(`Fetching weather for ${city}...`);
        try {
            const response = await fetch(`${BACKEND_URL}/weather?city=${encodeURIComponent(city)}`);
            const data = await response.json();

            if (response.ok) {
                setWeatherData(data);
                const weatherText = `The weather in ${data.city} is ${data.description} with a temperature of ${Math.round(data.temperature)} degrees Celsius. Wind speed is ${Math.round(data.wind_speed)} meters per second, and humidity is ${data.humidity} percent.`;
                setAssistantResponse(weatherText);
                speak(weatherText); // Speak the weather report
            } else {
                setAssistantResponse(`Sorry, I couldn't get the weather for ${city}. ${data.error || 'Please try again later.'}`);
                speak(`Sorry, I couldn't get the weather for ${city}.`);
                setWeatherData(null); // Clear previous weather data
            }
        } catch (error) {
            console.error("Error fetching weather:", error);
            setAssistantResponse("There was a problem connecting to the weather service. Please ensure the backend is running and check your internet connection.");
            speak("There was a problem connecting to the weather service. Please ensure the backend is running and check your internet connection.");
            setWeatherData(null);
        } finally {
            setLoadingWeather(false);
        }
    };

    // News data from the Python backend
    const fetchNews = async (query: string = '') => {
        setLoadingNews(true);
        setNewsArticles([]);
        setAssistantResponse(query ? `Fetching news about ${query}...` : 'Fetching top headlines...');
        try {
            const params = new URLSearchParams();
            if (query) {
                params.append('query', query);
            }

            const response = await fetch(`${BACKEND_URL}/news?${params.toString()}`);
            const data = await response.json();

            if (response.ok && data.articles && data.articles.length > 0) {
                setNewsArticles(data.articles);
                const firstArticleTitle = data.articles[0].title;
                setAssistantResponse(`Here's the top news: "${firstArticleTitle}" and more.`);
                speak(`Here's the top news: "${firstArticleTitle}" and more.`);
            } else {
                setAssistantResponse(`Sorry, I couldn't find any news ${query ? 'about ' + query : ''}. ${data.error || 'Please try again later.'}`);
                speak(`Sorry, I couldn't find any news ${query ? 'about ' + query : ''}.`);
                setNewsArticles([]);
            }
        } catch (error) {
            console.error("Error fetching news:", error);
            setAssistantResponse("There was a problem connecting to the news service. Please ensure the backend is running and check your internet connection.");
            speak("There was a problem connecting to the news service. Please ensure the backend is running and check your internet connection.");
            setNewsArticles([]);
        } finally {
            setLoadingNews(false);
        }
    };

    // Wikipedia data from the Python backend
    const fetchWikipedia = async (query: string) => {
        setLoadingWikipedia(true);
        setWikipediaData(null);
        setAssistantResponse(`Searching Wikipedia for "${query}"...`);
        try {
            const response = await fetch(`${BACKEND_URL}/wikipedia?query=${encodeURIComponent(query)}`);
            const data = await response.json();

            if (response.ok && data.summary) {
                setWikipediaData(data);
                const wikipediaText = `According to Wikipedia, ${data.summary}`;
                setAssistantResponse(wikipediaText);
                speak(wikipediaText);
            } else {
                setAssistantResponse(`Sorry, I couldn't find a Wikipedia page for "${query}". ${data.error || ''}`);
                speak(`Sorry, I couldn't find a Wikipedia page for "${query}".`);
                setWikipediaData(null);
            }
        } catch (error) {
            console.error("Error fetching Wikipedia data:", error);
            setAssistantResponse("There was a problem connecting to the Wikipedia service. Please ensure the backend is running and check your internet connection.");
            speak("There was a problem connecting to the Wikipedia service. Please ensure the backend is running and check your internet connection.");
            setWikipediaData(null);
        } finally {
            setLoadingWikipedia(false);
        }
    };

    // Dictionary definition from the Python backend
    const fetchDictionaryDefinition = async (word: string) => {
        setLoadingDictionary(true);
        setDictionaryData(null);
        setAssistantResponse(`Looking up "${word}" in the dictionary...`);
        try {
            const response = await fetch(`${BACKEND_URL}/dictionary?word=${encodeURIComponent(word)}`);
            const data = await response.json();

            if (response.ok && data.definitions && data.definitions.length > 0) {
                setDictionaryData(data);
                let textResponse = '';
                if (data.corrected_word) {
                    textResponse = `Did you mean "${data.corrected_word}"? The definition of ${data.corrected_word} is: `;
                } else {
                    textResponse = `The definition of ${data.original_word} is: `;
                }
                textResponse += data.definitions[0].meanings[0];
                setAssistantResponse(textResponse);
                speak(textResponse);
            } else {
                let errorResponse = `Sorry, I couldn't find a definition for "${word}".`;
                if (data.suggestion) {
                    errorResponse += ` Did you mean "${data.suggestion}"?`;
                }
                setAssistantResponse(errorResponse);
                speak(errorResponse);
                setDictionaryData(null);
            }
        } catch (error) {
            console.error("Error fetching dictionary data:", error);
            setAssistantResponse("There was a problem connecting to the dictionary service. Please ensure the backend is running and check your internet connection.");
            speak("There was a problem connecting to the dictionary service. Please ensure the backend is running and check your internet connection.");
            setDictionaryData(null);
        } finally {
            setLoadingDictionary(false);
        }
    };

    // YouTube videos from the Python backend
    const fetchYouTubeVideos = async (query: string, autoPlayFirst: boolean = false) => {
        setLoadingYouTube(true);
        setYoutubeResults([]);
        setCurrentPlayingVideoId(null);
        setAssistantResponse(`Searching YouTube for "${query}"...`);
        try {
            const response = await fetch(`${BACKEND_URL}/youtube/search?query=${encodeURIComponent(query)}`);
            const data = await response.json();

            if (response.ok && data.videos && data.videos.length > 0) {
                setYoutubeResults(data.videos);
                const firstVideoTitle = data.videos[0].title;
                setAssistantResponse(`I found "${firstVideoTitle}" and more videos on YouTube.`);
                speak(`I found "${firstVideoTitle}" and more videos on YouTube.`);
                if (autoPlayFirst) {
                    setCurrentPlayingVideoId(data.videos[0].id);
                    setAssistantResponse(`Now playing "${firstVideoTitle}".`);
                    speak(`Now playing "${firstVideoTitle}".`);
                }
            } else {
                setAssistantResponse(`Sorry, I couldn't find any YouTube videos for "${query}". ${data.error || ''}`);
                speak(`Sorry, I couldn't find any YouTube videos for "${query}".`);
                setYoutubeResults([]);
            }
        } catch (error) {
            console.error("Error fetching YouTube videos:", error);
            setAssistantResponse("There was a problem connecting to the YouTube service. Please ensure the backend is running and check your internet connection.");
            speak("There was a problem connecting to the YouTube service. Please ensure the backend is running and check your internet connection.");
            setYoutubeResults([]);
        } finally {
            setLoadingYouTube(false);
        }
    };
    
    // Send an email via the Python backend
    const sendEmailCommand = async (recipient: string, subject: string, body: string) => {
        setSendingEmail(true);
        setEmailStatusMessage(null); // Clear previous status
        setAssistantResponse(`Sending email to ${recipient}...`);
        speak(`Sending email to ${recipient}...`);
        try {
            const response = await fetch(`${BACKEND_URL}/send-email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ recipient_email: recipient, subject: subject, body: body }),
            });
            const data = await response.json();

            if (response.ok) {
                setEmailStatusMessage(`Email sent successfully to ${recipient}!`);
                setAssistantResponse(`Email sent successfully to ${recipient}!`);
                speak(`Email sent successfully to ${recipient}!`);
            } else {
                setEmailStatusMessage(`Failed to send email: ${data.error || 'Unknown error.'}`);
                setAssistantResponse(`Failed to send email: ${data.error || 'Unknown error.'}`);
                speak(`Failed to send email: ${data.error || 'Unknown error.'}`);
            }
        } catch (error) {
            console.error("Error sending email:", error);
            setEmailStatusMessage("There was a problem connecting to the email service. Please ensure the backend is running and configured correctly.");
            setAssistantResponse("There was a problem connecting to the email service. Please ensure the backend is running and configured correctly.");
            speak("There was a problem connecting to the email service. Please ensure the backend is running and configured correctly.");
        } finally {
            setSendingEmail(false);
        }
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
                    handleToggleTodo(todoId, true);
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
        } else if (lowerCommand.includes('what is the weather in')) {
            const cityMatch = lowerCommand.match(/what is the weather in (.+)/);
            if (cityMatch && cityMatch[1]) {
                const city = cityMatch[1].trim();
                fetchWeather(city);
            } else {
                response = "For which city would you like to know the weather?";
                setAssistantResponse(response);
                speak(response);
            }
        } else if (lowerCommand.includes('what is the news') || lowerCommand.includes('tell me the news')) {
            const queryMatch = lowerCommand.match(/(?:what is the news about|tell me the news about)\s+(.+)/);
            if (queryMatch && queryMatch[1]) {
                const query = queryMatch[1].trim();
                fetchNews(query);
            } else {
                fetchNews();
            }
        } else if (lowerCommand.includes('tell me about') || lowerCommand.includes('who is') || lowerCommand.includes('what is')) {
            let query = '';
            if (lowerCommand.includes('tell me about')) {
                query = lowerCommand.replace('tell me about', '').trim();
            } else if (lowerCommand.includes('who is')) {
                query = lowerCommand.replace('who is', '').trim();
            } else if (lowerCommand.includes('what is')) {
                query = lowerCommand.replace('what is', '').trim();
            }

            if (query) {
                fetchWikipedia(query);
            } else {
                response = "What topic or person would you like to know about?";
                setAssistantResponse(response);
                speak(response);
            }
        } else if (lowerCommand.includes('define') || lowerCommand.includes('what does mean')) {
            let word = '';
            const defineMatch = lowerCommand.match(/define\s+(.+)/);
            const whatDoesMatch = lowerCommand.match(/what does\s+(.+)\s+mean/);

            if (defineMatch && defineMatch[1]) {
                word = defineMatch[1].trim();
            } else if (whatDoesMatch && whatDoesMatch[1]) {
                word = whatDoesMatch[1].trim();
            }

            if (word) {
                fetchDictionaryDefinition(word);
            } else {
                response = "Which word would you like me to define?";
                setAssistantResponse(response);
                speak(response);
            }
        } else if (lowerCommand.includes('search youtube for') || lowerCommand.includes('find on youtube')) {
            const queryMatch = lowerCommand.match(/(?:search youtube for|find on youtube)\s+(.+)/);
            if (queryMatch && queryMatch[1]) {
                const query = queryMatch[1].trim();
                fetchYouTubeVideos(query, false);
            } else {
                response = "What would you like to search for on YouTube?";
                setAssistantResponse(response);
                speak(response);
            }
        } else if (lowerCommand.includes('play')) {
            const playMatch = lowerCommand.match(/play\s+(.+)/);
            if (playMatch && playMatch[1]) {
                const query = playMatch[1].trim();
                fetchYouTubeVideos(query, true);
            } else {
                response = "What would you like me to play?";
                setAssistantResponse(response);
                speak(response);
            }
        } else if (lowerCommand.includes('send an email to')) {
            const emailMatch = lowerCommand.match(/send an email to\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\s+with subject\s+(.+?)\s+and message\s+(.+)/);

            if (emailMatch && emailMatch[1] && emailMatch[2] && emailMatch[3]) {
                const recipient = emailMatch[1].trim();
                const subject = emailMatch[2].trim();
                const body = emailMatch[3].trim();
                sendEmailCommand(recipient, subject, body);
            } else {
                response = "I couldn't understand the email command. Please say 'send an email to [recipient email] with subject [subject] and message [body]'.";
                setAssistantResponse(response);
                speak(response);
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
        } else if (lowerCommand.includes('open website')) {
            const urlMatch = lowerCommand.match(/open website (.*?)(?:\.|$)/);
            if (urlMatch && urlMatch[1]) {
                let url = urlMatch[1].trim();
                if (!url.startsWith('http://') && !url.startsWith('https://')) {
                    url = 'http://' + url;
                }
                try {
                    window.open(url, '_blank');
                    response = `Opening ${url}.`;
                } catch (e) {
                    console.error("Failed to open URL:", e);
                    response = `Sorry, I couldn't open ${url}.`;
                }
            } else {
                response = "Which website would you like to open? Please say 'open website example dot com'.";
            }
            setAssistantResponse(response);
            speak(response);
        }  else {
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

     const playVideo = (videoId: string) => {
        setCurrentPlayingVideoId(videoId);
        setAssistantResponse(`Now playing the selected video.`);
        speak(`Now playing the selected video.`);
    };

    const closeVideoPlayer = () => {
        setCurrentPlayingVideoId(null);
        setAssistantResponse("Video player closed.");
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
                        {loadingWeather || loadingNews || loadingWikipedia || loadingDictionary || loadingYouTube || sendingEmail ? (
                            <div className="flex items-center space-x-2">
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>{assistantResponse}</span>
                            </div>
                        ) : (
                            sanitizeText(assistantResponse)
                        )}
                    </div>
                    {/* <div className="text-lg text-center text-gray-200 min-h-[4rem] flex items-center justify-center">
                        {sanitizeText(assistantResponse)}
                    </div> */}
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

                {/* Weather Display */}
                {weatherData && (
                    <div className="bg-gray-700 bg-opacity-50 rounded-xl p-6 shadow-xl border border-gray-600 mb-8">
                        <h2 className="text-2xl font-bold mb-4 text-center text-orange-300">Weather in {weatherData.city}, {weatherData.country}</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-lg">
                            <div><span className="font-semibold">Temperature:</span> {Math.round(weatherData.temperature)}°C ({Math.round(weatherData.feels_like)}°C feels like)</div>
                            <div><span className="font-semibold">Description:</span> {weatherData.description}</div>
                            <div><span className="font-semibold">Humidity:</span> {weatherData.humidity}%</div>
                            <div><span className="font-semibold">Wind Speed:</span> {Math.round(weatherData.wind_speed)} m/s</div>
                            {weatherData.icon && (
                                <div className="col-span-full flex justify-center mt-4">
                                    <img
                                        src={`http://openweathermap.org/img/wn/${weatherData.icon}@2x.png`}
                                        alt={weatherData.description}
                                        className="w-24 h-24"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* News Display */}
                {newsArticles.length > 0 && (
                    <div className="bg-gray-700 bg-opacity-50 rounded-xl p-6 shadow-xl border border-gray-600 mb-8">
                        <h2 className="text-2xl font-bold mb-4 text-center text-cyan-300">Latest News</h2>
                        <ul className="space-y-4">
                            {newsArticles.map((article: any, index: number) => (
                                <li key={index} className="bg-gray-800 p-4 rounded-lg shadow-inner">
                                    <h3 className="text-xl font-semibold text-blue-200 mb-1">{sanitizeText(article.title)}</h3>
                                    {article.source && <p className="text-sm text-gray-400 mb-2">Source: {sanitizeText(article.source)}</p>}
                                    {article.description && <p className="text-gray-300 text-base">{sanitizeText(article.description)}</p>}
                                    {article.url && (
                                        <a
                                            href={article.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-400 hover:underline mt-2 inline-block text-sm"
                                        >
                                            Read more
                                        </a>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Wikipedia Display */}
                {wikipediaData && (
                    <div className="bg-gray-700 bg-opacity-50 rounded-xl p-6 shadow-xl border border-gray-600 mb-8">
                        <h2 className="text-2xl font-bold mb-4 text-center text-purple-300">
                            Wikipedia: {sanitizeText(wikipediaData.title)}
                        </h2>
                        <p className="text-gray-300 text-base leading-relaxed mb-4">
                            {sanitizeText(wikipediaData.summary)}
                        </p>
                        {wikipediaData.full_url && (
                            <div className="text-center">
                                <a
                                    href={wikipediaData.full_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-400 hover:underline inline-block text-lg font-medium"
                                >
                                    Read Full Article on Wikipedia
                                </a>
                            </div>
                        )}
                    </div>
                )}

                {/* Dictionary Display */}
                {dictionaryData && (
                    <div className="bg-gray-700 bg-opacity-50 rounded-xl p-6 shadow-xl border border-gray-600 mb-8">
                        <h2 className="text-2xl font-bold mb-4 text-center text-indigo-300">
                            {sanitizeText(dictionaryData.original_word)}
                            {dictionaryData.corrected_word && (
                                <span className="text-sm text-gray-400 block mt-1">
                                    (Did you mean: {sanitizeText(dictionaryData.corrected_word)}?)
                                </span>
                            )}
                        </h2>
                        {dictionaryData.definitions.map((defGroup: any, defIndex: number) => (
                            <div key={defIndex} className="mb-4 last:mb-0">
                                <h3 className="text-xl font-semibold text-gray-200 mb-2">
                                    {sanitizeText(defGroup.part_of_speech)}:
                                </h3>
                                <ul className="list-disc list-inside space-y-1 text-gray-300 ml-4">
                                    {defGroup.meanings.map((meaning: string, meaningIndex: number) => (
                                        <li key={meaningIndex}>{sanitizeText(meaning)}</li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                )}

                {/* NEW: YouTube Video Player */}
                {currentPlayingVideoId && (
                    <div className="bg-gray-700 bg-opacity-50 rounded-xl p-6 shadow-xl border border-gray-600 mb-8 relative">
                        <h2 className="text-2xl font-bold mb-4 text-center text-red-400">Now Playing</h2>
                        <button
                            onClick={closeVideoPlayer}
                            className="absolute top-2 right-2 p-2 rounded-full bg-red-600 hover:bg-red-700 text-white transition-transform transform hover:scale-110 active:scale-90"
                            title="Close Video"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                        </button>
                        <div className="relative" style={{ paddingBottom: '56.25%', height: 0 }}>
                            <iframe
                                src={`https://www.youtube.com/embed/${currentPlayingVideoId}?autoplay=1`}
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                className="absolute top-0 left-0 w-full h-full rounded-lg"
                            ></iframe>
                        </div>
                    </div>
                )}

                {/* YouTube Search Results */}
                {youtubeResults.length > 0 && !currentPlayingVideoId && (
                    <div className="bg-gray-700 bg-opacity-50 rounded-xl p-6 shadow-xl border border-gray-600 mb-8">
                        <h2 className="text-2xl font-bold mb-4 text-center text-pink-300">YouTube Search Results</h2>
                        <ul className="space-y-4">
                            {youtubeResults.map((video: any, index: number) => (
                                <li key={video.id} className="bg-gray-800 p-4 rounded-lg shadow-inner flex flex-col md:flex-row items-center space-y-3 md:space-y-0 md:space-x-4">
                                    {video.thumbnail && (
                                        <img
                                            src={video.thumbnail}
                                            alt={video.title}
                                            className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
                                        />
                                    )}
                                    <div className="flex-grow text-center md:text-left">
                                        <h3 className="text-xl font-semibold text-red-200 mb-1">{sanitizeText(video.title)}</h3>
                                        {video.description && <p className="text-gray-300 text-sm line-clamp-2">{sanitizeText(video.description)}</p>}
                                    </div>
                                    <button
                                        onClick={() => playVideo(video.id)}
                                        className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-semibold text-white transition-transform transform hover:scale-105 active:scale-95 shadow-md flex items-center justify-center space-x-2 flex-shrink-0"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-play"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                                        <span>Play</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Email Status Display */}
                {emailStatusMessage && (
                    <div className={`rounded-xl p-4 mb-8 text-center font-semibold ${
                        emailStatusMessage.includes('successfully') ? 'bg-green-700 bg-opacity-50 text-green-100' : 'bg-red-700 bg-opacity-50 text-red-100'
                    } shadow-xl border border-gray-600`}>
                        {sanitizeText(emailStatusMessage)}
                    </div>
                )}

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