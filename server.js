const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb, dbQuery, dbGet, dbRun } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Simple in-memory session active user ID (defaults to User 1)
let currentUserId = 1;

// Initialize Database on Startup
initDb().then(() => {
  console.log('📦 Database initialized');
}).catch(err => {
  console.error('Failed to init DB:', err);
});

// Helper to get formatted post object
async function formatPost(post, activeUserId) {
  const user = await dbGet(`SELECT id, username, name, avatar, verified FROM users WHERE id = ?`, [post.user_id]);
  const comments = await dbQuery(
    `SELECT c.id, c.text, c.created_at, u.id as user_id, u.username, u.avatar
     FROM comments c
     JOIN users u ON c.user_id = u.id
     WHERE c.post_id = ?
     ORDER BY c.created_at ASC`,
    [post.id]
  );
  
  let hasLiked = false;
  if (activeUserId) {
    const likeRow = await dbGet(`SELECT 1 FROM likes WHERE user_id = ? AND post_id = ?`, [activeUserId, post.id]);
    hasLiked = !!likeRow;
  }

  let isFollowing = false;
  if (activeUserId && user.id !== activeUserId) {
    const followRow = await dbGet(`SELECT 1 FROM followers WHERE follower_id = ? AND following_id = ?`, [activeUserId, user.id]);
    isFollowing = !!followRow;
  }

  return {
    ...post,
    user: {
      ...user,
      is_following: isFollowing
    },
    comments,
    has_liked: hasLiked
  };
}

// API ROUTES

