# Frontend Integration Guide - New Engagement Features

**Version:** 2.0  
**Date:** February 2025  
**Status:** Ready for Implementation

---

## 📖 Overview

This guide explains how to update the frontend HTML/JavaScript files to integrate with the new backend API endpoints for photo uploads, engagement tracking, comments, and analytics.

---

## 🖼️ 1. Photo Upload Integration

### Update `public/dashboard.html`

Add to the post creation form:

```html
<!-- Photo Upload Section -->
<div class="form-group">
  <label for="postPhoto">Upload Photo/Video (Optional)</label>
  <input type="file" id="postPhoto" accept="image/*,video/*" />
  <small class="form-text text-muted">Max 5MB. Formats: JPEG, PNG, WebP, MP4, WebM</small>
  <div id="photoPreview"></div>
</div>
```

### Add CSS styling for preview:

```css
#photoPreview {
  margin-top: 10px;
  max-width: 300px;
}

#photoPreview img,
#photoPreview video {
  max-width: 100%;
  border-radius: 8px;
}
```

### Update `public/dashboard.js` - Add upload function:

```javascript
// Photo Upload Handler
async function uploadPhoto(file) {
  if (!file) return null;

  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch('/api/upload/photo', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Upload failed');
    }

    const data = await response.json();
    return data.url; // Returns '/uploads/filename.jpg'
  } catch (error) {
    console.error('Upload error:', error);
    alert('Photo upload failed: ' + error.message);
    return null;
  }
}

// File preview on selection
document.getElementById('postPhoto').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const preview = document.getElementById('photoPreview');
  preview.innerHTML = '';

  if (file.type.startsWith('image/')) {
    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    preview.appendChild(img);
  } else if (file.type.startsWith('video/')) {
    const video = document.createElement('video');
    video.src = URL.createObjectURL(file);
    video.controls = true;
    preview.appendChild(video);
  }
});

// Modify post creation to include photo
async function createPost() {
  const content = document.getElementById('postContent').value?.trim();
  const photoFile = document.getElementById('postPhoto')?.files[0];

  if (!content) {
    alert('Please write something!');
    return;
  }

  // Upload photo if provided
  let photoUrl = null;
  if (photoFile) {
    photoUrl = await uploadPhoto(photoFile);
    if (!photoUrl) return; // Upload failed
  }

  // Create post with photo URL
  const postData = {
    content,
    photo: photoUrl, // New field
    authorEmail: 'user@example.com' // From session
  };

  // ... existing post creation code ...
}
```

---

## ❤️ 2. Like & Share Integration

### Update post display HTML:

```html
<div class="post-card">
  <!-- Existing post content -->
  <div class="post-content">
    <p id="post-${post.id}-content">${post.content}</p>
    <!-- Show photo if exists -->
    ${post.photo ? `<img src="${post.photo}" alt="Post photo" class="post-photo">` : ''}
  </div>

  <!-- Engagement Stats Section -->
  <div class="post-stats">
    <span class="stat-item" id="likes-${post.id}">
      <i class="icon-heart"></i> <span id="likeCount-${post.id}">0</span> Likes
    </span>
    <span class="stat-item" id="comments-${post.id}">
      <i class="icon-comment"></i> <span id="commentCount-${post.id}">0</span> Comments
    </span>
    <span class="stat-item" id="shares-${post.id}">
      <i class="icon-share"></i> <span id="shareCount-${post.id}">0</span> Shares
    </span>
  </div>

  <!-- Engagement Actions -->
  <div class="post-actions">
    <button class="action-btn like-btn" onclick="toggleLike(${post.id})">
      <i class="icon-heart"></i> Like
    </button>
    <button class="action-btn comment-btn" onclick="showCommentForm(${post.id})">
      <i class="icon-comment"></i> Comment
    </button>
    <button class="action-btn share-btn" onclick="showShareMenu(${post.id})">
      <i class="icon-share"></i> Share
    </button>
  </div>

  <!-- Comments Section -->
  <div id="comments-section-${post.id}" class="comments-section" style="display:none;">
    <form onsubmit="submitComment(${post.id}); return false;">
      <input type="text" id="comment-name-${post.id}" placeholder="Your name" required>
      <input type="email" id="comment-email-${post.id}" placeholder="Your email" required>
      <textarea id="comment-text-${post.id}" placeholder="Your comment..." required></textarea>
      <button type="submit">Post Comment</button>
      <button type="button" onclick="showCommentForm(${post.id})">Cancel</button>
    </form>

    <!-- Comments List -->
    <div id="commentsList-${post.id}" class="comments-list"></div>
  </div>

  <!-- Share Menu -->
  <div id="shareMenu-${post.id}" class="share-menu" style="display:none;">
    <button onclick="sharePost(${post.id}, 'facebook')">📘 Facebook</button>
    <button onclick="sharePost(${post.id}, 'twitter')">𝕏 Twitter</button>
    <button onclick="sharePost(${post.id}, 'whatsapp')">💬 WhatsApp</button>
    <button onclick="sharePost(${post.id}, 'email')">📧 Email</button>
    <button onclick="copyShareLink(${post.id})">📋 Copy Link</button>
  </div>
</div>
```

