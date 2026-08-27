import sqlite3
import random

USERS_DATA = [
    {
        "username": "alex_cyber",
        "password": "password123",
        "name": "Alex Rivera",
        "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
        "bio": "✨ UI/UX Designer & Creative Technologist 🚀 | Visualizing the future of web UI 🎨",
        "verified": 1
    },
    {
        "username": "sophia_travels",
        "password": "password123",
        "name": "Sophia Chen",
        "avatar": "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80",
        "bio": "✈️ Exploring 50+ countries | Nomad Vibe 📸 | Capturing golden hour moments 🌅",
        "verified": 1
    },
    {
        "username": "marcus_code",
        "password": "password123",
        "name": "Marcus Vance",
        "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80",
        "bio": "💻 Full-Stack Dev & AI Enthusiast | Building next-gen web apps | Coffee & Code ☕",
        "verified": 0
    },
    {
        "username": "elena_fitness",
        "password": "password123",
        "name": "Elena Rostova",
        "avatar": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80",
        "bio": "🏋️‍♀️ Certified Trainer & Nutritionist | Daily workout motivation 💪 | Healthy lifestyle",
        "verified": 1
    },
    {
        "username": "liam_aesthetic",
        "password": "password123",
        "name": "Liam Miller",
        "avatar": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80",
        "bio": "🎵 Music Producer & Sound Engineer | Synthesizers, Beats & Chillwave Vibes 🎧",
        "verified": 0
    }
]

# 100 High-Quality HD Vertical Video Streams with Sound
REEL_VIDEOS = [
    "https://assets.mixkit.co/videos/preview/mixkit-vertical-shot-of-a-woman-running-along-the-beach-41481-large.mp4",
    "https://assets.mixkit.co/videos/preview/mixkit-skater-doing-a-trick-in-a-skatepark-42654-large.mp4",
    "https://assets.mixkit.co/videos/preview/mixkit-futuristic-robotic-neon-city-43187-large.mp4",
    "https://assets.mixkit.co/videos/preview/mixkit-slow-motion-of-a-girl-dancing-with-lights-42588-large.mp4",
    "https://assets.mixkit.co/videos/preview/mixkit-young-woman-taking-photos-with-a-retro-camera-42861-large.mp4",
    "https://assets.mixkit.co/videos/preview/mixkit-waves-in-the-water-1164-large.mp4",
    "https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-a-beach-and-the-ocean-41005-large.mp4",
    "https://assets.mixkit.co/videos/preview/mixkit-coffee-pour-in-slow-motion-42582-large.mp4",
    "https://assets.mixkit.co/videos/preview/mixkit-hands-holding-a-smartphone-scrolling-43093-large.mp4",
    "https://assets.mixkit.co/videos/preview/mixkit-neon-lights-in-a-dark-street-41275-large.mp4",
    "https://assets.mixkit.co/videos/preview/mixkit-hands-typing-on-a-glowing-keyboard-43186-large.mp4",
    "https://assets.mixkit.co/videos/preview/mixkit-chef-preparing-a-dish-with-fire-42798-large.mp4"
]

PHOTO_IMAGES = [
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1511765224389-37f0e77cf0eb?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80"
]

AUDIOS = [
    {"title": "Original Audio - Midnight Synth", "artist": "Alex Rivera"},
    {"title": "Lo-Fi Chill Beats (Night Drive)", "artist": "Liam Miller"},
    {"title": "Sunset Vibes & Tropical House", "artist": "Sophia Chen"},
    {"title": "Cyberpunk Neon Dreams 2026", "artist": "Aurora Vance"}
]

CAPTIONS = [
    "Chasing the sunset in places where time stands still 🌅✨ #travel #vibes #aesthetic",
    "Late night coding sessions with endless coffee ☕💻 #developer #tech #coding",
    "Design is not just what it looks like, it's how it feels. 🎨✨ #uiux #design #minimalism",
    "Morning routine complete. Ready to crush today's fitness goals! 💪🏋️‍♀️ #health #workout",
    "Creating digital art that feels alive. What do you think? 🌌🚀 #digitalart #unrealengine"
]

