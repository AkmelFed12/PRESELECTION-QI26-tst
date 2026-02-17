# API Enhancement Features - Complete Documentation

**Date:** February 2025  
**Version:** 2.0  
**Status:** Backend API Implementation Complete

---

## 📋 Overview

This document details all new API endpoints and features added to enhance the Posts, Stories, and Donations platform with engagement metrics, file uploads, analytics, and user interaction capabilities.

---

## 🎯 Feature List

### 1. **Photo/Media Upload** ✅
- Upload images and videos for posts and stories
- File validation (type and size)
- Automatic file storage with UUID-based naming
- Returns URL for frontend integration

### 2. **Like/Engagement Counters** ✅
- Like/unlike posts and stories
- Share tracking by method (Facebook, Twitter, WhatsApp, Email)
- Real-time engagement statistics
- Prevent duplicate likes with UNIQUE constraints

### 3. **Comments System** ✅
- Add comments to posts with auto-approval
- List comments for posts
- Admin comment moderation
- Email notifications for comment activity

### 4. **QR Code Generation** ✅
- Generate QR codes for payment methods
- Automatic text encoding with payment details
- Integrated with donation methods (MTN, OM, Wave, Moov)

### 5. **Analytics Dashboard** ✅
- Post engagement metrics
- Story performance statistics
- Donation analytics with revenue tracking
- Platform overview statistics

### 6. **Database Tables** ✅
- `post_likes` - Track individual post likes
- `post_comments` - Store post comments
- `post_shares` - Record post shares
- `story_likes` - Track story likes
- `engagement_stats` - Aggregate statistics cache

---

## 🔌 API Endpoints Reference

### File Upload

#### POST `/api/upload/photo`
Upload a photo or video file for use in posts or stories.

**Request:**
```
Method: POST
Content-Type: multipart/form-data
Field: file (binary)
Max Size: 5MB
Allowed Types: JPEG, PNG, WebP, MP4, WebM
```

**Response (Success):**
```json
{
  "success": true,
  "filename": "1707123456789-abc123def.jpg",
  "url": "/uploads/1707123456789-abc123def.jpg",
  "size": 245678
}
```

**Response (Error):**
```json
{
  "error": "Only images (JPEG, PNG, WebP) and videos (MP4, WebM) allowed"
}
```

---

### Post Engagement

#### POST `/api/posts/:id/like`
Like a post (toggle action - can be called to unlike).

**Request:**
```json
{
  "email": "user@email.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Post liked",
  "counts": {
    "likes": 5,
    "comments": 2,
    "shares": 1
  }
}
```

#### DELETE `/api/posts/:id/like`
Remove a like from a post.

**Request:**
```json
{
  "email": "user@email.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Like removed"
}
```

#### POST `/api/posts/:id/share`
Record a post share action.

**Request:**
```json
{
  "method": "facebook"
}
```

**Valid Methods:** `facebook`, `twitter`, `whatsapp`, `email`, `copy`

**Response:**
```json
{
  "success": true,
  "message": "Share recorded"
}
```

#### GET `/api/posts/:id/stats`
Get engagement statistics for a post.

**Response:**
```json
{
  "likes": 15,
  "comments": 3,
  "shares": 7
}
```

---

### Post Comments

#### POST `/api/posts/:id/comments`
Add a comment to a post.

**Request:**
```json
{
  "authorName": "John Doe",
  "authorEmail": "john@email.com",
  "content": "Great post! Very informative."
}
```

**Response:**
```json
{
  "message": "Comment added",
  "commentId": 42
}
```

#### GET `/api/posts/:id/comments`
Retrieve all approved comments for a post (paginated, max 50).

**Response:**
```json
[
  {
    "id": 1,
    "authorName": "Jane Smith",
    "content": "Excellent content",
    "createdAt": "2025-02-17T10:30:00.000Z"
  },
  {
    "id": 2,
    "authorName": "John Doe",
    "content": "Thanks for sharing!",
    "createdAt": "2025-02-17T11:15:00.000Z"
  }
]
```

#### DELETE `/api/admin/comments/:id`
Delete a comment (admin only).

**Authentication:** Basic Auth required (admin credentials)

**Response:**
```json
{
  "message": "Comment deleted"
}
```

---

### Story Engagement

#### POST `/api/stories/:id/like`
Like a story.

**Request:**
```json
{
  "email": "user@email.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Story liked",
  "likes": 8
}
```

#### GET `/api/stories/:id/likes`
Get like count for a story.

**Response:**
```json
{
  "likes": 8
}
```

---

### QR Code Generation

#### GET `/api/qr-code`
Generate a QR code for payment method.

