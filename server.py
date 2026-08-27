import http.server
import socketserver
import json
import sqlite3
import urllib.parse
import os
import sys
import base64
import time
import hashlib

PORT = 3000
BASE_DIR = os.path.dirname(__file__)
PUBLIC_DIR = os.path.join(BASE_DIR, 'public')
UPLOADS_DIR = os.path.join(PUBLIC_DIR, 'uploads')

if not os.path.exists(UPLOADS_DIR):
    os.makedirs(UPLOADS_DIR)

# Rate Limiter dictionary { ip: [timestamp_list] }
RATE_LIMIT_STORE = {}

def get_db():
    conn = sqlite3.connect(os.path.join(BASE_DIR, 'social_media.db'))
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender_id INTEGER NOT NULL,
            receiver_id INTEGER NOT NULL,
            text TEXT,
            post_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    # PERFORMANCE OPTIMIZATION: Database Indexes
    c.execute("CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);")
    c.execute("CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id);")
    c.execute("CREATE INDEX IF NOT EXISTS idx_posts_type ON posts(type);")
    c.execute("CREATE INDEX IF NOT EXISTS idx_likes_user_post ON likes(user_id, post_id);")
    c.execute("CREATE INDEX IF NOT EXISTS idx_followers ON followers(follower_id, following_id);")
    c.execute("CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);")
    c.execute("CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(sender_id, receiver_id);")
    conn.commit()
    return conn

def hash_password(password):
    return hashlib.sha256(password.encode('utf-8')).hexdigest()



def format_post(conn, post_row, active_user_id):
    post = dict(post_row)
    c = conn.cursor()
    
    # Get author info
    c.execute("SELECT id, username, name, avatar, verified FROM users WHERE id = ?", (post['user_id'],))
    user_row = c.fetchone()
    user = dict(user_row) if user_row else {}

    # Follow status
    is_following = False
    if active_user_id and user.get('id') and user['id'] != active_user_id:
        c.execute("SELECT 1 FROM followers WHERE follower_id = ? AND following_id = ?", (active_user_id, user['id']))
        is_following = bool(c.fetchone())
    user['is_following'] = is_following
    post['user'] = user

    # Like status (check if active_user_id specifically has liked this post)
    has_liked = False
    if active_user_id:
        c.execute("SELECT 1 FROM likes WHERE user_id = ? AND post_id = ?", (active_user_id, post['id']))
        has_liked = bool(c.fetchone())
    post['has_liked'] = has_liked

    # Comments list
    c.execute("""
        SELECT c.id, c.text, c.created_at, u.id as user_id, u.username, u.avatar
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.post_id = ?
        ORDER BY c.created_at ASC
    """, (post['id'],))
    post['comments'] = [dict(row) for row in c.fetchall()]

    return post