### Add CSS styling:

```css
.post-stats {
  display: flex;
  gap: 20px;
  padding: 10px 0;
  border-top: 1px solid #eee;
  border-bottom: 1px solid #eee;
  font-size: 14px;
  color: #666;
}

.stat-item {
  cursor: pointer;
  transition: color 0.3s;
}

.stat-item:hover {
  color: #e74c3c;
}

.post-actions {
  display: flex;
  gap: 10px;
  padding: 10px 0;
}

.action-btn {
  flex: 1;
  padding: 8px;
  border: none;
  background: #f5f5f5;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}

.action-btn:hover {
  background: #e8e8e8;
}

.action-btn.liked {
  color: #e74c3c;
  background: #ffe8e8;
}

.comments-section {
  padding: 15px;
  background: #f9f9f9;
  border-radius: 4px;
  margin-top: 10px;
}

.comments-section form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 15px;
}

.comments-list {
  max-height: 300px;
  overflow-y: auto;
}

.comment-item {
  padding: 10px;
  background: white;
  border-radius: 4px;
  margin-bottom: 8px;
}

.comment-header {
  font-weight: bold;
  font-size: 12px;
  color: #666;
}

.comment-text {
  margin: 5px 0 0 0;
  font-size: 14px;
}

.share-menu {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  background: white;
  border-radius: 4px;
  border: 1px solid #ddd;
  margin-top: 10px;
}

.share-menu button {
  padding: 10px;
  border: none;
  background: #f5f5f5;
  border-radius: 4px;
  cursor: pointer;
  text-align: left;
}

.share-menu button:hover {
  background: #e8e8e8;
}

.post-photo {
  max-width: 300px;
  border-radius: 8px;
  margin: 10px 0;
}
```

### Update `public/dashboard.js` - Engagement functions:

```javascript
// Get engagement stats
async function getPostStats(postId) {
  try {
    const response = await fetch(`/api/posts/${postId}/stats`);
    const stats = await response.json();
    
    document.getElementById(`likeCount-${postId}`).textContent = stats.likes || 0;
    document.getElementById(`commentCount-${postId}`).textContent = stats.comments || 0;
    document.getElementById(`shareCount-${postId}`).textContent = stats.shares || 0;
  } catch (error) {
    console.error('Error fetching stats:', error);
  }
}

// Toggle like on post
async function toggleLike(postId) {
  const userEmail = 'user@example.com'; // Get from session
  const btn = document.querySelector(`#likes-${postId} .icon-heart`).parentElement;

  try {
    if (btn.classList.contains('liked')) {
      // Unlike
      await fetch(`/api/posts/${postId}/like`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail })
      });
      btn.classList.remove('liked');
    } else {
      // Like
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail })
      });
      const data = await response.json();
      btn.classList.add('liked');
    }

    // Update counts
    await getPostStats(postId);
  } catch (error) {
    console.error('Error toggling like:', error);
  }
}

// Show/hide comment form
function showCommentForm(postId) {
  const section = document.getElementById(`comments-section-${postId}`);
  section.style.display = section.style.display === 'none' ? 'block' : 'none';
  
  if (section.style.display === 'block') {
    loadComments(postId);
  }
}