LOCATIONS = ['Tokyo, Japan', 'New York, USA', 'Paris, France', 'Santorini, Greece', 'Iceland', 'Bali, Indonesia']

def seed_database():
    print("[+] Initializing SQLite Database (social_media.db)...")
    conn = sqlite3.connect('social_media.db')
    cursor = conn.cursor()

    cursor.executescript('''
        DROP TABLE IF EXISTS comments;
        DROP TABLE IF EXISTS likes;
        DROP TABLE IF EXISTS followers;
        DROP TABLE IF EXISTS posts;
        DROP TABLE IF EXISTS users;

        CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            name TEXT NOT NULL,
            avatar TEXT NOT NULL,
            bio TEXT,
            verified INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            type TEXT CHECK(type IN ('post', 'reel')) NOT NULL DEFAULT 'post',
            media_url TEXT NOT NULL,
            thumbnail_url TEXT,
            caption TEXT,
            location TEXT,
            audio_title TEXT,
            audio_artist TEXT,
            likes_count INTEGER DEFAULT 0,
            comments_count INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        );

        CREATE TABLE comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            post_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            text TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (post_id) REFERENCES posts (id),
            FOREIGN KEY (user_id) REFERENCES users (id)
        );

        CREATE TABLE likes (
            user_id INTEGER NOT NULL,
            post_id INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, post_id),
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (post_id) REFERENCES posts (id)
        );

        CREATE TABLE followers (
            follower_id INTEGER NOT NULL,
            following_id INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (follower_id, following_id),
            FOREIGN KEY (follower_id) REFERENCES users (id),
            FOREIGN KEY (following_id) REFERENCES users (id)
        );
    ''')

    print("[+] Inserting Seed Users...")
    user_ids = []
    for u in USERS_DATA:
        cursor.execute(
            "INSERT INTO users (username, password, name, avatar, bio, verified) VALUES (?, ?, ?, ?, ?, ?)",
            (u['username'], u['password'], u['name'], u['avatar'], u['bio'], u['verified'])
        )
        user_ids.append(cursor.lastrowid)

    print("[+] Seeding 100 Reel Video Streams & Posts...")
    for i in range(1, 101):
        # 80% of items are full video reels for scrolling
        is_reel = (i % 5 != 0)
        post_type = 'reel' if is_reel else 'post'
        user_id = user_ids[i % len(user_ids)]
        
        if is_reel:
            media_url = REEL_VIDEOS[(i - 1) % len(REEL_VIDEOS)]
            thumbnail_url = PHOTO_IMAGES[(i - 1) % len(PHOTO_IMAGES)]
        else:
            media_url = PHOTO_IMAGES[(i - 1) % len(PHOTO_IMAGES)]
            thumbnail_url = media_url

        caption = CAPTIONS[(i - 1) % len(CAPTIONS)] + f" [Reel #{i}]"
        audio = AUDIOS[(i - 1) % len(AUDIOS)]
        initial_likes = random.randint(12, 450)
        initial_comments = random.randint(2, 24)
        location = LOCATIONS[i % len(LOCATIONS)]

        cursor.execute('''
            INSERT INTO posts (user_id, type, media_url, thumbnail_url, caption, location, audio_title, audio_artist, likes_count, comments_count)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (user_id, post_type, media_url, thumbnail_url, caption, location, audio['title'], audio['artist'], initial_likes, initial_comments))

    # NOTE: No likes are pre-inserted into `likes` table! User starts with 0 pre-liked items!
    conn.commit()
    conn.close()
    print("[SUCCESS] Successfully seeded 100 Posts/Reels with 0 pre-liked records!")

if __name__ == '__main__':
    seed_database()
