const { initDb, dbRun, dbQuery } = require('./db');

const USERS_DATA = [
  {
    username: 'alex_cyber',
    name: 'Alex Rivera',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    bio: '✨ UI/UX Designer & Creative Technologist 🚀 | Visualizing the future of web UI 🎨',
    verified: 1
  },
  {
    username: 'sophia_travels',
    name: 'Sophia Chen',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80',
    bio: '✈️ Exploring 50+ countries | Nomad Vibe 📸 | Capturing golden hour moments 🌅',
    verified: 1
  },
  {
    username: 'marcus_code',
    name: 'Marcus Vance',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    bio: '💻 Full-Stack Dev & AI Enthusiast | Building next-gen web apps | Coffee & Code ☕',
    verified: 0
  },
  {
    username: 'elena_fitness',
    name: 'Elena Rostova',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
    bio: '🏋️‍♀️ Certified Trainer & Nutritionist | Daily workout motivation 💪 | Healthy lifestyle',
    verified: 1
  },
  {
    username: 'liam_aesthetic',
    name: 'Liam Miller',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
    bio: '🎵 Music Producer & Sound Engineer | Synthesizers, Beats & Chillwave Vibes 🎧',
    verified: 0
  },
  {
    username: 'aurora_art',
    name: 'Aurora Vance',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=300&q=80',
    bio: '🎨 Digital Artist & 3D Animator | Blender & Unreal Engine 5 | Surreal Landscapes ✨',
    verified: 1
  },
  {
    username: 'chef_diego',
    name: 'Diego Morales',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80',
    bio: '🍕 Culinary Explorer & Artisan Chef | Farm to table delights 🍷 | Gourmet Recipes',
    verified: 0
  },
  {
    username: 'zara_fashion',
    name: 'Zara Thorne',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=300&q=80',
    bio: '👠 High Fashion & Streetwear Styling | Tokyo / Paris / NYC 🗼 | Editorial Lookbook',
    verified: 1
  },
  {
    username: 'kai_nature',
    name: 'Kai Takahashi',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=300&q=80',
    bio: '🌿 Wildlife & Landscape Photographer | National Parks Explorer 🏔️ | Earth colors',
    verified: 0
  },
  {
    username: 'chloe_vibes',
    name: 'Chloe Bennett',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
    bio: '✨ Minimalist lifestyle & interior design | Warm cozy home decor ☕ | Aesthetic feed',
    verified: 0
  }
];

// Sample media curated from reliable CDN collections (Pexels / Unsplash / Public sample MP4s)
const REEL_VIDEOS = [
  'https://assets.mixkit.co/videos/preview/mixkit-vertical-shot-of-a-woman-running-along-the-beach-41481-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-skater-doing-a-trick-in-a-skatepark-42654-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-futuristic-robotic-neon-city-43187-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-slow-motion-of-a-girl-dancing-with-lights-42588-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-young-woman-taking-photos-with-a-retro-camera-42861-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-waves-in-the-water-1164-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-a-beach-and-the-ocean-41005-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-coffee-pour-in-slow-motion-42582-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-hands-holding-a-smartphone-scrolling-43093-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-neon-lights-in-a-dark-street-41275-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-hands-typing-on-a-glowing-keyboard-43186-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-chef-preparing-a-dish-with-fire-42798-large.mp4'
];

const PHOTO_IMAGES = [
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1511765224389-37f0e77cf0eb?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80'
];

const AUDIOS = [
  { title: 'Original Audio - Midnight Synth', artist: 'Alex Rivera' },
  { title: 'Lo-Fi Chill Beats (Night Drive)', artist: 'Liam Miller' },
  { title: 'Sunset Vibes & Tropical House', artist: 'Sophia Chen' },
  { title: 'Cyberpunk Neon Dreams 2026', artist: 'Aurora Vance' },
  { title: 'Golden Hour Acoustic Melodies', artist: 'Kai Takahashi' },
  { title: 'Techno Groove & Underground Beats', artist: 'Zara Thorne' }
];

const CAPTIONS = [
  "Chasing the sunset in places where time stands still 🌅✨ #travel #vibes #aesthetic",
  "Late night coding sessions with endless coffee ☕💻 #developer #tech #coding",
  "Design is not just what it looks like, it's how it feels. 🎨✨ #uiux #design #minimalism",
  "Morning routine complete. Ready to crush today's fitness goals! 💪🏋️‍♀️ #health #workout",
  "Creating digital art that feels alive. What do you think? 🌌🚀 #digitalart #unrealengine",
  "Fresh ingredients, fire, and love. Dinner is served 🍕👨‍🍳 #foodie #chef #gourmet",
  "Tokyo street fashion edits for autumn 🗼🧥 #fashion #streetwear #style",
  "Nature never disappoints. Listen to the silence 🌿🏔️ #nature #photography",
  "Cozy corner setup for rainy afternoons ☕📖 #cozy #interior #aesthetic",
  "Synthwave beats dropping this Friday! Stay tuned 🎧🎶 #music #producer #lofi",
  "Nothing beats the energy of a live crowd! ⚡🎤 #vibes #musicfest",
  "Exploring hidden gems in the heart of the city 🏙️✨ #cityscape #explore",
  "Mindset is everything. Keep building, keep growing 🚀🌱 #inspiration",
  "Minimalist aesthetic for the modern workspace 🖥️✨ #setup #workspace",
  "Golden hour magic captured through vintage lens 📷🌅 #photography"
];