class SocialMediaRequestHandler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        parsed_path = urllib.parse.urlparse(path).path
        if parsed_path == '/' or not os.path.exists(os.path.join(PUBLIC_DIR, parsed_path.lstrip('/'))):
            if not parsed_path.startswith('/api'):
                return os.path.join(PUBLIC_DIR, 'index.html')
        return os.path.join(PUBLIC_DIR, parsed_path.lstrip('/'))

    def _send_json(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-User-Id')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

    def _get_active_user_id(self):
        # Header or query param active user ID
        header_val = self.headers.get('X-User-Id')
        if header_val:
            try:
                return int(header_val)
            except ValueError:
                pass
        return None

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-User-Id')
        self.end_headers()

    def do_GET(self):
        active_user_id = self._get_active_user_id()
        url_parts = urllib.parse.urlparse(self.path)
        path = url_parts.path
        query = urllib.parse.parse_qs(url_parts.query)

        if path.startswith('/api/'):
            conn = get_db()
            c = conn.cursor()

            try:
                # 1. GET Current User
                if path == '/api/current_user':
                    if not active_user_id:
                        return self._send_json({"error": "Not authenticated"}, 401)
                    c.execute("""
                        SELECT u.id, u.username, u.name, u.avatar, u.bio, u.verified,
                          (SELECT COUNT(*) FROM posts WHERE user_id = u.id) as posts_count,
                          (SELECT COUNT(*) FROM followers WHERE following_id = u.id) as follower_count,
                          (SELECT COUNT(*) FROM followers WHERE follower_id = u.id) as following_count
                        FROM users u
                        WHERE u.id = ?
                    """, (active_user_id,))
                    user = c.fetchone()
                    if not user:
                        return self._send_json({"error": "User not found"}, 404)
                    return self._send_json(dict(user))

                # 2. GET Users list
                elif path == '/api/users':
                    c.execute("""
                        SELECT u.id, u.username, u.name, u.avatar, u.verified, u.bio,
                          (SELECT COUNT(*) FROM followers WHERE following_id = u.id) as follower_count,
                          (SELECT COUNT(*) FROM followers WHERE follower_id = u.id) as following_count,
                          EXISTS(SELECT 1 FROM followers WHERE follower_id = ? AND following_id = u.id) as is_following
                        FROM users u
                        ORDER BY u.username ASC
                    """, (active_user_id or 0,))
                    users = [dict(row) for row in c.fetchall()]
                    return self._send_json(users)

                # 3. GET User Profile
                elif path.startswith('/api/users/'):
                    user_id = int(path.split('/')[-1])
                    c.execute("""
                        SELECT u.id, u.username, u.name, u.avatar, u.bio, u.verified,
                          (SELECT COUNT(*) FROM posts WHERE user_id = u.id) as posts_count,
                          (SELECT COUNT(*) FROM followers WHERE following_id = u.id) as follower_count,
                          (SELECT COUNT(*) FROM followers WHERE follower_id = u.id) as following_count,
                          EXISTS(SELECT 1 FROM followers WHERE follower_id = ? AND following_id = u.id) as is_following
                        FROM users u
                        WHERE u.id = ?
                    """, (active_user_id or 0, user_id))
                    user = c.fetchone()
                    if not user:
                        return self._send_json({"error": "User not found"}, 404)

                    c.execute("SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC", (user_id,))
                    posts = [format_post(conn, row, active_user_id) for row in c.fetchall()]

                    return self._send_json({"user": dict(user), "posts": posts})

                # 4. GET Feed Posts & Reels
                elif path == '/api/posts':
                    post_type = query.get('type', [None])[0]
                    filter_user = query.get('user_id', [None])[0]
                    limit = int(query.get('limit', [100])[0])

                    sql = "SELECT * FROM posts"
                    params = []
                    conds = []
                    if post_type:
                        conds.append("type = ?")
                        params.append(post_type)
                    if filter_user:
                        conds.append("user_id = ?")
                        params.append(filter_user)

                    if conds:
                        sql += " WHERE " + " AND ".join(conds)
                    sql += " ORDER BY id ASC LIMIT ?"
                    params.append(limit)

                    c.execute(sql, params)
                    posts = [format_post(conn, row, active_user_id) for row in c.fetchall()]

                    return self._send_json({"posts": posts, "total": len(posts)})

                # 5. GET Direct Messages with a specific user
                elif path.startswith('/api/messages/'):
                    target_user_id = int(path.split('/')[-1])
                    if not active_user_id:
                        return self._send_json({"error": "Not authenticated"}, 401)

                    c.execute("""
                        SELECT m.id, m.sender_id, m.receiver_id, m.text, m.post_id, m.created_at,
                               u.username as sender_username, u.avatar as sender_avatar
                        FROM messages m
                        JOIN users u ON m.sender_id = u.id
                        WHERE (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)
                        ORDER BY m.created_at ASC
                    """, (active_user_id, target_user_id, target_user_id, active_user_id))
                    
                    messages = []
                    for row in c.fetchall():
                        msg = dict(row)
                        if msg['post_id']:
                            c.execute("SELECT * FROM posts WHERE id = ?", (msg['post_id'],))
                            post_row = c.fetchone()
                            if post_row:
                                msg['post'] = format_post(conn, post_row, active_user_id)
                        messages.append(msg)

                    return self._send_json(messages)

            finally:
                conn.close()


        # Otherwise serve static files
        return super().do_GET()

    def do_POST(self):
        active_user_id = self._get_active_user_id()
        path = self.path
        content_length = int(self.headers.get('Content-Length', 0))
        body_bytes = self.rfile.read(content_length) if content_length > 0 else b'{}'
        data = json.loads(body_bytes.decode('utf-8')) if body_bytes else {}

        if path.startswith('/api/'):
            conn = get_db()
            c = conn.cursor()

            try:
                # 1. USER REGISTER
                if path == '/api/register':
                    username = data.get('username', '').strip().lower()
                    password = data.get('password', '').strip()
                    name = data.get('name', '').strip() or username
                    avatar = data.get('avatar', '').strip() or 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80'

                    if not username or not password:
                        return self._send_json({"error": "Username and password required"}, 400)

                    c.execute("SELECT id FROM users WHERE username = ?", (username,))
                    if c.fetchone():
                        return self._send_json({"error": "Username already taken"}, 400)

                    c.execute("INSERT INTO users (username, password, name, avatar, bio) VALUES (?, ?, ?, ?, ?)",
                              (username, password, name, avatar, "Hey! I am using InstaPulse ✨"))
                    conn.commit()
                    user_id = c.lastrowid

                    c.execute("SELECT id, username, name, avatar, bio, verified FROM users WHERE id = ?", (user_id,))
                    return self._send_json({"message": "Registration successful", "user": dict(c.fetchone())}, 201)

                # 2. USER LOGIN
                elif path == '/api/login':
                    username = data.get('username', '').strip().lower()
                    password = data.get('password', '').strip()

                    c.execute("SELECT id, username, name, avatar, bio, verified FROM users WHERE username = ? AND password = ?", (username, password))
                    user = c.fetchone()
                    if not user:
                        return self._send_json({"error": "Invalid username or password"}, 401)
                    return self._send_json({"message": "Login successful", "user": dict(user)})

                # 3. UPLOAD FILE (Base64 data URL, blob, or external link)
                elif path == '/api/upload':
                    file_data = data.get('file_data') # Base64 string or URL
                    file_type = data.get('file_type', 'image') # 'image' or 'video'

                    if not file_data:
                        return self._send_json({"error": "Invalid file payload"}, 400)

                    # If already a public URL or blob link, return directly
                    if file_data.startswith('http://') or file_data.startswith('https://') or file_data.startswith('blob:'):
                        return self._send_json({"url": file_data, "type": file_type}, 201)

                    try:
                        if ';' in file_data and ',' in file_data:
                            header, encoded = file_data.split(';', 1)
                            _, data_str = encoded.split(',', 1)
                            decoded_bytes = base64.b64decode(data_str)
                        else:
                            decoded_bytes = base64.b64decode(file_data)

                        ext = '.mp4' if file_type == 'video' else '.jpg'
                        filename = f"media_{int(time.time() * 1000)}{ext}"
                        filepath = os.path.join(UPLOADS_DIR, filename)

                        with open(filepath, 'wb') as f:
                            f.write(decoded_bytes)

                        public_url = f"/uploads/{filename}"
                        return self._send_json({"url": public_url, "type": file_type}, 201)
                    except Exception as e:
                        print("Upload save exception:", e)
                        return self._send_json({"url": file_data, "type": file_type}, 201)


                # 4. CREATE POST / REEL
                elif path == '/api/posts':
                    if not active_user_id:
                        return self._send_json({"error": "Login required to post"}, 401)

                    post_type = 'reel' if data.get('type') == 'reel' else 'post'
                    media_url = data.get('media_url')
                    caption = data.get('caption', '')
                    location = data.get('location', '')
                    audio_title = data.get('audio_title', 'Original Audio')

                    c.execute("SELECT name FROM users WHERE id = ?", (active_user_id,))
                    user_row = c.fetchone()
                    artist_name = user_row['name'] if user_row else 'User'

                    c.execute("""
                        INSERT INTO posts (user_id, type, media_url, thumbnail_url, caption, location, audio_title, audio_artist)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """, (active_user_id, post_type, media_url, media_url, caption, location, audio_title, artist_name))
                    conn.commit()
                    post_id = c.lastrowid

                    c.execute("SELECT * FROM posts WHERE id = ?", (post_id,))
                    new_post = format_post(conn, c.fetchone(), active_user_id)
                    return self._send_json(new_post, 201)

                # 5. TOGGLE LIKE
                elif path.endswith('/like'):
                    if not active_user_id:
                        return self._send_json({"error": "Login required to like"}, 401)

                    post_id = int(path.split('/')[-2])
                    c.execute("SELECT 1 FROM likes WHERE user_id = ? AND post_id = ?", (active_user_id, post_id))
                    if c.fetchone():
                        c.execute("DELETE FROM likes WHERE user_id = ? AND post_id = ?", (active_user_id, post_id))
                        c.execute("UPDATE posts SET likes_count = MAX(0, likes_count - 1) WHERE id = ?", (post_id,))
                        has_liked = False
                    else:
                        c.execute("INSERT INTO likes (user_id, post_id) VALUES (?, ?)", (active_user_id, post_id))
                        c.execute("UPDATE posts SET likes_count = likes_count + 1 WHERE id = ?", (post_id,))
                        has_liked = True
                    conn.commit()

                    c.execute("SELECT likes_count FROM posts WHERE id = ?", (post_id,))
                    updated = c.fetchone()
                    return self._send_json({"has_liked": has_liked, "likes_count": updated['likes_count']})

                # 6. TOGGLE FOLLOW
                elif path.endswith('/follow'):
                    if not active_user_id:
                        return self._send_json({"error": "Login required to follow"}, 401)

                    target_user_id = int(path.split('/')[-2])
                    if target_user_id == active_user_id:
                        return self._send_json({"error": "Cannot follow yourself"}, 400)

                    c.execute("SELECT 1 FROM followers WHERE follower_id = ? AND following_id = ?", (active_user_id, target_user_id))
                    if c.fetchone():
                        c.execute("DELETE FROM followers WHERE follower_id = ? AND following_id = ?", (active_user_id, target_user_id))
                        is_following = False
                    else:
                        c.execute("INSERT INTO followers (follower_id, following_id) VALUES (?, ?)", (active_user_id, target_user_id))
                        is_following = True
                    conn.commit()

                    c.execute("SELECT COUNT(*) as count FROM followers WHERE following_id = ?", (target_user_id,))
                    count_row = c.fetchone()
                    return self._send_json({"is_following": is_following, "follower_count": count_row['count']})

                # 7. ADD COMMENT
                elif '/comments' in path:
                    if not active_user_id:
                        return self._send_json({"error": "Login required to comment"}, 401)

                    post_id = int(path.split('/')[-2])
                    text = data.get('text', '').strip()
                    if not text:
                        return self._send_json({"error": "Comment empty"}, 400)

                    c.execute("INSERT INTO comments (post_id, user_id, text) VALUES (?, ?, ?)", (post_id, active_user_id, text))
                    c.execute("UPDATE posts SET comments_count = comments_count + 1 WHERE id = ?", (post_id,))
                    conn.commit()
                    comment_id = c.lastrowid

                    c.execute("""
                        SELECT c.id, c.text, c.created_at, u.id as user_id, u.username, u.avatar
                        FROM comments c
                        JOIN users u ON c.user_id = u.id
                        WHERE c.id = ?
                    """, (comment_id,))
                    return self._send_json(dict(c.fetchone()), 201)

                # 8. SEND DIRECT MESSAGE OR SHARE REEL
                elif path == '/api/messages':
                    if not active_user_id:
                        return self._send_json({"error": "Login required to send message"}, 401)

                    receiver_id = int(data.get('receiver_id'))
                    text = data.get('text', '').strip()
                    post_id = data.get('post_id')

                    c.execute("""
                        INSERT INTO messages (sender_id, receiver_id, text, post_id)
                        VALUES (?, ?, ?, ?)
                    """, (active_user_id, receiver_id, text, post_id))
                    conn.commit()
                    msg_id = c.lastrowid

                    # SIMULATED INSTANT AUTO-REPLY FROM FAKE USER
                    if receiver_id != active_user_id:
                        c.execute("SELECT username FROM users WHERE id = ?", (receiver_id,))
                        target_row = c.fetchone()
                        if target_row:
                            target_username = target_row['username']
                            replies = [
                                f"Hey!! Thanks for sharing this with me! 🔥",
                                f"Omg love this reel! So cool 🙌",
                                f"Haha awesome! Let's catch up soon ✨",
                                f"Thanks for sending! Check out my new post on my profile too 📸"
                            ]
                            auto_text = replies[msg_id % len(replies)]
                            if post_id:
                                auto_text = f"Woah! Thanks for sending this reel! Watching it right now 🍿✨"
                            
                            c.execute("""
                                INSERT INTO messages (sender_id, receiver_id, text)
                                VALUES (?, ?, ?)
                            """, (receiver_id, active_user_id, auto_text))
                            conn.commit()

                    c.execute("""
                        SELECT m.id, m.sender_id, m.receiver_id, m.text, m.post_id, m.created_at,
                               u.username as sender_username, u.avatar as sender_avatar
                        FROM messages m
                        JOIN users u ON m.sender_id = u.id
                        WHERE m.id = ?
                    """, (msg_id,))
                    sent_msg = dict(c.fetchone())
                    if post_id:
                        c.execute("SELECT * FROM posts WHERE id = ?", (post_id,))
                        post_row = c.fetchone()
                        if post_row:
                            sent_msg['post'] = format_post(conn, post_row, active_user_id)

                    return self._send_json(sent_msg, 201)

            finally:
                conn.close()


def run():
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), SocialMediaRequestHandler) as httpd:
        print(f"[+] New Day Social Media Server running at http://localhost:{PORT}")
        httpd.serve_forever()

if __name__ == '__main__':
    run()

