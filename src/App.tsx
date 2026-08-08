import React, { useState, useEffect } from 'react';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { useSpeechSynthesis } from './hooks/useSpeechSynthesis';
import { useTodos } from './hooks/useTodos';
import { api } from './services/api';
import { WeatherData, NewsArticle, WikipediaData, DictionaryData, YouTubeVideo, MapsResult, Todo, DictionaryDefinition } from './types';

const sanitizeText = (text: string) => {
    return text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
};

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:5000';

// Main App component
const App = () => {
    const [listening, setListening] = useState(false);
    const [spokenText, setSpokenText] = useState('');
    const [assistantResponse, setAssistantResponse] = useState('Hello! How can I help you today?');
    const [newTodo, setNewTodo] = useState('');

    const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
    const [loadingWeather, setLoadingWeather] = useState(false);
    const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([]);
    const [loadingNews, setLoadingNews] = useState(false);
    const [wikipediaData, setWikipediaData] = useState<WikipediaData | null>(null);
    const [loadingWikipedia, setLoadingWikipedia] = useState(false);
    const [dictionaryData, setDictionaryData] = useState<DictionaryData | null>(null);
    const [loadingDictionary, setLoadingDictionary] = useState(false);
    const [youtubeResults, setYoutubeResults] = useState<YouTubeVideo[]>([]);
    const [loadingYouTube, setLoadingYouTube] = useState(false);
    const [currentPlayingVideoId, setCurrentPlayingVideoId] = useState<string | null>(null);
    const [sendingEmail, setSendingEmail] = useState(false);
    const [emailStatusMessage, setEmailStatusMessage] = useState<string | null>(null);
    const [downloadStatus, setDownloadStatus] = useState<string | null>(null);
    const [downloadLink, setDownloadLink] = useState<string | null>(null);
    const [loadingDownload, setLoadingDownload] = useState(false);
    const [mapsResults, setMapsResults] = useState<MapsResult[]>([]);
    const [loadingMaps, setLoadingMaps] = useState(false);
    const [commandHistory, setCommandHistory] = useState<string[]>([]);

    const { todos, addTodo, toggleTodo, deleteTodo } = useTodos();
    const { start: startRecognition, stop: stopRecognition, isListening: recognitionIsListening, isSupported: speechRecognitionSupported } = useSpeechRecognition(
      (transcript) => {
        setSpokenText(transcript);
        processCommand(transcript);
      },
      true
    );
    const { speak, voices } = useSpeechSynthesis();

    useEffect(() => {
      setListening(recognitionIsListening);
    }, [recognitionIsListening]);

    useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
          event.preventDefault();
          if (listening) {
            stopRecognition();
          } else {
            startRecognition();
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }, [listening, startRecognition, stopRecognition]);

    useEffect(() => {
      if (!speechRecognitionSupported) {
        setAssistantResponse('Speech Recognition is not supported in this browser.');
      }
    }, [speechRecognitionSupported]);

    // Weather data from the Python backend
    const fetchWeather = async (city: string) => {
        setLoadingWeather(true);
        setAssistantResponse(`Fetching weather for ${city}...`);
        try {
            const data = await api.getWeather(city);
            setWeatherData(data);
            const weatherText = `The weather in ${data.city} is ${data.description} with a temperature of ${Math.round(data.temperature)} degrees Celsius. Wind speed is ${Math.round(data.wind_speed)} meters per second, and humidity is ${data.humidity} percent.`;
            setAssistantResponse(weatherText);
            speak(weatherText);
        } catch (error: unknown) {
            console.error("Error fetching weather:", error);
            const errorMessage = error instanceof Error ? error.message : 'Please try again later.';
            setAssistantResponse(`Sorry, I couldn't get the weather for ${city}. ${errorMessage}`);
            speak(`Sorry, I couldn't get the weather for ${city}.`);
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
            const data = await api.getNews(query);
            if (data.articles && data.articles.length > 0) {
                setNewsArticles(data.articles);
                const firstArticleTitle = data.articles[0].title;
                setAssistantResponse(`Here's the top news: "${firstArticleTitle}" and more.`);
                speak(`Here's the top news: "${firstArticleTitle}" and more.`);
            } else {
                setAssistantResponse(`Sorry, I couldn't find any news ${query ? 'about ' + query : ''}.`);
                speak(`Sorry, I couldn't find any news ${query ? 'about ' + query : ''}.`);
                setNewsArticles([]);
            }
        } catch (error: unknown) {
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
            const data = await api.getWikipedia(query);
            setWikipediaData(data);
            const wikipediaText = `According to Wikipedia, ${data.summary}`;
            setAssistantResponse(wikipediaText);
            speak(wikipediaText);
        } catch (error: unknown) {
            console.error("Error fetching Wikipedia data:", error);
            setAssistantResponse(`Sorry, I couldn't find a Wikipedia page for "${query}".`);
            speak(`Sorry, I couldn't find a Wikipedia page for "${query}".`);
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
            const data = await api.getDictionary(word);
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
        } catch (error: unknown) {
            console.error("Error fetching dictionary data:", error);
            setAssistantResponse(`Sorry, I couldn't find a definition for "${word}".`);
            speak(`Sorry, I couldn't find a definition for "${word}".`);
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
            const data = await api.searchYouTube(query);
            if (data.videos && data.videos.length > 0) {
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
                setAssistantResponse(`Sorry, I couldn't find any YouTube videos for "${query}".`);
                speak(`Sorry, I couldn't find any YouTube videos for "${query}".`);
                setYoutubeResults([]);
            }
        } catch (error: unknown) {
            console.error("Error fetching YouTube videos:", error);
            setAssistantResponse("There was a problem connecting to the YouTube service. Please ensure the backend is running and check your internet connection.");
            speak("There was a problem connecting to the YouTube service. Please ensure the backend is running and check your internet connection.");
            setYoutubeResults([]);
        } finally {
            setLoadingYouTube(false);
        }
    };

    // YouTube video download via the Python backend
    const handleYouTubeDownload = async (videoUrl: string) => {
        setLoadingDownload(true);
        setDownloadStatus(null);
        setDownloadLink(null);
        setAssistantResponse(`Initiating download for video: ${videoUrl}... This might take a moment.`);
        speak(`Initiating download for video. This might take a moment.`);

        try {
            const data = await api.downloadYouTube(videoUrl);
            setDownloadStatus(`Download successful! Click here to download:`);
            setDownloadLink(`${BACKEND_URL}${data.download_link}`);
            setAssistantResponse(`Video downloaded! You can now download it from the link below.`);
            speak(`Video downloaded!`);
        } catch (error: unknown) {
            console.error("Error initiating YouTube download:", error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error.';
            setDownloadStatus(`Download failed: ${errorMessage}`);
            setAssistantResponse(`Sorry, video download failed. ${errorMessage}`);
            speak(`Sorry, video download failed.`);
            setDownloadLink(null);
        } finally {
            setLoadingDownload(false);
        }
    };
    
    // Send an email via the Python backend
    const sendEmailCommand = async (recipient: string, subject: string, body: string) => {
        setSendingEmail(true);
        setEmailStatusMessage(null);
        setAssistantResponse(`Sending email to ${recipient}...`);
        speak(`Sending email to ${recipient}...`);
        try {
            void api.sendEmail(recipient, subject, body);
            setEmailStatusMessage(`Email sent successfully to ${recipient}!`);
            setAssistantResponse(`Email sent successfully to ${recipient}!`);
            speak(`Email sent successfully to ${recipient}!`);
        } catch (error: unknown) {
            console.error("Error sending email:", error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error.';
            setEmailStatusMessage(`Failed to send email: ${errorMessage}`);
            setAssistantResponse(`Failed to send email: ${errorMessage}`);
            speak(`Failed to send email.`);
        } finally {
            setSendingEmail(false);
        }
    };

    // Maps search from the Python backend
    const fetchMapsSearch = async (query: string) => {
        setLoadingMaps(true);
        setMapsResults([]);
        setAssistantResponse(`Searching maps for "${query}"...`);
        try {
            const data = await api.searchMaps(query);
            if (data.results && data.results.length > 0) {
                setMapsResults(data.results);
                const firstResult = data.results[0];
                setAssistantResponse(`I found ${data.results.length} results for "${query}". The top result is ${firstResult.name}.`);
                speak(`I found ${data.results.length} results for "${query}". The top result is ${firstResult.name}.`);
            } else {
                setAssistantResponse(`Sorry, I couldn't find any map results for "${query}".`);
                speak(`Sorry, I couldn't find any map results for "${query}".`);
                setMapsResults([]);
            }
        } catch (error: unknown) {
            console.error("Error fetching maps data:", error);
            setAssistantResponse("There was a problem connecting to the maps service. Please ensure the backend is running and check your internet connection.");
            speak("There was a problem connecting to the maps service.");
            setMapsResults([]);
        } finally {
            setLoadingMaps(false);
        }
    };

    const processCommand = (command: string) => {
        setCommandHistory(prev => {
          const updated = [command, ...prev].slice(0, 20);
          localStorage.setItem('commandHistory', JSON.stringify(updated));
          return updated;
        });
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
                addTodo(task);
                response = `Okay, I've added "${task}" to your to-do list.`;
            } else {
                response = "What would you like to add to your to-do list?";
            }
        } else if (lowerCommand.includes('show my todo list') || lowerCommand.includes('what are my todos')) {
            if (todos.length > 0) {
                const todoList = todos.map((todo: Todo, index: number) => `${index + 1}. ${todo.task}`).join(', ');
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
                    toggleTodo(todoId, true);
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
                    deleteTodo(todoId);
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
                return;
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
                return;
            } else {
                fetchNews();
                return;
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
                return;
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
                return;
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
                return;
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
                return;
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
                return;
            } else {
                response = "I couldn't understand the email command. Please say 'send an email to [recipient email] with subject [subject] and message [body]'.";
                setAssistantResponse(response);
                speak(response);
            }
        } else if (lowerCommand.includes('download youtube video')) {
            const urlMatch = lowerCommand.match(/download youtube video\s+(https?:\/\/(?:www\.)?youtube\.com\/watch\?v=|https?:\/\/youtu\.be\/)([a-zA-Z0-9_-]+)/);
            if (urlMatch && urlMatch[1] && urlMatch[2]) {
                const videoUrl = `${urlMatch[1]}${urlMatch[2]}`;
                handleYouTubeDownload(videoUrl);
                return;
            } else {
                response = "Please provide a valid YouTube video URL after 'download YouTube video'.";
                setAssistantResponse(response);
                speak(response);
            }
        } else if (lowerCommand.includes('download this video') || lowerCommand.includes('download current video')) {
            if (currentPlayingVideoId) {
                const videoUrl = `https://www.youtube.com/watch?v=${currentPlayingVideoId}`;
                handleYouTubeDownload(videoUrl);
            } else {
                response = "There is no video currently playing to download. Please play a video first or provide a URL.";
                setAssistantResponse(response);
                speak(response);
            }
        } else if (lowerCommand.includes('switch to female voice')) {
            const femaleVoice = voices.find(voice => voice.lang === 'en-US' && (voice.name.toLowerCase().includes('zira') || voice.name.toLowerCase().includes('samantha') || voice.name.toLowerCase().includes('karen') || voice.name.toLowerCase().includes('moira') || voice.name.toLowerCase().includes('tessa') || voice.name.toLowerCase().includes('google') && voice.localService));
            if (femaleVoice) {
                response = 'Switching to a female voice.';
                speak(response, femaleVoice.name);
                return;
            } else {
                const anyEnVoice = voices.find(voice => voice.lang === 'en-US');
                if (anyEnVoice) {
                    response = 'Switching to a female voice.';
                    speak(response, anyEnVoice.name);
                    return;
                }
                response = 'Sorry, a suitable female voice is not available.';
            }
        } else if (lowerCommand.includes('switch to male voice')) {
            const maleVoice = voices.find(voice => voice.lang === 'en-US' && (voice.name.toLowerCase().includes('david') || voice.name.toLowerCase().includes('daniel') || voice.name.toLowerCase().includes('james') || voice.name.toLowerCase().includes('google') && voice.localService && !voice.name.toLowerCase().includes('zira') && !voice.name.toLowerCase().includes('samantha')));
            if (maleVoice) {
                response = 'Switching to a male voice.';
                speak(response, maleVoice.name);
                return;
            } else {
                const anyEnVoice = voices.find(voice => voice.lang === 'en-US');
                if (anyEnVoice) {
                    response = 'Switching to a male voice.';
                    speak(response, anyEnVoice.name);
                    return;
                }
                response = 'Sorry, a suitable male voice is not available.';
            }
        } else if (lowerCommand.includes('open website')) {
            let urlCommand = lowerCommand.replace('open website', '').trim();
            urlCommand = urlCommand.replace(/ dot /g, '.').replace(/ dot$/g, '.');
            const urlMatch = urlCommand.match(/(.+?)(?:\s*$)/);
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
        } else if (lowerCommand.includes('find') || lowerCommand.includes('search for') || lowerCommand.includes('maps')) {
            let query = '';
            if (lowerCommand.includes('find')) {
                query = lowerCommand.replace('find', '').trim();
            } else if (lowerCommand.includes('search for')) {
                query = lowerCommand.replace('search for', '').trim();
            } else if (lowerCommand.includes('maps')) {
                query = lowerCommand.replace('maps', '').trim();
            }
            query = query.replace(/ near me/g, '').replace(/ on maps/g, '').trim();
            if (query) {
                fetchMapsSearch(query);
                return;
            } else {
                response = "What would you like to search for on maps?";
                setAssistantResponse(response);
                speak(response);
            }
        }  else {
            response = `I understand you said "${command}". I am still learning, but for now, I can tell time and manage your to-do list.`;
        }

        setAssistantResponse(response);
        speak(response);
    };

    // Start listening
    const startListening = () => {
        startRecognition();
    };

    // Stop listening
    const stopListening = () => {
        stopRecognition();
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 text-white flex flex-col items-center justify-center p-4 font-inter">
            <div className="w-full max-w-4xl bg-gray-800 bg-opacity-70 backdrop-blur-sm rounded-xl shadow-2xl p-6 md:p-8">
                {/* Command History */}
                {commandHistory.length > 0 && (
                    <div className="bg-gray-800 bg-opacity-50 rounded-xl p-4 mb-8 shadow-xl border border-gray-600">
                        <h3 className="text-sm font-semibold text-gray-400 mb-2">Recent Commands</h3>
                        <div className="flex flex-wrap gap-2">
                            {commandHistory.slice(0, 5).map((cmd, idx) => (
                                <span key={idx} className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded-full">
                                    {cmd}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Assistant Display */}
                <div className="bg-gray-900 rounded-lg p-6 mb-8 shadow-inner border border-gray-700">
                    <h1 className="text-3xl font-bold text-center mb-4 text-blue-300">
                        AI Voice Assistant
                    </h1>
                    <div className="text-lg text-center text-gray-200 min-h-[4rem] flex items-center justify-center">
                        {loadingWeather || loadingNews || loadingWikipedia || loadingDictionary || loadingYouTube || sendingEmail || loadingDownload || loadingMaps ? (
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
                            You said: &quot;{sanitizeText(spokenText)}&quot;
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
                            {newsArticles.map((article: NewsArticle, _index: number) => (
                                <li key={_index} className="bg-gray-800 p-4 rounded-lg shadow-inner">
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
                        {dictionaryData.definitions.map((defGroup: DictionaryDefinition, _defIndex: number) => (
                            <div key={_defIndex} className="mb-4 last:mb-0">
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

                {/* YouTube Video Player */}
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
                            {youtubeResults.map((video: YouTubeVideo) => (
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

                {/* YouTube Download Status */}
                {(downloadStatus || downloadLink) && (
                    <div className={`rounded-xl p-4 mb-8 text-center font-semibold ${
                        downloadStatus && downloadStatus.includes('successful') ? 'bg-indigo-700 bg-opacity-50 text-indigo-100' : 'bg-red-700 bg-opacity-50 text-red-100'
                    } shadow-xl border border-gray-600`}>
                        {sanitizeText(downloadStatus || 'Processing download...')}
                        {downloadLink && (
                            <div className="mt-2">
                                <a
                                    href={downloadLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-300 hover:underline inline-flex items-center space-x-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-download"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                                    <span>Download Video</span>
                                </a>
                            </div>
                        )}
                    </div>
                )}

                {/* Maps Search Results */}
                {mapsResults.length > 0 && (
                    <div className="bg-gray-700 bg-opacity-50 rounded-xl p-6 shadow-xl border border-gray-600 mb-8">
                        <h2 className="text-2xl font-bold mb-4 text-center text-yellow-300">Map Search Results</h2>
                        <ul className="space-y-4">
                            {mapsResults.map((place: MapsResult, _index: number) => (
                                <li key={_index} className="bg-gray-800 p-4 rounded-lg shadow-inner">
                                    <h3 className="text-xl font-semibold text-yellow-200 mb-1">{sanitizeText(place.name)}</h3>
                                    {place.address && <p className="text-sm text-gray-400 mb-2">{sanitizeText(place.address)}</p>}
                                    {place.rating && (
                                        <p className="text-gray-300 text-base">
                                            Rating: {place.rating} ({place.user_ratings_total} reviews)
                                        </p>
                                    )}
                                    {place.map_url && (
                                        <a
                                            href={place.map_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-400 hover:underline mt-2 inline-block text-sm"
                                        >
                                            View on Google Maps
                                        </a>
                                    )}
                                </li>
                            ))}
                        </ul>
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
                                    addTodo(newTodo);
                                    setNewTodo('');
                                }
                            }}
                        />
                        <button
                            onClick={() => { addTodo(newTodo); setNewTodo(''); }}
                            className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-transform transform hover:scale-105 active:scale-95 shadow-md"
                        >
                            Add To-Do
                        </button>
                    </div>

                    {todos.length === 0 ? (
                        <p className="text-center text-gray-400 italic">No to-do items yet. Try adding one!</p>
                    ) : (
                        <ul className="space-y-3">
                            {todos.map((todo: Todo, _index: number) => (
                                <li
                                    key={todo.id}
                                    className={`flex items-center justify-between p-4 rounded-lg shadow-md transition-all duration-200 ${
                                        todo.completed ? 'bg-gray-600 line-through text-gray-400' : 'bg-gray-800 text-white'
                                    }`}
                                >
                                    <span className="flex-grow text-lg">
                                        {_index + 1}. {sanitizeText(todo.task)}
                                    </span>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => toggleTodo(todo.id, !todo.completed)}
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
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check-circle"><path d="M22 11.08V12a10 10 0 1 11-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => deleteTodo(todo.id)}
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