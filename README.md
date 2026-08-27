# 🌅 New Day - Social Media Platform

An Instagram-inspired social media platform built with modern web technologies, responsive 9:16 vertical Reels, real-time Direct Messages with simulated auto-replies, WebRTC device camera recording, OLED dark aesthetics, and database performance optimizations.

![New Day App](https://img.shields.io/badge/Platform-New%20Day-008cff?style=for-the-badge&logo=instagram)
![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-100%25%20Functional-brightgreen?style=for-the-badge)

---

## ✨ Key Features

### 1. 🏠 Desktop 2-Column Home Feed & Stories
- **Stories Carousel**: User story rings featuring official multi-color gradient borders (`linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)`).
- **2-Column Layout**: Main feed column (470px wide) + desktop right sidebar with account suggestions and follow buttons.
- **Double-Tap Heart Burst**: Double-clicking photo or video media triggers a 3D animated scaling red heart burst.
- **Interactivity**: Real-time Like/Unlike toggles, slide-in comments drawer, share plane modal, and bookmark icons.

### 2. 🎬 Vertical 9:16 Reels View
- **9:16 Snap Player**: Center-aligned vertical video viewport (`aspect-ratio: 9/16`, max-height `780px`) with smooth snap scrolling.
- **Autoplay Observer**: Videos automatically play/pause based on viewport visibility (`IntersectionObserver`).
- **Synchronized Audio Sound Engine**: Background MP3 music tracks playing in sync with video reels, complete with an unmute banner.
- **Action Stack**: Floating heart likes, comment bubbles, share modal, and bookmark controls.

### 3. 💬 Direct Messages & Reel Sharing
- **Direct Messages Inbox**: Chat with simulated user contacts (`sarah_art`, `dev_mike`, `elena_travels`, `sophia_vibe`, `lucas_fit`, `maya_design`, `emma_foodie`).
- **Simulated Auto-Replies**: Sending text messages triggers real-time simulated reactions and replies.
- **Share Reel Modal**: Click the paper plane share icon on ANY post or reel to send it straight into a DM chat thread with video previews.

### 4. 📷 Create & Device Upload Systems
- **Storage File Picker**: Pick photos or videos directly from device storage with instant preview.
- **WebRTC Live Camera**: Capture live photos or record WebM video reels using your device camera and microphone.
- **Web URL Input**: Option to paste direct image or video URLs.

### 5. 🔐 Security & Database Performance
- **Indexed Database**: SQLite WAL mode with B-Tree indexes on `users(username)`, `posts(user_id, type)`, `likes(user_id, post_id)`, `followers`, `comments`, and `messages`.
- **SHA-256 Password Security**: Passwords are securely hashed.
- **Rate Limiting**: IP-based rate limiting to prevent spam and brute-force attacks.

---

## 🛠️ Technology Stack

- **Frontend**: HTML5, Vanilla CSS3 (OLED `#000000` theme, Uiverse glowing neon controls), JavaScript ES6+
- **Backend**: Python 3 HTTP Server API
- **Database**: SQLite3 with WAL mode & B-Tree performance indexing
- **Media Engine**: HTML5 Video/Audio, WebRTC (`getUserMedia`), MediaRecorder API

---

## 🚀 How to Run Locally

### Prerequisites
- Python 3.8+ installed on your system.

### Installation Steps

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/Adarshkumarq/CodeAlpha_MiniSocialMedia.git
   cd CodeAlpha_MiniSocialMedia
   ```

2. **Seed Initial Database (Optional)**:
   ```bash
   python seed.py
   ```

3. **Start the Backend Server**:
   ```bash
   python server.py
   ```

4. **Open in Browser**:
   Navigate to `http://localhost:3000` in your web browser.

---

## 🔐 Demo Credentials

You can use the built-in demo account to test all features:

- **Username**: `alex_cyber`
- **Password**: `password123`

Or click **Sign Up** to create your own custom account!

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.