// Submit comment
async function submitComment(postId) {
  const name = document.getElementById(`comment-name-${postId}`).value;
  const email = document.getElementById(`comment-email-${postId}`).value;
  const content = document.getElementById(`comment-text-${postId}`).value;

  try {
    const response = await fetch(`/api/posts/${postId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authorName: name, authorEmail: email, content })
    });

    if (response.ok) {
      // Clear form
      document.getElementById(`comment-name-${postId}`).value = '';
      document.getElementById(`comment-email-${postId}`).value = '';
      document.getElementById(`comment-text-${postId}`).value = '';
      
      // Reload comments
      await loadComments(postId);
      await getPostStats(postId);
    }
  } catch (error) {
    console.error('Error submitting comment:', error);
  }
}

// Load comments for post
async function loadComments(postId) {
  try {
    const response = await fetch(`/api/posts/${postId}/comments`);
    const comments = await response.json();
    
    const commentsList = document.getElementById(`commentsList-${postId}`);
    commentsList.innerHTML = '';

    for (const comment of comments) {
      const commentDiv = document.createElement('div');
      commentDiv.className = 'comment-item';
      commentDiv.innerHTML = `
        <div class="comment-header">${comment.authorName} • ${new Date(comment.createdAt).toLocaleDateString()}</div>
        <div class="comment-text">${comment.content}</div>
      `;
      commentsList.appendChild(commentDiv);
    }
  } catch (error) {
    console.error('Error loading comments:', error);
  }
}

// Show/hide share menu
function showShareMenu(postId) {
  const menu = document.getElementById(`shareMenu-${postId}`);
  menu.style.display = menu.style.display === 'none' ? 'flex' : 'none';
}

// Record post share
async function sharePost(postId, method) {
  try {
    await fetch(`/api/posts/${postId}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method })
    });

    // Perform actual share
    const postUrl = `${window.location.origin}/post/${postId}`;
    const postTitle = 'Check out this amazing post!';

    switch (method) {
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`);
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(postTitle)}&url=${encodeURIComponent(postUrl)}`);
        break;
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(postTitle)} ${postUrl)}`);
        break;
      case 'email':
        window.open(`mailto:?subject=${encodeURIComponent(postTitle)}&body=${encodeURIComponent(postUrl)}`);
        break;
    }

    // Update stats
    await getPostStats(postId);
    document.getElementById(`shareMenu-${postId}`).style.display = 'none';
  } catch (error) {
    console.error('Error sharing post:', error);
  }
}

// Copy simple share link
function copyShareLink(postId) {
  const url = `${window.location.origin}/post/${postId}`;
  navigator.clipboard.writeText(url).then(() => {
    alert('Link copied to clipboard!');
    document.getElementById(`shareMenu-${postId}`).style.display = 'none';
  });

  // Record the 'copy' share
  fetch(`/api/posts/${postId}/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method: 'copy' })
  });
}
```

---

## 💬 3. Comments System

Comments are already integrated in the share code above. The system includes:

- **Auto-approval:** Comments are immediately visible
- **Easy submission:** Simple form with name, email, and comment
- **List display:** Shows all approved comments
- **Email notifications:** Author gets notified of new comments
- **Admin moderation:** Admins can delete inappropriate comments

---

## 📊 4. Analytics Dashboard (Admin)

### Create `public/analytics.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Analytics Dashboard</title>
  <link rel="stylesheet" href="style.css">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
  <div class="admin-container">
    <h1>📊 Analytics Dashboard</h1>

    <!-- Overview Cards -->
    <div class="stats-grid">
      <div class="stat-card">
        <h3>Posts</h3>
        <p class="stat-value" id="totalPosts">0</p>
        <p class="stat-label">Published posts</p>
      </div>
      <div class="stat-card">
        <h3>Engagement</h3>
        <p class="stat-value" id="totalLikes">0</p>
        <p class="stat-label">Total likes</p>
      </div>
      <div class="stat-card">
        <h3>Comments</h3>
        <p class="stat-value" id="totalComments">0</p>
        <p class="stat-label">Total comments</p>
      </div>
      <div class="stat-card">
        <h3>Shares</h3>
        <p class="stat-value" id="totalShares">0</p>
        <p class="stat-label">Total shares</p>
      </div>
    </div>

    <!-- Charts -->
    <div class="charts-grid">
      <div class="chart-container">
        <h3>Engagement Overview</h3>
        <canvas id="engagementChart"></canvas>
      </div>
      <div class="chart-container">
        <h3>Donation Stats</h3>
        <canvas id="donationChart"></canvas>
      </div>
    </div>

    <!-- Detailed Tables -->
    <div class="table-section">
      <h3>Recent Donations</h3>
      <table id="donationsTable">
        <thead>
          <tr>
            <th>Donor</th>
            <th>Amount</th>
            <th>Method</th>
            <th>Status</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </div>
  </div>

  <script src="analytics.js"></script>
</body>
</html>
```

### Create `public/analytics.js`:

```javascript
// Load platform overview
async function loadAnalytics() {
  try {
    const overview = await fetch('/api/analytics/overview').then(r => r.json());
    const posts = await fetch('/api/analytics/posts').then(r => r.json());
    const stories = await fetch('/api/analytics/stories').then(r => r.json());
    const donations = await fetch('/api/analytics/donations').then(r => r.json());

    // Update cards
    document.getElementById('totalPosts').textContent = overview.posts;
    document.getElementById('totalLikes').textContent = posts.totalLikes;
    document.getElementById('totalComments').textContent = posts.totalComments;
    document.getElementById('totalShares').textContent = posts.totalShares;

    // Create charts
    createEngagementChart(posts, stories);
    createDonationChart(donations);

  } catch (error) {
    console.error('Analytics error:', error);
  }
}

