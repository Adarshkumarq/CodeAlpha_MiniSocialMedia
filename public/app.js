// NEW DAY APPLICATION ENGINE - FULL DIRECT MESSAGES & SHARE REEL ENGINE

let currentUser = null;
let allUsers = [];
let allPosts = [];
let activeTab = 'feed';
let activePostForComments = null;
let activeChatUser = null;
let activeSharePostId = null;

// Camera & Upload state
let cameraStream = null;
let mediaRecorder = null;
let recordedChunks = [];
let selectedMediaUrl = null;
let selectedMediaType = 'image';
let isAudioMuted = false;

// Audio Tracks Database for Guaranteed Reel Sound
const MUSIC_TRACKS = [
  'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3',
  'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=tropical-house-11333.mp3',
  'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a7346b.mp3?filename=chill-abstract-intention-12099.mp3',
  'https://cdn.pixabay.com/download/audio/2021/09/06/audio_8b241315b9.mp3?filename=synthwave-80s-110045.mp3'
];

// DOM Elements
const reelAudioPlayer = document.getElementById('reel-audio-player');
const audioEnableBanner = document.getElementById('audio-enable-banner');

const authModal = document.getElementById('auth-modal');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const tabLoginBtn = document.getElementById('tab-login-btn');
const tabSignupBtn = document.getElementById('tab-signup-btn');
const loginError = document.getElementById('login-error');
const signupError = document.getElementById('signup-error');

const navUserAvatar = document.getElementById('nav-user-avatar');
const rightUserAvatar = document.getElementById('right-user-avatar');
const rightUserHandle = document.getElementById('right-user-handle');
const rightUserFullname = document.getElementById('right-user-fullname');
const suggestionsList = document.getElementById('suggestions-list');

const feedContainer = document.getElementById('feed-container');
const reelsContainer = document.getElementById('reels-container');
const storiesContainer = document.getElementById('stories-container');
const exploreGrid = document.getElementById('explore-grid');
const profileGrid = document.getElementById('profile-grid');

const createModal = document.getElementById('create-modal');
const editProfileModal = document.getElementById('edit-profile-modal');
const commentsModal = document.getElementById('comments-modal');
const messagesModal = document.getElementById('messages-modal');
const notificationsModal = document.getElementById('notifications-modal');
const shareModal = document.getElementById('share-modal');