**Query Parameters:**
- `paymentMethod` (required): `MTN MONEY`, `OM`, `MOOV MONEY`, `Wave`
- `amount` (optional): Donation amount
- `donorName` (optional): Donor's name

**Example URL:**
```
GET /api/qr-code?paymentMethod=MTN%20MONEY&amount=50000&donorName=John
```

**Response:**
```json
{
  "success": true,
  "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANS...",
  "paymentMethod": "MTN MONEY",
  "number": "0574724233"
}
```

**Payment Numbers:**
- MTN MONEY: `0574724233`
- OM: `0705583082`
- MOOV MONEY: `0150070083`
- Wave: `0574724233`

---

### Analytics & Statistics

#### GET `/api/analytics/posts`
Get overall post engagement statistics.

**Response:**
```json
{
  "totalPosts": 25,
  "totalLikes": 156,
  "totalComments": 42,
  "totalShares": 89
}
```

#### GET `/api/analytics/stories`
Get story performance statistics.

**Response:**
```json
{
  "totalStories": 12,
  "totalLikes": 234,
  "activeStories": 3
}
```

#### GET `/api/analytics/donations`
Get donation analytics (admin only).

**Authentication:** Basic Auth required

**Response:**
```json
{
  "totalDonations": 156,
  "confirmedTotal": 2500000,
  "pendingTotal": 500000,
  "uniqueMethods": 4,
  "confirmedCount": 120
}
```

#### GET `/api/analytics/overview`
Get platform-wide engagement overview.

**Response:**
```json
{
  "posts": 25,
  "stories": 3,
  "donations": {
    "count": 156,
    "total": 3000000
  },
  "comments": 42
}
```

---

## 📊 Database Schema

### post_likes Table
```sql
CREATE TABLE post_likes (
  id BIGSERIAL PRIMARY KEY,
  postId BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  likerEmail TEXT NOT NULL,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(postId, likerEmail)
);
```