function createEngagementChart(posts, stories) {
  const ctx = document.getElementById('engagementChart').getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Posts', 'Stories'],
      datasets: [
        {
          label: 'Likes',
          data: [posts.totalLikes, stories.totalLikes],
          backgroundColor: '#e74c3c'
        },
        {
          label: 'Comments',
          data: [posts.totalComments, 0],
          backgroundColor: '#3498db'
        },
        {
          label: 'Shares',
          data: [posts.totalShares, 0],
          backgroundColor: '#2ecc71'
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

function createDonationChart(donations) {
  const ctx = document.getElementById('donationChart').getContext('2d');
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Confirmed', 'Pending'],
      datasets: [{
        data: [donations.confirmedTotal, donations.pendingTotal],
        backgroundColor: ['#2ecc71', '#f39c12']
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
}

// Load when page opens
document.addEventListener('DOMContentLoaded', loadAnalytics);
```

---

## 💳 5. Donation QR Code Integration

### Update `public/contact.html`:

```html
<!-- Donation section -->
<div class="donation-methods">
  <h3>Choose Payment Method</h3>
  
  <div class="method-cards">
    <div class="method-card" onclick="generateQR('MTN MONEY')">
      <h4>📱 MTN MONEY</h4>
      <p>0574724233</p>
      <div id="qr-MTN" class="qr-display"></div>
    </div>
    
    <div class="method-card" onclick="generateQR('OM')">
      <h4>💰 Orange Money (OM)</h4>
      <p>0705583082</p>
      <div id="qr-OM" class="qr-display"></div>
    </div>

    <!-- Add for Wave, Moov... -->
  </div>
</div>
```

### Update `public/contact.js`:

```javascript
async function generateQR(method) {
  const amount = document.getElementById('donationAmount')?.value || '10000';
  const donorName = document.getElementById('donorName')?.value || 'Supporter';

  try {
    const response = await fetch(
      `/api/qr-code?paymentMethod=${encodeURIComponent(method)}&amount=${amount}&donorName=${encodeURIComponent(donorName)}`
    );
    const data = await response.json();

    // Display QR code
    const qrDiv = document.getElementById(`qr-${method.split(' ')[0]}`);
    qrDiv.innerHTML = `<img src="${data.qrCode}" alt="QR Code" style="max-width: 200px;">`;

  } catch (error) {
    console.error('QR generation error:', error);
  }
}
```

---

## 📝 CSS Additions

Add to `public/style.css`:

```css
/* Stats and Cards */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin: 20px 0;
}

.stat-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
  margin: 10px 0;
}

.stat-label {
  font-size: 12px;
  opacity: 0.8;
}

/* Charts */
.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin: 20px 0;
}

.chart-container {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* Tables */
.table-section {
  margin-top: 30px;
}

table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

thead {
  background: #f8f9fa;
}

th, td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

tbody tr:hover {
  background: #f5f5f5;
}
```

---

## 🚀 Implementation Checklist

- [ ] Update dashboard.html with photo upload form
- [ ] Add photo upload styling and preview
- [ ] Implement engagement buttons (like, comment, share)
- [ ] Add comments system HTML and styling
- [ ] Create analytics dashboard page
- [ ] Add QR code display to donation form
- [ ] Test all file uploads
- [ ] Test like/unlike toggle
- [ ] Test comment submission
- [ ] Test share functionality
- [ ] Test analytics loading
- [ ] Test QR code generation

---

## 🔗 Quick API Reference

```javascript
// Upload photo
POST /api/upload/photo (multipart/form-data)

// Engagement
POST /api/posts/:id/like { email }
DELETE /api/posts/:id/like { email }
POST /api/posts/:id/share { method }
GET /api/posts/:id/stats

// Comments
POST /api/posts/:id/comments { authorName, authorEmail, content }
GET /api/posts/:id/comments
DELETE /api/admin/comments/:id (requires admin auth)

// QR Codes
GET /api/qr-code?paymentMethod=X&amount=Y&donorName=Z

// Analytics
GET /api/analytics/overview
GET /api/analytics/posts
GET /api/analytics/stories
GET /api/analytics/donations (admin only)
```

---

**Ready to implement!** Start with photo upload, then engagement features, then analytics.