// GLOBAL SIDEBAR ROUTING & INTERACTIVE NAVIGATION HANDLERS
window.switchTab = function (tabName, shouldLoadProfile = true) {
  console.log('Routing to view:', tabName);
  activeTab = tabName;

  if (tabName !== 'reels' && reelAudioPlayer) {
    try { reelAudioPlayer.pause(); } catch (e) {}
  }

  // 1. Highlight current active navigation button in left sidebar
  const navBtns = document.querySelectorAll('.nav-item');
  navBtns.forEach(btn => {
    if (btn.dataset.tab === tabName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // 2. Route & show target view page
  const tabPages = document.querySelectorAll('.tab-page');
  tabPages.forEach(page => {
    if (page.id === `tab-${tabName}`) {
      page.classList.add('active');
      page.style.display = 'block';
    } else {
      page.classList.remove('active');
      page.style.display = 'none';
    }
  });

  // 3. Specific tab route actions
  if (tabName === 'profile' && shouldLoadProfile) {
    if (currentUser) {
      window.openUserProfile(currentUser.id);
    } else {
      autoLoginDemoUser().then(() => {
        if (currentUser) window.openUserProfile(currentUser.id);
      });
    }
  }
};

window.openSearchOverlay = function () {
  window.switchTab('explore');
  const searchInput = document.getElementById('explore-search');
  if (searchInput) {
    setTimeout(() => searchInput.focus(), 100);
  }
};

window.openCreateModal = function () {
  if (createModal) createModal.classList.add('active');
};

window.openMessagesDrawer = function () {
  renderDMContacts();
  if (messagesModal) messagesModal.classList.add('active');
};

window.openNotificationsDrawer = function () {
  if (notificationsModal) notificationsModal.classList.add('active');
};

window.showAuthModal = function () {
  if (authModal) authModal.classList.add('active');
};

window.logoutUser = function () {
  localStorage.removeItem('newday_user_session');
  currentUser = null;
  window.showAuthModal();
};

// DIRECT MESSAGING ENGINE FOR FAKE USERS
function renderDMContacts() {
  const dmContactsList = document.getElementById('dm-contacts-list');
  if (!dmContactsList) return;

  dmContactsList.innerHTML = '';
  const fakeContacts = allUsers.filter(u => !currentUser || u.id !== currentUser.id);

  if (!activeChatUser && fakeContacts.length > 0) {
    activeChatUser = fakeContacts[0];
  }

  fakeContacts.forEach(u => {
    const item = document.createElement('div');
    item.className = `dm-contact-item ${activeChatUser && activeChatUser.id === u.id ? 'active' : ''}`;
    item.onclick = () => selectDMChatUser(u);

    item.innerHTML = `
      <div class="dm-avatar-box">
        <img src="${u.avatar}" alt="${u.username}">
        <span class="online-dot"></span>
      </div>
      <div class="dm-contact-info">
        <span class="dm-contact-name">${u.username}</span>
        <span class="dm-contact-sub">${u.name}</span>
      </div>
    `;
    dmContactsList.appendChild(item);
  });

  if (activeChatUser) {
    selectDMChatUser(activeChatUser);
  }
}

function selectDMChatUser(user) {
  activeChatUser = user;
  
  const targetAvatar = document.getElementById('dm-target-avatar');
  const targetUsername = document.getElementById('dm-target-username');
  if (targetAvatar) targetAvatar.src = user.avatar;
  if (targetUsername) targetUsername.textContent = `@${user.username}`;

  // Highlight active item
  document.querySelectorAll('.dm-contact-item').forEach(el => el.classList.remove('active'));

  loadDMMessages(user.id);
}

async function loadDMMessages(targetUserId) {
  const messagesBody = document.getElementById('dm-messages-body');
  if (!messagesBody) return;

  messagesBody.innerHTML = '<div style="text-align:center; color:#888; padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> Loading messages...</div>';

  try {
    const res = await fetchWithAuth(`/api/messages/${targetUserId}`);
    const messages = await res.json();

    messagesBody.innerHTML = '';
    if (!messages.length) {
      messagesBody.innerHTML = `
        <div style="text-align:center; padding:40px 20px; color:var(--ig-text-secondary);">
          <img src="${activeChatUser.avatar}" style="width:64px; height:64px; border-radius:50%; margin-bottom:12px;">
          <h4 style="color:#fff;">@${activeChatUser.username}</h4>
          <p style="font-size:12px; margin-top:4px;">Send a message or share a reel to start chatting!</p>
        </div>
      `;
      return;
    }

    messages.forEach(msg => {
      const isSent = currentUser && msg.sender_id === currentUser.id;
      const row = document.createElement('div');
      row.className = `msg-row ${isSent ? 'sent' : 'received'}`;

      let contentHTML = '';
      if (msg.post) {
        const isVideo = msg.post.type === 'reel';
        contentHTML = `
          <div class="shared-reel-card">
            ${isVideo ? `<video src="${msg.post.media_url}" muted loop autoplay playsinline style="width:100%; aspect-ratio:9/16; object-fit:cover;"></video>` : `<img src="${msg.post.media_url}" style="width:100%; aspect-ratio:1/1; object-fit:cover;">`}
            <div class="shared-reel-caption"><strong>@${msg.post.user.username}</strong>: ${msg.post.caption}</div>
          </div>
        `;
      }
      if (msg.text) {
        contentHTML += `<div class="msg-bubble">${msg.text}</div>`;
      }

      row.innerHTML = `
        ${!isSent ? `<img class="msg-avatar" src="${msg.sender_avatar}">` : ''}
        <div>${contentHTML}</div>
      `;
      messagesBody.appendChild(row);
    });

    messagesBody.scrollTop = messagesBody.scrollHeight;
  } catch (err) {
    console.error('Load DM messages error:', err);
  }
}

window.sendDirectMessage = async function () {
  const input = document.getElementById('dm-text-input');
  const text = input ? input.value.trim() : '';
  if (!text || !activeChatUser) return;

  try {
    const res = await fetchWithAuth('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiver_id: activeChatUser.id, text })
    });
    if (res.ok) {
      if (input) input.value = '';
      await loadDMMessages(activeChatUser.id);
    }
  } catch (err) {
    console.error('Send DM error:', err);
  }
};

// SHARE REEL / POST MODAL SYSTEM
window.openShareModal = function (postId) {
  activeSharePostId = postId;
  const shareUsersList = document.getElementById('share-users-list');
  if (!shareUsersList) return;

  shareUsersList.innerHTML = '';
  const fakeFriends = allUsers.filter(u => !currentUser || u.id !== currentUser.id);

  fakeFriends.forEach(u => {
    const row = document.createElement('div');
    row.className = 'share-user-row';
    row.innerHTML = `
      <div class="share-user-info">
        <img src="${u.avatar}" alt="${u.username}">
        <div>
          <div style="font-weight:600; font-size:14px;">${u.username}</div>
          <div style="color:var(--ig-text-secondary); font-size:12px;">${u.name}</div>
        </div>
      </div>
      <button type="button" class="uiverse-btn" onclick="window.sharePostToUser(${postId}, ${u.id})">Send</button>
    `;
    shareUsersList.appendChild(row);
  });

  if (shareModal) shareModal.classList.add('active');
};

window.sharePostToUser = async function (postId, receiverId) {
  try {
    const res = await fetchWithAuth('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiver_id: receiverId, post_id: postId, text: 'Check out this Reel! 🔥' })
    });
    if (res.ok) {
      if (shareModal) shareModal.classList.remove('active');
      const targetUser = allUsers.find(u => u.id === receiverId);
      if (targetUser) {
        activeChatUser = targetUser;
        window.openMessagesDrawer();
      }
    }
  } catch (err) {
    console.error('Share post error:', err);
  }
};

// EXPOSE ALL INTERACTIVE ACTIONS TO WINDOW
window.openUserProfile = async function (userId) {
  try {
    const res = await fetchWithAuth(`/api/users/${userId}`);
    const data = await res.json();
    const user = data.user;
    const userPosts = data.posts;

    const profAvatar = document.getElementById('prof-avatar');
    const profUsername = document.getElementById('prof-username');
    const profFullName = document.getElementById('prof-full-name');
    const profBioText = document.getElementById('prof-bio-text');
    const profPostsCount = document.getElementById('prof-posts-count');
    const profFollowersCount = document.getElementById('prof-followers-count');
    const profFollowingCount = document.getElementById('prof-following-count');

    if (profAvatar) profAvatar.src = user.avatar;
    if (profUsername) profUsername.textContent = user.username;
    if (profFullName) profFullName.textContent = user.name;
    if (profBioText) profBioText.textContent = user.bio || 'No bio available';
    if (profPostsCount) profPostsCount.textContent = user.posts_count;
    if (profFollowersCount) profFollowersCount.textContent = user.follower_count;
    if (profFollowingCount) profFollowingCount.textContent = user.following_count;

    const editBtn = document.getElementById('edit-profile-btn');
    const followBtn = document.getElementById('prof-follow-btn');

    if (currentUser && currentUser.id === user.id) {
      if (editBtn) editBtn.style.display = 'inline-block';
      if (followBtn) followBtn.style.display = 'none';
    } else {
      if (editBtn) editBtn.style.display = 'none';
      if (followBtn) {
        followBtn.style.display = 'inline-block';
        followBtn.textContent = user.is_following ? 'Following' : 'Follow';
        followBtn.onclick = (e) => window.toggleFollow(e, user.id);
      }
    }

    renderProfileGrid(userPosts);
    window.switchTab('profile', false);
  } catch (err) {
    console.error('Open profile error:', err);
  }
};

window.handleMediaClick = function (e, postId) {
  const currentTime = new Date().getTime();
  const timeDiff = currentTime - lastClickTime;
  
  if (timeDiff < 300 && timeDiff > 0) {
    triggerHeartAnimation(postId);
    const post = allPosts.find(p => p.id === postId);
    if (post && !post.has_liked) {
      window.toggleLike(e, postId);
    }
  } else {
    const video = e.currentTarget.querySelector('video');
    if (video) {
      if (video.paused) video.play();
      else video.pause();
    }
  }
  lastClickTime = currentTime;
};

window.toggleLike = async function (e, postId) {
  if (e) e.stopPropagation();
  try {
    const res = await fetchWithAuth(`/api/posts/${postId}/like`, { method: 'POST' });
    const data = await res.json();

    const post = allPosts.find(p => p.id === postId);
    if (post) {
      post.has_liked = data.has_liked;
      post.likes_count = data.likes_count;
    }

    const likeBtn = document.getElementById(`like-btn-${postId}`);
    const likesCount = document.getElementById(`likes-count-${postId}`);
    if (likeBtn) {
      likeBtn.className = `action-btn ${data.has_liked ? 'liked' : ''}`;
      likeBtn.querySelector('i').className = `${data.has_liked ? 'fa-solid' : 'fa-regular'} fa-heart`;
    }
    if (likesCount) {
      likesCount.textContent = data.likes_count.toLocaleString();
    }

    const reelLikeBtn = document.getElementById(`reel-like-btn-${postId}`);
    const reelLikesCount = document.getElementById(`reel-likes-count-${postId}`);
    if (reelLikeBtn) {
      reelLikeBtn.className = `reel-action-btn ${data.has_liked ? 'liked' : ''}`;
      reelLikeBtn.querySelector('i').className = `${data.has_liked ? 'fa-solid' : 'fa-regular'} fa-heart`;
    }
    if (reelLikesCount) {
      reelLikesCount.textContent = data.likes_count;
    }
  } catch (err) {
    console.error('Toggle like error:', err);
  }
};

window.toggleFollow = async function (e, targetUserId) {
  if (e) e.stopPropagation();
  try {
    const res = await fetchWithAuth(`/api/users/${targetUserId}/follow`, { method: 'POST' });
    const data = await res.json();

    allPosts.forEach(p => {
      if (p.user.id === targetUserId) {
        p.user.is_following = data.is_following;
      }
    });

    renderFeedPosts();
    renderReelsView();
    renderSuggestionsList();

    const profFollowBtn = document.getElementById('prof-follow-btn');
    const profFollowersCount = document.getElementById('prof-followers-count');
    if (profFollowBtn) {
      profFollowBtn.textContent = data.is_following ? 'Following' : 'Follow';
    }
    if (profFollowersCount) {
      profFollowersCount.textContent = data.follower_count;
    }
  } catch (err) {
    console.error('Toggle follow error:', err);
  }
};

window.openCommentsDrawer = function (postId) {
  activePostForComments = allPosts.find(p => p.id === postId);
  if (!activePostForComments) return;

  renderCommentsList();
  if (commentsModal) commentsModal.classList.add('active');
};

window.enableAudioGesture = function (e) {
  isAudioMuted = false;
  if (audioEnableBanner) audioEnableBanner.style.display = 'none';
  
  const activeCard = document.querySelector('.reel-card.active-reel');
  if (activeCard) {
    const audioSrc = activeCard.dataset.audioSrc;
    if (audioSrc && reelAudioPlayer && reelAudioPlayer.src !== audioSrc) {
      reelAudioPlayer.src = audioSrc;
    }
    if (reelAudioPlayer) reelAudioPlayer.play().catch(err => console.log('Audio play error:', err));
  }
};

window.submitComment = async function () {
  const input = document.getElementById('new-comment-input');
  const text = input ? input.value.trim() : '';
  if (!text || !activePostForComments) return;

  try {
    const res = await fetchWithAuth(`/api/posts/${activePostForComments.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    const newComment = await res.json();

    activePostForComments.comments.push(newComment);
    if (input) input.value = '';
    renderCommentsList();
    renderFeedPosts();
  } catch (err) {
    console.error('Submit comment error:', err);
  }
};

// INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  checkAuthSession();
});

// AUTO LOGIN DEMO USER FALLBACK
async function autoLoginDemoUser() {
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'alex_cyber', password: 'password123' })
    });
    if (res.ok) {
      const data = await res.json();
      currentUser = data.user;
      localStorage.setItem('newday_user_session', JSON.stringify(currentUser));
      updateCurrentUserUI();
    }
  } catch (e) {
    console.error('Auto login error:', e);
  }
}

// AUTH SESSION CHECK
async function checkAuthSession() {
  const savedUser = localStorage.getItem('newday_user_session');
  if (savedUser) {
    try {
      currentUser = JSON.parse(savedUser);
    } catch (e) {
      await autoLoginDemoUser();
    }
  } else {
    await autoLoginDemoUser();
  }

  if (authModal) authModal.classList.remove('active');
  updateCurrentUserUI();
  initApp();
}

// FETCH WITH AUTH HEADER
async function fetchWithAuth(url, options = {}) {
  options.headers = options.headers || {};
  if (currentUser) {
    options.headers['X-User-Id'] = currentUser.id;
  }
  return fetch(url, options);
}

// INIT APP
async function initApp() {
  try {
    if (currentUser) {
      const resUser = await fetchWithAuth('/api/current_user');
      if (resUser.ok) {
        currentUser = await resUser.json();
        localStorage.setItem('newday_user_session', JSON.stringify(currentUser));
        updateCurrentUserUI();
      }
    }

    const resUsers = await fetchWithAuth('/api/users');
    if (resUsers.ok) {
      allUsers = await resUsers.json();
      renderStoriesBar();
      renderSuggestionsList();
    }

    await fetchPosts();
    window.switchTab('feed', false);
  } catch (err) {
    console.error('Init app error:', err);
  }
}

// UPDATE CURRENT USER SIDEBAR & DESKTOP ROW
function updateCurrentUserUI() {
  if (!currentUser) return;
  if (navUserAvatar) navUserAvatar.src = currentUser.avatar;
  if (rightUserAvatar) rightUserAvatar.src = currentUser.avatar;
  if (rightUserHandle) rightUserHandle.textContent = `@${currentUser.username}`;
  if (rightUserFullname) rightUserFullname.textContent = currentUser.name;
}

// RENDER STORIES TRAY
function renderStoriesBar() {
  if (!storiesContainer) return;
  storiesContainer.innerHTML = '';
  allUsers.forEach(u => {
    const storyDiv = document.createElement('div');
    storyDiv.className = 'story-item';
    storyDiv.innerHTML = `
      <div class="story-ring">
        <img src="${u.avatar}" alt="${u.username}">
      </div>
      <span class="story-username">${u.username}</span>
    `;
    storyDiv.onclick = (e) => {
      e.stopPropagation();
      window.openUserProfile(u.id);
    };
    storiesContainer.appendChild(storyDiv);
  });
}

// RENDER DESKTOP RIGHT SIDEBAR SUGGESTIONS
function renderSuggestionsList() {
  if (!suggestionsList) return;
  suggestionsList.innerHTML = '';
  
  const suggested = allUsers.filter(u => !currentUser || u.id !== currentUser.id).slice(0, 5);
  suggested.forEach(u => {
    const row = document.createElement('div');
    row.className = 'sugg-user-row';
    row.innerHTML = `
      <div class="right-user-info" onclick="window.openUserProfile(${u.id})">
        <img src="${u.avatar}" alt="${u.username}">
        <div class="right-user-text">
          <span class="right-username">${u.username}</span>
          <span class="right-fullname">Suggested for you</span>
        </div>
      </div>
      <button type="button" class="btn-text-blue" onclick="window.toggleFollow(event, ${u.id})">
        ${u.is_following ? 'Following' : 'Follow'}
      </button>
    `;
    suggestionsList.appendChild(row);
  });
}

// FETCH POSTS
async function fetchPosts() {
  try {
    if (feedContainer) {
      feedContainer.innerHTML = `
        <div class="loading-spinner">
          <i class="fa-solid fa-spinner fa-spin"></i>
          <p>Loading New Day feed...</p>
        </div>
      `;
    }
    const res = await fetchWithAuth('/api/posts?limit=100');
    const data = await res.json();
    allPosts = data.posts || [];
    renderFeedPosts();
    renderReelsView();
    renderExploreView(allPosts);
  } catch (err) {
    console.error('Fetch posts error:', err);
  }
}

// RENDER FEED POSTS
function renderFeedPosts() {
  if (!feedContainer) return;
  if (!allPosts.length) {
    feedContainer.innerHTML = '<p style="text-align:center; color: var(--ig-text-secondary); padding: 40px;">No posts available.</p>';
    return;
  }

  feedContainer.innerHTML = '';
  allPosts.forEach(post => {
    const card = document.createElement('article');
    card.className = 'post-card';
    card.id = `post-card-${post.id}`;

    const isVideo = post.type === 'reel';
    const mediaHTML = isVideo
      ? `<video src="${post.media_url}" loop playsinline muted poster="${post.thumbnail_url || ''}"></video>`
      : `<img src="${post.media_url}" alt="Post media" loading="lazy">`;

    card.innerHTML = `
      <div class="post-header">
        <div class="post-author" onclick="window.openUserProfile(${post.user.id})">
          <img src="${post.user.avatar}" alt="${post.user.username}">
          <div class="post-author-name">
            ${post.user.username}
            ${post.user.verified ? '<i class="fa-solid fa-circle-check verified-icon"></i>' : ''}
          </div>
        </div>
        <button type="button" class="post-more-btn"><i class="fa-solid fa-ellipsis"></i></button>
      </div>

      <div class="post-media-box" onclick="window.handleMediaClick(event, ${post.id})">
        ${mediaHTML}
        <i class="fa-solid fa-heart heart-burst" id="heart-burst-${post.id}"></i>
      </div>

      <div class="post-actions">
        <div class="action-left">
          <button type="button" class="action-btn ${post.has_liked ? 'liked' : ''}" id="like-btn-${post.id}" onclick="window.toggleLike(event, ${post.id})">
            <i class="${post.has_liked ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
          </button>
          <button type="button" class="action-btn" onclick="window.openCommentsDrawer(${post.id})">
            <i class="fa-regular fa-comment"></i>
          </button>
          <button type="button" class="action-btn" onclick="window.openShareModal(${post.id})">
            <i class="fa-regular fa-paper-plane"></i>
          </button>
        </div>
        <button type="button" class="action-btn">
          <i class="fa-regular fa-bookmark"></i>
        </button>
      </div>

      <div class="post-likes-count">
        <span id="likes-count-${post.id}">${post.likes_count.toLocaleString()}</span> likes
      </div>

      <div class="post-caption-text">
        <span class="handle" onclick="window.openUserProfile(${post.user.id})">${post.user.username}</span>
        <span>${post.caption}</span>
      </div>

      <div class="post-comments-view" onclick="window.openCommentsDrawer(${post.id})">
        View all ${post.comments.length} comments
      </div>
    `;

    feedContainer.appendChild(card);
  });
}

// RENDER REELS SNAP PLAYER
function renderReelsView() {
  if (!reelsContainer) return;
  const reelPosts = allPosts.filter(p => p.type === 'reel');
  reelsContainer.innerHTML = '';

  if (!reelPosts.length) {
    reelsContainer.innerHTML = '<div style="padding: 40px; color: var(--ig-text-secondary); text-align:center;">No reels available.</div>';
    return;
  }

  reelPosts.forEach((reel, index) => {
    const musicTrack = MUSIC_TRACKS[index % MUSIC_TRACKS.length];
    const reelCard = document.createElement('div');
    reelCard.className = 'reel-card';
    reelCard.id = `reel-card-${reel.id}`;
    reelCard.dataset.audioSrc = musicTrack;

    reelCard.innerHTML = `
      <video class="reel-video" src="${reel.media_url}" loop playsinline muted poster="${reel.thumbnail_url || ''}"></video>
      
      <div class="reel-overlay" onclick="window.enableAudioGesture(event)">
        <div class="reel-actions-stack">
          <button type="button" class="reel-action-btn ${reel.has_liked ? 'liked' : ''}" id="reel-like-btn-${reel.id}" onclick="window.toggleLike(event, ${reel.id})">
            <i class="${reel.has_liked ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
            <span id="reel-likes-count-${reel.id}">${reel.likes_count}</span>
          </button>
          <button type="button" class="reel-action-btn" onclick="window.openCommentsDrawer(${reel.id})">
            <i class="fa-regular fa-comment"></i>
            <span>${reel.comments.length}</span>
          </button>
          <button type="button" class="reel-action-btn" onclick="window.openShareModal(${reel.id})">
            <i class="fa-regular fa-paper-plane"></i>
          </button>
          <button type="button" class="reel-action-btn">
            <i class="fa-regular fa-bookmark"></i>
          </button>
          <button type="button" class="reel-action-btn">
            <i class="fa-solid fa-ellipsis"></i>
          </button>
        </div>

        <div class="reel-bottom-meta">
          <div style="font-size: 13px; font-weight: 700; color: #fff; margin-bottom: 6px;">
            <i class="fa-solid fa-sun" style="color: #008cff;"></i> New Day Reels
          </div>
          <div class="reel-user-row">
            <img src="${reel.user.avatar}" alt="${reel.user.username}" onclick="window.openUserProfile(${reel.user.id})">
            <span class="reel-user-handle" onclick="window.openUserProfile(${reel.user.id})">${reel.user.username}</span>
            ${
              currentUser && currentUser.id !== reel.user.id
                ? `<button type="button" class="reel-btn-follow" onclick="window.toggleFollow(event, ${reel.user.id})">
                    ${reel.user.is_following ? 'Following' : 'Follow'}
                  </button>`
                : ''
            }
          </div>
          <div class="reel-caption-text">${reel.caption}</div>
          <div style="font-size: 12px; color: #ccc; display:flex; align-items:center; gap:6px;">
            <i class="fa-solid fa-music"></i>
            <span>${reel.audio_title} • ${reel.audio_artist}</span>
          </div>
        </div>
      </div>
    `;

    reelsContainer.appendChild(reelCard);
  });

  setupReelsScrollObserver();
}

function setupReelsScrollObserver() {
  if (!reelsContainer) return;
  const options = {
    root: reelsContainer,
    threshold: 0.6
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const card = entry.target;
      const video = card.querySelector('video');

      if (entry.isIntersecting) {
        card.classList.add('active-reel');
        if (video) video.play().catch(() => {});

        const audioSrc = card.dataset.audioSrc;
        if (audioSrc && !isAudioMuted && reelAudioPlayer) {
          reelAudioPlayer.src = audioSrc;
          reelAudioPlayer.play().catch(e => console.log('Audio error:', e));
        }
      } else {
        card.classList.remove('active-reel');
        if (video) video.pause();
      }
    });
  }, options);

  document.querySelectorAll('.reel-card').forEach(card => observer.observe(card));
}

// RENDER EXPLORE GRID
function renderExploreView(postsList) {
  if (!exploreGrid) return;
  exploreGrid.innerHTML = '';
  postsList.forEach(p => {
    const item = document.createElement('div');
    item.className = 'explore-item';
    const isVideo = p.type === 'reel';
    item.innerHTML = `
      ${isVideo ? `<video src="${p.media_url}" muted loop poster="${p.thumbnail_url || ''}"></video>` : `<img src="${p.media_url}">`}
      <div class="explore-overlay" onclick="window.openCommentsDrawer(${p.id})">
        <span><i class="fa-solid fa-heart"></i> ${p.likes_count}</span>
        <span><i class="fa-solid fa-comment"></i> ${p.comments.length}</span>
      </div>
    `;
    exploreGrid.appendChild(item);
  });
}

function renderProfileGrid(userPosts) {
  if (!profileGrid) return;
  profileGrid.innerHTML = '';
  if (!userPosts.length) {
    profileGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--ig-text-secondary); padding: 40px;">No posts yet.</p>';
    return;
  }

  userPosts.forEach(p => {
    const item = document.createElement('div');
    item.className = 'explore-item';
    const isVideo = p.type === 'reel';
    item.innerHTML = `
      ${isVideo ? `<video src="${p.media_url}" muted loop poster="${p.thumbnail_url || ''}"></video>` : `<img src="${p.media_url}">`}
      <div class="explore-overlay" onclick="window.openCommentsDrawer(${p.id})">
        <span><i class="fa-solid fa-heart"></i> ${p.likes_count}</span>
        <span><i class="fa-solid fa-comment"></i> ${p.comments.length}</span>
      </div>
    `;
    profileGrid.appendChild(item);
  });
}

// MEDIA CLICK & DOUBLE TAP
let lastClickTime = 0;

function triggerHeartAnimation(postId) {
  const heart = document.getElementById(`heart-burst-${postId}`);
  if (heart) {
    heart.classList.add('active');
    setTimeout(() => heart.classList.remove('active'), 800);
  }
}

function renderCommentsList() {
  const commentsList = document.getElementById('comments-list');
  if (!commentsList) return;
  commentsList.innerHTML = '';

  if (!activePostForComments || !activePostForComments.comments || !activePostForComments.comments.length) {
    commentsList.innerHTML = '<p style="text-align: center; color: var(--ig-text-secondary); padding: 20px;">No comments yet.</p>';
    return;
  }

  activePostForComments.comments.forEach(c => {
    const item = document.createElement('div');
    item.className = 'comment-item';
    item.innerHTML = `
      <img src="${c.avatar}" alt="${c.username}">
      <div class="comment-content">
        <span class="comment-author">@${c.username}</span>
        <span>${c.text}</span>
      </div>
    `;
    commentsList.appendChild(item);
  });
}

// CAMERA & FILE UPLOAD
function setupCameraAndUpload() {
  const srcTabFile = document.getElementById('src-tab-file');
  const srcTabCamera = document.getElementById('src-tab-camera');
  const srcTabUrl = document.getElementById('src-tab-url');

  const panelFile = document.getElementById('src-panel-file');
  const panelCamera = document.getElementById('src-panel-camera');
  const panelUrl = document.getElementById('src-panel-url');

  const dropzone = document.getElementById('dropzone');
  const deviceFileInput = document.getElementById('device-file-input');
  const filePreviewBox = document.getElementById('file-preview-box');

  const cameraStreamVid = document.getElementById('camera-stream');
  const startCamBtn = document.getElementById('start-cam-btn');
  const snapPhotoBtn = document.getElementById('snap-photo-btn');
  const recordReelBtn = document.getElementById('record-reel-btn');
  const stopRecBtn = document.getElementById('stop-rec-btn');
  const cameraPreviewBox = document.getElementById('camera-preview-box');
  const recordingBadge = document.getElementById('recording-badge');

  if (srcTabFile) srcTabFile.onclick = () => switchSourceTab('file');
  if (srcTabCamera) srcTabCamera.onclick = () => switchSourceTab('camera');
  if (srcTabUrl) srcTabUrl.onclick = () => switchSourceTab('url');

  function switchSourceTab(tab) {
    if (srcTabFile) srcTabFile.classList.toggle('active', tab === 'file');
    if (srcTabCamera) srcTabCamera.classList.toggle('active', tab === 'camera');
    if (srcTabUrl) srcTabUrl.classList.toggle('active', tab === 'url');

    if (panelFile) panelFile.classList.toggle('active', tab === 'file');
    if (panelCamera) panelCamera.classList.toggle('active', tab === 'camera');
    if (panelUrl) panelUrl.classList.toggle('active', tab === 'url');
  }

  if (dropzone) {
    dropzone.onclick = (e) => {
      // Don't duplicate click if user clicked label or file input natively
      if (e.target !== deviceFileInput && e.target.tagName !== 'INPUT') {
        if (deviceFileInput) deviceFileInput.click();
      }
    };
  }

  if (deviceFileInput) {
    deviceFileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const isVideo = file.type.startsWith('video/');
      selectedMediaType = isVideo ? 'video' : 'image';
      
      const radioInput = document.querySelector(`input[name="post_type"][value="${isVideo ? 'reel' : 'post'}"]`);
      if (radioInput) radioInput.checked = true;

      // INSTANT LOCAL PREVIEW
      const localUrl = URL.createObjectURL(file);
      selectedMediaUrl = localUrl;

      filePreviewBox.style.display = 'block';
      filePreviewBox.innerHTML = isVideo
        ? `<video src="${localUrl}" controls autoplay muted style="width:100%; max-height:300px; border-radius:8px; object-fit:cover;"></video>`
        : `<img src="${localUrl}" style="width:100%; max-height:300px; border-radius:8px; object-fit:cover;">`;

      // ASYNC SERVER UPLOAD IN BACKGROUND
      const reader = new FileReader();
      reader.onload = async function (evt) {
        const base64Data = evt.target.result;
        try {
          const uploadRes = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file_data: base64Data, file_type: selectedMediaType })
          });
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            selectedMediaUrl = uploadData.url;
          }
        } catch (uploadErr) {
          console.log('Background upload error (using local preview):', uploadErr);
        }
      };
      reader.readAsDataURL(file);
    };
  }

  if (startCamBtn) {
    startCamBtn.onclick = async () => {
      try {
        // Try video + audio first
        cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch (err) {
        console.log('Camera with audio failed, trying video only:', err);
        try {
          cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
        } catch (err2) {
          alert('Camera permission denied or camera not available on this device.');
          return;
        }
      }

      if (cameraStream) {
        cameraStreamVid.srcObject = cameraStream;
        startCamBtn.style.display = 'none';
        snapPhotoBtn.style.display = 'inline-flex';
        recordReelBtn.style.display = 'inline-flex';
      }
    };
  }

  if (snapPhotoBtn) {
    snapPhotoBtn.onclick = async () => {
      if (!cameraStream) return;
      const canvas = document.createElement('canvas');
      canvas.width = cameraStreamVid.videoWidth || 640;
      canvas.height = cameraStreamVid.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(cameraStreamVid, 0, 0, canvas.width, canvas.height);

      const dataUrl = canvas.toDataURL('image/jpeg');
      selectedMediaType = 'image';
      selectedMediaUrl = dataUrl;

      const radioInput = document.querySelector('input[name="post_type"][value="post"]');
      if (radioInput) radioInput.checked = true;

      cameraPreviewBox.style.display = 'block';
      cameraPreviewBox.innerHTML = `<img src="${dataUrl}" style="width:100%; max-height:300px; border-radius:8px; object-fit:cover;">`;

      // Upload to server
      try {
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file_data: dataUrl, file_type: 'image' })
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          selectedMediaUrl = uploadData.url;
        }
      } catch (e) {}
    };
  }

  if (recordReelBtn) {
    recordReelBtn.onclick = () => {
      if (!cameraStream) return;
      recordedChunks = [];
      let mimeType = 'video/webm';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/mp4';
      }

      try {
        mediaRecorder = new MediaRecorder(cameraStream, { mimeType });
      } catch (e) {
        mediaRecorder = new MediaRecorder(cameraStream);
      }

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordedChunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(recordedChunks, { type: mediaRecorder.mimeType || 'video/webm' });
        const localVidUrl = URL.createObjectURL(blob);
        selectedMediaType = 'video';
        selectedMediaUrl = localVidUrl;

        const radioInput = document.querySelector('input[name="post_type"][value="reel"]');
        if (radioInput) radioInput.checked = true;

        cameraPreviewBox.style.display = 'block';
        cameraPreviewBox.innerHTML = `<video src="${localVidUrl}" controls style="width:100%; max-height:300px; border-radius:8px; object-fit:cover;"></video>`;

        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Data = reader.result;
          try {
            const uploadRes = await fetch('/api/upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ file_data: base64Data, file_type: 'video' })
            });
            if (uploadRes.ok) {
              const uploadData = await uploadRes.json();
              selectedMediaUrl = uploadData.url;
            }
          } catch (e) {}
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorder.start();
      if (recordingBadge) recordingBadge.style.display = 'flex';
      recordReelBtn.style.display = 'none';
      snapPhotoBtn.style.display = 'none';
      if (stopRecBtn) stopRecBtn.style.display = 'inline-flex';
    };
  }

  if (stopRecBtn) {
    stopRecBtn.onclick = () => {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        recordingBadge.style.display = 'none';
        stopRecBtn.style.display = 'none';
        recordReelBtn.style.display = 'inline-flex';
        snapPhotoBtn.style.display = 'inline-flex';
      }
    };
  }
}

// SETUP EVENT LISTENERS
function setupEventListeners() {
  if (audioEnableBanner) audioEnableBanner.onclick = window.enableAudioGesture;

  // Auth Tabs
  if (tabLoginBtn) {
    tabLoginBtn.onclick = () => {
      tabLoginBtn.classList.add('active');
      tabSignupBtn.classList.remove('active');
      loginForm.classList.add('active');
      signupForm.classList.remove('active');
    };
  }

  if (tabSignupBtn) {
    tabSignupBtn.onclick = () => {
      tabSignupBtn.classList.add('active');
      tabLoginBtn.classList.remove('active');
      signupForm.classList.add('active');
      loginForm.classList.remove('active');
    };
  }

  // Login Form
  if (loginForm) {
    loginForm.onsubmit = async (e) => {
      e.preventDefault();
      loginError.style.display = 'none';
      const username = document.getElementById('login-username').value;
      const password = document.getElementById('login-password').value;

      try {
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (!res.ok) {
          loginError.textContent = data.error || 'Login failed';
          loginError.style.display = 'block';
          return;
        }

        currentUser = data.user;
        localStorage.setItem('newday_user_session', JSON.stringify(currentUser));
        if (authModal) authModal.classList.remove('active');
        initApp();
      } catch (err) {
        console.error(err);
      }
    };
  }

  // Signup Form
  if (signupForm) {
    signupForm.onsubmit = async (e) => {
      e.preventDefault();
      signupError.style.display = 'none';
      const username = document.getElementById('signup-username').value;
      const name = document.getElementById('signup-name').value;
      const password = document.getElementById('signup-password').value;
      const avatar = document.getElementById('signup-avatar').value;

      try {
        const res = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, name, password, avatar })
        });
        const data = await res.json();
        if (!res.ok) {
          signupError.textContent = data.error || 'Registration failed';
          signupError.style.display = 'block';
          return;
        }

        currentUser = data.user;
        localStorage.setItem('newday_user_session', JSON.stringify(currentUser));
        if (authModal) authModal.classList.remove('active');
        initApp();
      } catch (err) {
        console.error(err);
      }
    };
  }

  // Profile Tabs inside Profile Page
  const profTabPostsBtn = document.getElementById('prof-tab-posts-btn');
  const profTabReelsBtn = document.getElementById('prof-tab-reels-btn');
  if (profTabPostsBtn) {
    profTabPostsBtn.onclick = () => {
      profTabPostsBtn.classList.add('active');
      if (profTabReelsBtn) profTabReelsBtn.classList.remove('active');
    };
  }
  if (profTabReelsBtn) {
    profTabReelsBtn.onclick = () => {
      profTabReelsBtn.classList.add('active');
      if (profTabPostsBtn) profTabPostsBtn.classList.remove('active');
    };
  }

  // DM Text Input Enter Key
  const dmTextInput = document.getElementById('dm-text-input');
  if (dmTextInput) {
    dmTextInput.onkeypress = (e) => {
      if (e.key === 'Enter') window.sendDirectMessage();
    };
  }

  // Camera & File Upload Setup
  setupCameraAndUpload();

  // Create Modal Handlers
  const closeCreateBtn = document.getElementById('close-create-modal');
  const cancelCreateBtn = document.getElementById('cancel-create-btn');
  if (closeCreateBtn) closeCreateBtn.onclick = () => createModal.classList.remove('active');
  if (cancelCreateBtn) cancelCreateBtn.onclick = () => createModal.classList.remove('active');

  // Submit Create Post Form
  const createPostForm = document.getElementById('create-post-form');
  if (createPostForm) {
    createPostForm.onsubmit = async (e) => {
      e.preventDefault();
      const post_type = document.querySelector('input[name="post_type"]:checked').value;
      const media_url_input = document.getElementById('post-media-url').value;
      const finalMediaUrl = selectedMediaUrl || media_url_input;

      if (!finalMediaUrl) {
        alert('Please select a file from storage, record with camera, or enter a media URL.');
        return;
      }

      const caption = document.getElementById('post-caption').value;
      const location = document.getElementById('post-location').value;
      const audio_title = document.getElementById('post-audio').value;

      try {
        const res = await fetchWithAuth('/api/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: post_type,
            media_url: finalMediaUrl,
            caption,
            location,
            audio_title: audio_title || 'Original Sound'
          })
        });

        if (res.ok) {
          createModal.classList.remove('active');
          createPostForm.reset();
          selectedMediaUrl = null;
          await fetchPosts();
          window.switchTab(post_type === 'reel' ? 'reels' : 'feed');
        }
      } catch (err) {
        console.error('Create post error:', err);
      }
    };
  }

  // Edit Profile Modal Handlers
  const editProfileBtn = document.getElementById('edit-profile-btn');
  const closeEditModal = document.getElementById('close-edit-modal');
  const cancelEditBtn = document.getElementById('cancel-edit-btn');
  if (editProfileBtn) {
    editProfileBtn.onclick = () => {
      if (!currentUser) return;
      document.getElementById('edit-name').value = currentUser.name;
      document.getElementById('edit-avatar').value = currentUser.avatar;
      document.getElementById('edit-bio').value = currentUser.bio || '';
      if (editProfileModal) editProfileModal.classList.add('active');
    };
  }

  if (closeEditModal) closeEditModal.onclick = () => editProfileModal.classList.remove('active');
  if (cancelEditBtn) cancelEditBtn.onclick = () => editProfileModal.classList.remove('active');

  const editProfileForm = document.getElementById('edit-profile-form');
  if (editProfileForm) {
    editProfileForm.onsubmit = async (e) => {
      e.preventDefault();
      const name = document.getElementById('edit-name').value;
      const avatar = document.getElementById('edit-avatar').value;
      const bio = document.getElementById('edit-bio').value;

      try {
        const res = await fetchWithAuth(`/api/users/${currentUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, avatar, bio })
        });
        if (res.ok) {
          currentUser = await res.json();
          localStorage.setItem('newday_user_session', JSON.stringify(currentUser));
          updateCurrentUserUI();
          if (editProfileModal) editProfileModal.classList.remove('active');
          window.openUserProfile(currentUser.id);
        }
      } catch (err) {
        console.error('Edit profile error:', err);
      }
    };
  }

  // Comments modal handlers
  const closeCommentsModal = document.getElementById('close-comments-modal');
  const submitCommentBtn = document.getElementById('submit-comment-btn');
  const newCommentInput = document.getElementById('new-comment-input');
  if (closeCommentsModal) closeCommentsModal.onclick = () => commentsModal.classList.remove('active');
  if (submitCommentBtn) submitCommentBtn.onclick = window.submitComment;
  if (newCommentInput) {
    newCommentInput.onkeypress = (e) => {
      if (e.key === 'Enter') window.submitComment();
    };
  }

  // Share Modal Search Filter
  const shareSearchInput = document.getElementById('share-search-input');
  if (shareSearchInput) {
    shareSearchInput.oninput = (e) => {
      const query = e.target.value.toLowerCase();
      const rows = document.querySelectorAll('.share-user-row');
      rows.forEach(r => {
        const text = r.textContent.toLowerCase();
        r.style.display = text.includes(query) ? 'flex' : 'none';
      });
    };
  }

  // Explore search
  const exploreSearch = document.getElementById('explore-search');
  if (exploreSearch) {
    exploreSearch.oninput = (e) => {
      const query = e.target.value.toLowerCase();
      const filtered = allPosts.filter(p => p.caption.toLowerCase().includes(query) || p.user.username.toLowerCase().includes(query));
      renderExploreView(filtered);
    };
  }
}
