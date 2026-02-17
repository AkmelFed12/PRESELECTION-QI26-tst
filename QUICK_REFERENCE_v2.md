# 🚀 Quick Reference Guide - v2.0 Features

**Version:** 2.0  
**Date:** February 17, 2025  
**Purpose:** Quick lookup for new endpoints and features

---

## 📌 New Features Quick Links

| Feature | API Endpoint | Status | Doc Link |
|---------|-------------|--------|----------|
| Photo Upload | `POST /api/upload/photo` | ✅ Ready | [Docs](NEW_FEATURES_API_DOCUMENTATION.md#file-upload) |
| Like Posts | `POST /api/posts/:id/like` | ✅ Ready | [Docs](NEW_FEATURES_API_DOCUMENTATION.md#post-engagement) |
| Unlike Posts | `DELETE /api/posts/:id/like` | ✅ Ready | [Docs](NEW_FEATURES_API_DOCUMENTATION.md#post-engagement) |
| Share Posts | `POST /api/posts/:id/share` | ✅ Ready | [Docs](NEW_FEATURES_API_DOCUMENTATION.md#post-engagement) |
| Get Stats | `GET /api/posts/:id/stats` | ✅ Ready | [Docs](NEW_FEATURES_API_DOCUMENTATION.md#post-engagement) |
| Add Comment | `POST /api/posts/:id/comments` | ✅ Ready | [Docs](NEW_FEATURES_API_DOCUMENTATION.md#post-comments) |
| Get Comments | `GET /api/posts/:id/comments` | ✅ Ready | [Docs](NEW_FEATURES_API_DOCUMENTATION.md#post-comments) |
| Delete Comment | `DELETE /api/admin/comments/:id` | ✅ Ready | [Docs](NEW_FEATURES_API_DOCUMENTATION.md#post-comments) |
| Like Stories | `POST /api/stories/:id/like` | ✅ Ready | [Docs](NEW_FEATURES_API_DOCUMENTATION.md#story-engagement) |
| Story Likes | `GET /api/stories/:id/likes` | ✅ Ready | [Docs](NEW_FEATURES_API_DOCUMENTATION.md#story-engagement) |
| Generate QR | `GET /api/qr-code` | ✅ Ready | [Docs](NEW_FEATURES_API_DOCUMENTATION.md#qr-code-generation) |
| Post Analytics | `GET /api/analytics/posts` | ✅ Ready | [Docs](NEW_FEATURES_API_DOCUMENTATION.md#analytics--statistics) |
| Story Analytics | `GET /api/analytics/stories` | ✅ Ready | [Docs](NEW_FEATURES_API_DOCUMENTATION.md#analytics--statistics) |
| Donation Analytics | `GET /api/analytics/donations` | ✅ Admin | [Docs](NEW_FEATURES_API_DOCUMENTATION.md#analytics--statistics) |
| Overview Stats | `GET /api/analytics/overview` | ✅ Ready | [Docs](NEW_FEATURES_API_DOCUMENTATION.md#analytics--statistics) |

---

## 🧪 Quick Test Commands

### Photo Upload
```bash
curl -X POST http://localhost:3000/api/upload/photo \
  -F "file=@myimage.jpg"
```

### Like a Post
```bash
curl -X POST http://localhost:3000/api/posts/1/like \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}'
```

### Get Post Stats
```bash
curl http://localhost:3000/api/posts/1/stats
```

### Add Comment
```bash
curl -X POST http://localhost:3000/api/posts/1/comments \
  -H "Content-Type: application/json" \
  -d '{
    "authorName":"John",
    "authorEmail":"john@example.com",
    "content":"Great post!"
  }'
```

### Generate QR Code
```bash
curl "http://localhost:3000/api/qr-code?paymentMethod=MTN%20MONEY&amount=50000&donorName=John"
```

### Get Analytics
```bash
curl http://localhost:3000/api/analytics/overview
```

---

## 💾 Database Tables Reference

### post_likes
```
id | postId | likerEmail | createdAt
UNIQUE(postId, likerEmail) - Prevents duplicate likes
```

### post_comments
```
id | postId | authorName | authorEmail | content | status | createdAt
Index on postId for fast queries
```

### post_shares
```
id | postId | shareMethod | sharerId | createdAt
Index on postId for fast queries
```

### story_likes
```
id | storyId | likerEmail | createdAt
UNIQUE(storyId, likerEmail) - Prevents duplicate likes
```

### engagement_stats
```
id | contentType | contentId | likesCount | commentsCount | sharesCount | viewsCount | lastUpdated
UNIQUE(contentType, contentId) - One record per content
```

---

## 🔌 Frontend Integration Template

### Basic Like Button
```javascript
async function toggleLike(postId, email) {
  const response = await fetch(`/api/posts/${postId}/like`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  return await response.json();
}
```

### Get Engagement Stats
```javascript
async function getStats(postId) {
  const response = await fetch(`/api/posts/${postId}/stats`);
  return await response.json();
  // { likes: 5, comments: 2, shares: 1 }
}
```

### Upload Photo
```javascript
async function uploadPhoto(file) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch('/api/upload/photo', {
    method: 'POST',
    body: formData
  });
  return await response.json();
  // { success: true, url: '/uploads/filename.jpg' }
}
```

### Add Comment
```javascript
async function addComment(postId, name, email, content) {
  const response = await fetch(`/api/posts/${postId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ authorName: name, authorEmail: email, content })
  });
  return await response.json();
  // { message: 'Comment added', commentId: 42 }
}
```

---

## 📧 Email Configuration

### .env File Settings
```plaintext
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@quiz-islamique.org
```

### Sending Email (Backend)
```javascript
await sendEmail('recipient@example.com', 'Subject', '<p>HTML content</p>');
```

---

## 🔐 Admin Authentication

### Basic Auth Header
```bash
Authorization: Basic YWRtaW46YWRtaW5wYXNz
# (admin:adminpass in base64)
```

### Protected Endpoints
- `DELETE /api/admin/comments/:id` - Delete any comment
- `GET /api/analytics/donations` - View donation stats
- `PUT /api/admin/donations/:id` - Update donation status

---

## 📱 Payment Methods for QR Codes

| Method | Code | Number |
|--------|------|--------|
| MTN MONEY | `MTN MONEY` | 0574724233 |
| Orange Money | `OM` | 0705583082 |
| Moov Money | `MOOV MONEY` | 0150070083 |
| Wave | `Wave` | 0574724233 |

---

## 🎨 Share Methods for Tracking

Valid methods: `facebook`, `twitter`, `whatsapp`, `email`, `copy`

```javascript
// Record a share
await fetch(`/api/posts/1/share`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ method: 'facebook' })
});
```

---

## 📊 Response Examples

### Successful Like
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

### Successful Comment
```json
{
  "message": "Comment added",
  "commentId": 42
}
```

### QR Code Response
```json
{
  "success": true,
  "qrCode": "data:image/png;base64,iVBORw0KGgo...",
  "paymentMethod": "MTN MONEY",
  "number": "0574724233"
}
```

### Analytics Overview
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

## ⚠️ Error Responses

### 400 - Bad Request
```json
{ "error": "Valid email required" }
```

### 500 - Server Error
```json
{ "error": "Server error" }
```

### No File Uploaded
```json
{ "error": "No file uploaded" }
```

### Invalid File Type
```json
{ "error": "Only images (JPEG, PNG, WebP) and videos (MP4, WebM) allowed" }
```

---

## 📁 File Locations

| File | Location | Purpose |
|------|----------|---------|
| Server Code | `server.js` (lines 1-1611) | All API endpoints |
| Uploads | `/public/uploads/` | User-uploaded photos/videos |
| Multer Config | `server.js` (lines ~1060) | File upload configuration |
| Email Helper | `server.js` (lines ~1090) | sendEmail() function |
| QR Generator | `server.js` (lines ~1095) | generateQRCode() function |

---

## 🚀 Deployment Checklist

- [ ] `npm install` - Install new dependencies
- [ ] `node --check server.js` - Validate syntax
- [ ] Test all 27 endpoints locally
- [ ] Update `.env` with production SMTP settings
- [ ] Create `/public/uploads/` directory on server
- [ ] Deploy code to production
- [ ] Run smoke tests on production
- [ ] Update frontend to use new endpoints

---

## 💡 Pro Tips

1. **Duplicate Like Prevention**  
   The system automatically prevents the same person from liking twice using UNIQUE constraints.

2. **Real-Time Stats**  
   Stats update automatically after each like/comment/share action. No manual refresh needed.

3. **QR Codes**  
   Store generated QRs can be embedded directly in HTML using the base64 data URL.

4. **Email Sending**  
   Email sending is async and non-blocking, so users don't wait for email to send.

5. **File Upload**  
   All uploaded files get unique names using timestamp + random ID to prevent collisions.

6. **Comments Never Deleted**  
   Only admin can delete comments. This maintains conversation history.

7. **Analytics Performance**  
   Uses engagement_stats cache table for fast dashboard queries.

---

## 📚 Full Documentation Links

- [Complete API Documentation](NEW_FEATURES_API_DOCUMENTATION.md)
- [Frontend Integration Guide](FRONTEND_INTEGRATION_GUIDE.md)
- [Testing & Deployment Guide](DEPLOYMENT_&_TESTING_GUIDE.md)
- [Features Implementation Summary](FEATURES_IMPLEMENTATION_SUMMARY.md)

---

## 🔍 Debugging Tips

**Issue:** "Cannot find module" error
```bash
# Solution: Reinstall dependencies
npm install
```

**Issue:** File upload fails
```bash
# Check directory exists and is writable
ls -la public/uploads/
chmod 755 public/uploads/
```

**Issue:** Email not sending
```bash
# Verify SMTP credentials in .env
# Note: Gmail requires 16-char App Password, not account password
```

**Issue:** QR code returns 500 error
```bash
# Verify qrcode package installed
npm list qrcode
```

**Issue:** Comments not appearing
```bash
# Check browser cache (Ctrl+Shift+Delete or Cmd+Shift+Delete on Mac)
# Verify comment submitted (check network tab in browser DevTools)
```

---

## 📞 Quick Support

**Q: How do I test locally?**  
A: Run `npm start`, then use cURL commands in "Quick Test Commands" section above.

**Q: Where are uploaded files stored?**  
A: In `/public/uploads/` folder. URLs like `/uploads/filename.jpg`

**Q: How do I prevent the upload folder from getting too large?**  
A: Implement file cleanup script to delete old uploads. Suggested weekly cleanup.

**Q: Can I modify upload file size limit?**  
A: Yes, change `5 * 1024 * 1024` (5MB) in Multer config around line 1065.

**Q: How do I add new share methods?**  
A: Add to `validMethods` array around line 1207 in server.js.

---

## 🎯 Next Steps

1. **Start Frontend Integration** (see FRONTEND_INTEGRATION_GUIDE.md)
2. **Run Testing Suite** (see DEPLOYMENT_&_TESTING_GUIDE.md)
3. **Deploy to Production** (see deployment section in guide)
4. **Monitor Analytics** (use /api/analytics/overview endpoint)

---

**Status:** ✅ READY FOR PRODUCTION  
**Last Updated:** February 17, 2025  
**Backend Implementation:** 100% Complete