// 1. Get Current Session User
app.get('/api/current_user', async (req, res) => {
  try {
    const user = await dbGet(`
      SELECT u.*,
        (SELECT COUNT(*) FROM posts WHERE user_id = u.id) as posts_count,
        (SELECT COUNT(*) FROM followers WHERE following_id = u.id) as follower_count,
        (SELECT COUNT(*) FROM followers WHERE follower_id = u.id) as following_count
      FROM users u
      WHERE u.id = ?
    `, [currentUserId]);

    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Switch Active User
app.post('/api/switch_user', async (req, res) => {
  const { user_id } = req.body;
  const targetUser = await dbGet(`SELECT * FROM users WHERE id = ?`, [user_id]);
  if (!targetUser) return res.status(404).json({ error: 'Target user not found' });
  
  currentUserId = parseInt(user_id);
  res.json({ message: 'Active user updated', user: targetUser });
});

// 3. Get All Users List
app.get('/api/users', async (req, res) => {
  try {
    const users = await dbQuery(`
      SELECT u.id, u.username, u.name, u.avatar, u.verified, u.bio,
        (SELECT COUNT(*) FROM followers WHERE following_id = u.id) as follower_count,
        (SELECT COUNT(*) FROM followers WHERE follower_id = u.id) as following_count,
        EXISTS(SELECT 1 FROM followers WHERE follower_id = ? AND following_id = u.id) as is_following
      FROM users u
      ORDER BY u.username ASC
    `, [currentUserId]);

    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Get User Profile with Stats & Posts
app.get('/api/users/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const user = await dbGet(`
      SELECT u.*,
        (SELECT COUNT(*) FROM posts WHERE user_id = u.id) as posts_count,
        (SELECT COUNT(*) FROM followers WHERE following_id = u.id) as follower_count,
        (SELECT COUNT(*) FROM followers WHERE follower_id = u.id) as following_count,
        EXISTS(SELECT 1 FROM followers WHERE follower_id = ? AND following_id = u.id) as is_following
      FROM users u
      WHERE u.id = ?
    `, [currentUserId, userId]);

    if (!user) return res.status(404).json({ error: 'User not found' });

    const rawPosts = await dbQuery(`SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC`, [userId]);
    const posts = await Promise.all(rawPosts.map(p => formatPost(p, currentUserId)));

    res.json({ user, posts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Update Profile
app.put('/api/users/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { name, bio, avatar } = req.body;
    
    await dbRun(`UPDATE users SET name = ?, bio = ?, avatar = ? WHERE id = ?`, [name, bio, avatar, userId]);
    const updatedUser = await dbGet(`SELECT * FROM users WHERE id = ?`, [userId]);
    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Get Feed Posts & Reels (Paginated, filtered)
app.get('/api/posts', async (req, res) => {
  try {
    const type = req.query.type; // 'post', 'reel', or undefined (both)
    const filterUserId = req.query.user_id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const offset = (page - 1) * limit;

    let sql = `SELECT * FROM posts`;
    let params = [];
    let conditions = [];

    if (type) {
      conditions.push(`type = ?`);
      params.push(type);
    }

    if (filterUserId) {
      conditions.push(`user_id = ?`);
      params.push(filterUserId);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ` + conditions.join(' AND ');
    }

    sql += ` ORDER BY id ASC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const rawPosts = await dbQuery(sql, params);
    const formattedPosts = await Promise.all(rawPosts.map(p => formatPost(p, currentUserId)));

    const countSql = `SELECT COUNT(*) as total FROM posts` + (conditions.length > 0 ? ` WHERE ` + conditions.join(' AND ') : '');
    const countResult = await dbGet(countSql, params.slice(0, conditions.length));

    res.json({
      posts: formattedPosts,
      total: countResult.total,
      page,
      limit
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Create New Post / Reel
app.post('/api/posts', async (req, res) => {
  try {
    const { type, media_url, caption, location, audio_title, audio_artist } = req.body;
    if (!media_url) return res.status(400).json({ error: 'Media URL is required' });

    const postType = type === 'reel' ? 'reel' : 'post';
    const result = await dbRun(
      `INSERT INTO posts (user_id, type, media_url, thumbnail_url, caption, location, audio_title, audio_artist)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        currentUserId,
        postType,
        media_url,
        media_url,
        caption || '',
        location || '',
        audio_title || 'Original Audio',
        audio_artist || 'User'
      ]
    );

    const newPost = await dbGet(`SELECT * FROM posts WHERE id = ?`, [result.lastID]);
    const formatted = await formatPost(newPost, currentUserId);
    res.status(201).json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Add Comment
app.post('/api/posts/:id/comments', async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: 'Comment text cannot be empty' });

    const commentRes = await dbRun(
      `INSERT INTO comments (post_id, user_id, text) VALUES (?, ?, ?)`,
      [postId, currentUserId, text.trim()]
    );

    await dbRun(`UPDATE posts SET comments_count = comments_count + 1 WHERE id = ?`, [postId]);

    const newComment = await dbGet(
      `SELECT c.id, c.text, c.created_at, u.id as user_id, u.username, u.avatar
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.id = ?`,
      [commentRes.lastID]
    );

    res.status(201).json(newComment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Toggle Like Post
app.post('/api/posts/:id/like', async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const existingLike = await dbGet(`SELECT 1 FROM likes WHERE user_id = ? AND post_id = ?`, [currentUserId, postId]);

    let hasLiked;
    if (existingLike) {
      await dbRun(`DELETE FROM likes WHERE user_id = ? AND post_id = ?`, [currentUserId, postId]);
      await dbRun(`UPDATE posts SET likes_count = MAX(0, likes_count - 1) WHERE id = ?`, [postId]);
      hasLiked = false;
    } else {
      await dbRun(`INSERT INTO likes (user_id, post_id) VALUES (?, ?)`, [currentUserId, postId]);
      await dbRun(`UPDATE posts SET likes_count = likes_count + 1 WHERE id = ?`, [postId]);
      hasLiked = true;
    }

    const updatedPost = await dbGet(`SELECT likes_count FROM posts WHERE id = ?`, [postId]);
    res.json({
      has_liked: hasLiked,
      likes_count: updatedPost.likes_count
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 10. Toggle Follow User
app.post('/api/users/:id/follow', async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.id);
    if (targetUserId === currentUserId) {
      return res.status(400).json({ error: 'You cannot follow yourself' });
    }

    const existingFollow = await dbGet(
      `SELECT 1 FROM followers WHERE follower_id = ? AND following_id = ?`,
      [currentUserId, targetUserId]
    );

    let isFollowing;
    if (existingFollow) {
      await dbRun(`DELETE FROM followers WHERE follower_id = ? AND following_id = ?`, [currentUserId, targetUserId]);
      isFollowing = false;
    } else {
      await dbRun(`INSERT INTO followers (follower_id, following_id) VALUES (?, ?)`, [currentUserId, targetUserId]);
      isFollowing = true;
    }

    const followerCountRow = await dbGet(`SELECT COUNT(*) as count FROM followers WHERE following_id = ?`, [targetUserId]);
    res.json({
      is_following: isFollowing,
      follower_count: followerCountRow.count
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fallback to serving SPA index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Social Media Server listening at http://localhost:${PORT}`);
});