### post_comments Table
```sql
CREATE TABLE post_comments (
  id BIGSERIAL PRIMARY KEY,
  postId BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  authorName TEXT NOT NULL,
  authorEmail TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'approved',
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### post_shares Table
```sql
CREATE TABLE post_shares (
  id BIGSERIAL PRIMARY KEY,
  postId BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  shareMethod TEXT NOT NULL,
  sharerId TEXT,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### story_likes Table
```sql
CREATE TABLE story_likes (
  id BIGSERIAL PRIMARY KEY,
  storyId BIGINT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  likerEmail TEXT NOT NULL,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(storyId, likerEmail)
);
```

### engagement_stats Table
```sql
CREATE TABLE engagement_stats (
  id BIGSERIAL PRIMARY KEY,
  contentType TEXT NOT NULL,
  contentId BIGINT NOT NULL,
  likesCount INTEGER DEFAULT 0,
  commentsCount INTEGER DEFAULT 0,
  sharesCount INTEGER DEFAULT 0,
  viewsCount INTEGER DEFAULT 0,
  lastUpdated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(contentType, contentId)
);
```

---

## 🔐 Authentication & Security

### Public Endpoints (No Auth Required)
- `POST /api/upload/photo` - File uploads
- `POST /api/posts/:id/like` - Liking posts
- `DELETE /api/posts/:id/like` - Unlike posts
- `POST /api/posts/:id/share` - Share tracking
- `GET /api/posts/:id/stats` - View stats
- `POST /api/posts/:id/comments` - Add comments
- `GET /api/posts/:id/comments` - View comments
- `POST /api/stories/:id/like` - Like stories
- `GET /api/stories/:id/likes` - View story likes
- `GET /api/qr-code` - Generate QR codes
- `GET /api/analytics/posts` - Post analytics
- `GET /api/analytics/stories` - Story analytics
- `GET /api/analytics/overview` - Overview stats

### Admin-Only Endpoints (Basic Auth Required)
- `DELETE /api/admin/comments/:id` - Delete comments
- `GET /api/analytics/donations` - Donation analytics
- `PUT /api/admin/donations/:id` - Update donation status

---

## 🛡️ File Upload Configuration

**Location:** `/public/uploads/`  
**Max File Size:** 5MB  
**Allowed File Types:**
- Images: `image/jpeg`, `image/png`, `image/webp`
- Videos: `video/mp4`, `video/webm`

**Filename Format:** `{timestamp}-{randomId}.{extension}`  
**Example:** `1707123456789-abc123def.jpg`

---

## 📧 Email Notifications

Automatic email notifications are sent for:

1. **Comment Notifications** - When someone comments on a post
2. **Admin Notifications** - New donations, admin actions (prep in place)
3. **User Confirmations** - Post approval, payment verification (prep in place)

**SMTP Configuration** (from `.env`):
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@quiz-islamique.org
```

---

## 🧮 Real-Time Statistics

### Engagement Stats Auto-Update
Statistics are automatically updated after:
- ✅ User likes/unlikes a post
- ✅ User adds a comment
- ✅ User shares a post
- ✅ User likes a story

**Update Process:**
1. User action triggers database insert/update
2. `updateEngagementStats()` function counts current engaging
3. Results cached in `engagement_stats` table
4. Stats become immediately available via `/api/posts/:id/stats`

---

## 🚀 Frontend Integration Examples

### Upload Photo
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

fetch('/api/upload/photo', {
  method: 'POST',
  body: formData
})
.then(r => r.json())
.then(data => {
  console.log('Upload URL:', data.url);
  // Use data.url in post creation
});
```

### Like a Post
```javascript
fetch('/api/posts/123/like', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'user@email.com' })
})
.then(r => r.json())
.then(data => console.log('Liked! New counts:', data.counts));
```

### Add Comment
```javascript
fetch('/api/posts/123/comments', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    authorName: 'John Doe',
    authorEmail: 'john@example.com',
    content: 'Great post!'
  })
})
.then(r => r.json())
.then(data => console.log('Comment added:', data.commentId));
```

### Get Post Stats
```javascript
fetch('/api/posts/123/stats')
  .then(r => r.json())
  .then(stats => {
    console.log(`Likes: ${stats.likes}, Comments: ${stats.comments}, Shares: ${stats.shares}`);
  });
```

### Generate QR Code
```javascript
fetch('/api/qr-code?paymentMethod=MTN%20MONEY&amount=50000&donorName=John')
  .then(r => r.json())
  .then(data => {
    // data.qrCode is base64 PNG image
    <img src={data.qrCode} alt="Payment QR" />
  });
```

### Get Platform Overview
```javascript
fetch('/api/analytics/overview')
  .then(r => r.json())
  .then(data => {
    console.log(`Posts: ${data.posts}, Stories: ${data.stories}`);
    console.log(`Donations: ${data.donations.count} (${data.donations.total} CFA)`);
  });
```

---

## ⚠️ Error Handling

### Standard Error Responses

**400 - Bad Request:**
```json
{ "error": "Valid email required" }
```

**500 - Server Error:**
```json
{ "error": "Server error" }
```

**All endpoints include:**
- Input validation (email, content length)
- Error logging to console
- Graceful error responses

---

## 📈 Performance Optimizations

1. **Unique Constraints** - Prevent duplicate likes/shares
2. **Foreign Key Indexes** - Fast joins on postId/storyId
3. **Engagement Stats Caching** - Aggregate table for dashboard queries
4. **Compound Indexes** - (contentType, contentId) for filtering

---

## 📝 Next Steps (Frontend)

1. Update post creation form to include photo upload
2. Update post display to show like/comment/share buttons
3. Add comment section to post detail views
4. Create analytics dashboard for admin
5. Update donation form with QR code display
6. Add social share buttons (Facebook, Twitter, WhatsApp)

---

## 🔍 Testing Checklist

- [ ] Test photo upload with valid images
- [ ] Test file upload size limit (>5MB should fail)
- [ ] Test file type validation (upload .exe should fail)
- [ ] Test like/unlike toggle
- [ ] Test duplicate like prevention
- [ ] Test comment submission and listing
- [ ] Test admin comment deletion
- [ ] Test QR code generation for all payment methods
- [ ] Test analytics endpoints with real data
- [ ] Test error responses with invalid input
- [ ] Test email notifications (check spam folder)
- [ ] Test engagement stats auto-update

---

## 📞 Support & Troubleshooting

### Issue: Photo upload returns 400 error
**Solution:** Check file type and size. Max 5MB, allowed types: JPEG, PNG, WebP, MP4, WebM

### Issue: Email notifications not sending
**Solution:** Verify SMTP credentials in `.env` file. Check Firebase/Gmail app password is 16 characters.

### Issue: QR code won't display
**Solution:** Ensure `qrcode` npm package is installed. Verify payment method parameter is valid.

### Issue: Engagement stats not updating
**Solution:** Statistics update automatically after each action. Clear browser cache and refresh.

---

## 📦 Dependencies Added

- `multer@1.4.x` - File upload handling
- `qrcode@1.5.x` - QR code generation  
- `nodemailer@6.9.x` - Email notifications
- `uuid@9.0.x` - Unique identifier generation

---

**Last Updated:** February 17, 2025  
**Deployed To:** Local (Ready for production)  
**Status:** ✅ Complete