const SAMPLE_COMMENTS = [
  "This looks absolutely incredible! 🔥😍",
  "Woah, the aesthetic here is next level! ✨",
  "Where was this captured? Stunning view! 🏔️",
  "Subscribed and saved! Need more content like this 🚀",
  "Such clean vibes! Super inspiring work 👏",
  "The color grading on this is fantastic 🎨",
  "Great post! Love the lighting here 💡",
  "Saved to my moodboard! 📌",
  "Drop the tutorial please! 🙏",
  "Instant like! Beautiful composition ❤️"
];

async function seed() {
  console.log('🌱 Initializing SQLite database...');
  await initDb();

  // Clear existing tables
  await dbRun('DELETE FROM comments');
  await dbRun('DELETE FROM likes');
  await dbRun('DELETE FROM followers');
  await dbRun('DELETE FROM posts');
  await dbRun('DELETE FROM users');

  console.log('👤 Inserting 10 Users...');
  const userIds = [];
  for (const user of USERS_DATA) {
    const res = await dbRun(
      `INSERT INTO users (username, name, avatar, bio, verified) VALUES (?, ?, ?, ?, ?)`,
      [user.username, user.name, user.avatar, user.bio, user.verified]
    );
    userIds.push(res.lastID);
  }

  console.log('🤝 Seeding Follower Connections...');
  for (let i = 0; i < userIds.length; i++) {
    for (let j = 0; j < userIds.length; j++) {
      if (i !== j && (i + j) % 2 === 0) {
        await dbRun(
          `INSERT OR IGNORE INTO followers (follower_id, following_id) VALUES (?, ?)`,
          [userIds[i], userIds[j]]
        );
      }
    }
  }

  console.log('📱 Generating 100 Posts & Reels...');
  // Generate exactly 100 posts (50 reels, 50 image posts interleaved)
  for (let i = 1; i <= 100; i++) {
    const isReel = i % 2 === 0; // Alternate between Reel and Photo post
    const type = isReel ? 'reel' : 'post';
    const userId = userIds[i % userIds.length];
    
    let mediaUrl;
    let thumbnailUrl;
    if (isReel) {
      mediaUrl = REEL_VIDEOS[(i - 1) % REEL_VIDEOS.length];
      thumbnailUrl = PHOTO_IMAGES[(i - 1) % PHOTO_IMAGES.length];
    } else {
      mediaUrl = PHOTO_IMAGES[(i - 1) % PHOTO_IMAGES.length];
      thumbnailUrl = mediaUrl;
    }

    const caption = CAPTIONS[(i - 1) % CAPTIONS.length] + ` [Post #${i}]`;
    const audio = AUDIOS[(i - 1) % AUDIOS.length];
    const initialLikes = Math.floor(Math.random() * 850) + 42;
    const initialComments = Math.floor(Math.random() * 45) + 3;
    const locations = ['Tokyo, Japan', 'New York, USA', 'Paris, France', 'Santorini, Greece', 'Iceland', 'Bali, Indonesia'];
    const location = locations[i % locations.length];

    const postRes = await dbRun(
      `INSERT INTO posts (user_id, type, media_url, thumbnail_url, caption, location, audio_title, audio_artist, likes_count, comments_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        type,
        mediaUrl,
        thumbnailUrl,
        caption,
        location,
        audio.title,
        audio.artist,
        initialLikes,
        initialComments
      ]
    );

    const postId = postRes.lastID;

    // Seed 2-4 comments for each post
    const commentCount = Math.floor(Math.random() * 3) + 2;
    for (let c = 0; c < commentCount; c++) {
      const commenterId = userIds[(i + c + 1) % userIds.length];
      const commentText = SAMPLE_COMMENTS[(i + c) % SAMPLE_COMMENTS.length];
      await dbRun(
        `INSERT INTO comments (post_id, user_id, text) VALUES (?, ?, ?)`,
        [postId, commenterId, commentText]
      );
    }

    // Seed likes for some posts
    const likersCount = Math.min(5, userIds.length);
    for (let l = 0; l < likersCount; l++) {
      if ((i + l) % 3 === 0) {
        const likerId = userIds[l];
        await dbRun(
          `INSERT OR IGNORE INTO likes (user_id, post_id) VALUES (?, ?)`,
          [likerId, postId]
        );
      }
    }
  }

  console.log('✅ Successfully seeded database with 10 Users and 100 Posts & Reels!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
