# AI Voice Assistant

## ✨ Project Overview

This is a powerful and interactive AI Voice Assistant built with a React frontend and a Python Flask backend. It leverages web speech technologies and various external APIs to provide a comprehensive set of functionalities, allowing users to interact with their computer using voice commands for common tasks and information retrieval.

## 🚀 Features

The AI Voice Assistant comes packed with the following capabilities:

* **🎙️ Voice Commands & Text-to-Speech:** Interact naturally using your voice, and the assistant responds audibly.
* **✅ To-Do List Management:** Add, view, mark as complete, and delete to-do items, with data persisted using Firebase Firestore.
* **☀️ Dynamic Weather Reports:** Get current weather conditions for any city worldwide.
* **📰 Latest News:** Fetch top headlines or search for news articles on specific topics.
* **📚 Wikipedia Information:** Get concise summaries for general knowledge questions directly from Wikipedia.
* **📖 Dictionary & Spell Check:** Define words and receive intelligent spelling suggestions.
* **▶️ YouTube Search & Playback:** Search for videos on YouTube and play them directly within the application.
* **⬇️ YouTube Video Downloader:** Download YouTube videos for offline viewing. (Please ensure you have the right to download copyrighted content.)
* **📧 Email Sending:** Send emails using voice commands (requires SMTP server configuration).
* **🌐 Website Opening:** Open specified websites with voice commands.
* **🗣️ Voice Customization:** Switch between male and female assistant voices.

## 💻 Tech Stack

### Frontend:

* **React:** A JavaScript library for building user interfaces.
* **TypeScript:** A typed superset of JavaScript that compiles to plain JavaScript.
* **Tailwind CSS:** A utility-first CSS framework for rapidly building custom designs.
* **Web Speech API:** Browser API for Speech Recognition and Speech Synthesis.
* **Firebase SDK:** For client-side interaction with Firestore.

### Backend:

* **Python:** The core programming language for the server.
* **Flask:** A lightweight Python web framework for building APIs.
* **Flask-CORS:** Enables Cross-Origin Resource Sharing for frontend-backend communication.
* **Requests:** HTTP library for making API calls to external services.
* **Wikipedia-API:** Python wrapper for Wikipedia.
* **PyDictionary:** Library for fetching word definitions.
* **SpellChecker:** Library for spell checking.
* **smtplib & email.mime:** Python's built-in modules for sending emails.
* **subprocess:** For running external commands like yt-dlp.
* **yt-dlp:** A command-line program to download videos from YouTube and other sites.

### Database:

* **Firebase Firestore:** A NoSQL cloud database for storing to-do items.

## ⚙️ Setup and Installation

Follow these steps to get your AI Voice Assistant up and running locally.

### Prerequisites

Before you begin, ensure you have the following installed:

* **Python 3.9+:** [Download Python](https://www.python.org/downloads/)
* **Node.js & npm (or yarn):** [Download Node.js](https://nodejs.org/en/download/) (npm is included)
* **yt-dlp:** Install this command-line tool.
    * **On macOS/Linux:** `sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && sudo chmod a+rx /usr/local/bin/yt-dlp`
    * **On Windows:** Refer to the [yt-dlp installation guide](https://github.com/yt-dlp/yt-dlp#installation).

### 1. Backend Setup

1.  **Clone the Repository:**
    ```bash
    git clone [https://github.com/your-username/ai-voice-assistant.git](https://github.com/your-username/ai-voice-assistant.git)
    cd ai-voice-assistant
    ```
    (Assuming your project structure has `ai-voice-assistant-backend` and `ai-voice-assistant-frontend` as subdirectories of `ai-voice-assistant`).

2.  **Navigate to the Backend Directory:**
    ```bash
    cd ai-voice-assistant-backend
    ```

3.  **Create and Activate a Virtual Environment:**
    It's highly recommended to use a virtual environment to manage dependencies.
    ```bash
    python -m venv venv
    # On Windows:
    .\venv\Scripts\activate
    # On macOS/Linux:
    source venv/bin/activate
    ```

4.  **Install Python Dependencies:**
    Create a `requirements.txt` file in your `ai-voice-assistant-backend` directory with the following content:
    ```
    Flask==2.3.2
    Flask-Cors==4.0.0
    requests==2.31.0
    wikipedia-api==0.5.4
    PyDictionary==2.0.1
    spellchecker==0.7.0
    yt-dlp==2023.11.16
    ```
    Then install them:
    ```bash
    pip install -r requirements.txt
    ```

5.  **Set Environment Variables (API Keys & Email Credentials):**
    The backend requires several API keys and email credentials. **DO NOT hardcode these in your `app.py` file.** You can set them in your terminal session or use a `.env` file with `python-dotenv`.

    * **OpenWeatherMap API Key:** Get one from [OpenWeatherMap](https://openweathermap.org/api).
    * **NewsAPI.org API Key:** Get one from [NewsAPI.org](https://newsapi.org/).
    * **YouTube Data API v3 Key:**
        * Go to [Google Cloud Console](https://console.cloud.google.com/).
        * Create a new project or select an existing one.
        * Enable the "YouTube Data API v3" from `APIs & Services > Library`.
        * Create an API key from `APIs & Services > Credentials`.
    * **Email Sender Credentials (for send-email feature):**
        * `SENDER_EMAIL`: Your sending email address (e.g., `your.email@gmail.com`).
        * `SENDER_PASSWORD`: For Gmail, use an [App Password](https://support.google.com/accounts/answer/185833). Do NOT use your regular email password.
        * `SMTP_SERVER` and `SMTP_PORT` are typically `smtp.gmail.com` and `587` respectively for Gmail.

    Example for setting environment variables (replace with your actual keys and emails):

    ```bash
    # For macOS/Linux (add to your ~/.bashrc or ~/.zshrc for persistence)
    export OPENWEATHER_API_KEY="YOUR_OPENWEATHER_API_KEY"
    export NEWS_API_KEY="YOUR_NEWS_API_KEY"
    export YOUTUBE_API_KEY="YOUR_YOUTUBE_API_KEY"
    export SENDER_EMAIL="your.email@gmail.com"
    export SENDER_PASSWORD="your_16_digit_app_password" # For Gmail, this is your App Password

    # For Windows Command Prompt:
    set OPENWEATHER_API_KEY="YOUR_OPENWEATHER_API_KEY"
    set NEWS_API_KEY="YOUR_NEWS_API_KEY"
    set YOUTUBE_API_KEY="YOUR_YOUTUBE_API_KEY"
    set SENDER_EMAIL="your.email@gmail.com"
    set SENDER_PASSWORD="your_16_digit_app_password"

    # For Windows PowerShell:
    $env:OPENWEATHER_API_KEY="YOUR_OPENWEATHER_API_KEY"
    $env:NEWS_API_KEY="YOUR_NEWS_API_KEY"
    $env:YOUTUBE_API_KEY="YOUR_YOUTUBE_API_KEY"
    $env:SENDER_EMAIL="your.email@gmail.com"
    $env:SENDER_PASSWORD="your_16_digit_app_password"
    ```

6.  **Run the Flask Backend:**
    ```bash
    flask run
    ```
    The backend should start on `http://127.0.0.1:5000`. Keep this terminal window open.

### 2. Frontend Setup

1.  **Navigate to the Frontend Directory:**
    Open a new terminal window or tab and navigate to your frontend directory.
    ```bash
    cd ai-voice-assistant-frontend
    ```

2.  **Install Node.js Dependencies:**
    ```bash
    npm install
    # or if you use yarn:
    # yarn install
    ```

3.  **Run the React Frontend:**
    ```bash
    npm start
    ```
    This will open the application in your browser, usually at `http://localhost:3000`.

## 🎤 Usage

Once both the backend and frontend are running:

1.  **Grant Microphone Permission:** Your browser will likely ask for microphone access. Grant it.
2.  **Click "Start Voice Command":** Begin speaking your commands.
3.  **Interact:**
    * "What time is it?"
    * "Add a todo item to buy groceries"
    * "Show my todo list"
    * "Mark todo as complete number 1"
    * "What is the weather in London?"
    * "Tell me the news"
    * "Tell me the news about technology"
    * "Tell me about Artificial Intelligence"
    * "Define ubiquitous"
    * "Play Never Gonna Give You Up"
    * "Search YouTube for funny cat videos"
    * "Download YouTube video https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    * "Send an email to john.doe@example.com with subject Meeting Update and message Please review the attached document."
    * "Open website google dot com"
    * "Switch to female voice" / "Switch to male voice"

## 📂 Project Structure

```
ai-voice-assistant/
├── ai-voice-assistant-backend/
│   ├── venv/                   # Python virtual environment
│   ├── app.py                  # Flask backend application
│   ├── requirements.txt        # Python dependencies
│   ├── downloads/              # Directory for downloaded YouTube videos
│   └── .env.example            # Example for environment variables
├── ai-voice-assistant-frontend/
│   ├── public/
│   ├── src/
│   │   ├── App.tsx             # Main React application component
│   │   ├── index.tsx
│   │   └── ...
│   ├── package.json            # Node.js dependencies
│   ├── tailwind.config.js      # Tailwind CSS configuration
│   └── ...
└── README.md
```


## 💡 Future Enhancements

* More robust natural language understanding for complex commands.
* Integration with other smart home devices.
* Calendar management.
* Integration with personal productivity tools.

## 🤝 Contributing

Contributions are welcome! Please feel free to open issues or submit pull requests.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.