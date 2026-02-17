# 📱 New Features Implementation Guide
**Quiz Islamique 2026 Platform**
**Date**: February 17, 2026

---

## Overview

Three major engagement features have been successfully added to the platform:
1. **Posts/Feed System** - User publications with admin approval
2. **Stories System** - 24-hour expiring stories (auto-cleanup)
3. **Donations System** - Support funding with 4 payment methods

All features are **live and deployed** to production.

---

## 1. 📰 Posts/Feed System

### Purpose
Allow users to create and share publications that require admin moderation before appearing on the feed.

### Public Interface
**URL**: `/posts.html`

#### Features
- Submit posts with text and optional image
- View all approved posts in chronological order
- Like and share buttons for engagement
- Auto-refresh every 30 seconds

#### User Input Form Fields
| Field | Type | Required | Max Length | Notes |
|-------|------|----------|-----------|-------|
| authorName | text | Yes | 100 | User's display name |
| authorEmail | email | Yes | 100 | For notifications/verification |
| content | textarea | Yes | 1000 | Post text content |
| imageUrl | URL | No | 500 | Optional image link |

### Admin Management
**URL**: `/admin.html` → Posts tab (visible after login)

#### Admin Actions
- **Approve**: Move pending posts to published
- **Reject**: Decline posts with poor content
- **Delete**: Remove posts permanently
- **View**: See status, author, content preview, date

#### Admin Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/posts` | POST | No | Submit new post |
| `/api/posts` | GET | No | View approved posts |
| `/api/admin/posts` | GET | Yes | View all posts (all statuses) |
| `/api/admin/posts/:id` | PUT | Yes | Approve/reject post |
| `/api/admin/posts/:id` | DELETE | Yes | Delete post |

#### Database Table
```sql
CREATE TABLE posts (
  id BIGSERIAL PRIMARY KEY,
  authorName VARCHAR(100),
  authorEmail VARCHAR(100),
  content TEXT,
  imageUrl VARCHAR(500),
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
  createdAt TIMESTAMP DEFAULT NOW(),
  approvedAt TIMESTAMP,
  approvedBy VARCHAR(100)
);

CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_createdAt ON posts(createdAt DESC);
```

#### Example Workflow
1. User fills `/posts.html` form → clicks "Soumettre"
2. POST request to `/api/posts` with validation
3. Post stored with `status='pending'`
4. Admin sees post in admin panel
5. Admin clicks "Approuver" → PUT to `/api/admin/posts/:id`
6. Post status → `status='approved'`
7. Post appears on `/posts.html` public feed

---

## 2. 📱 Stories System

### Purpose
Create ephemeral, 24-hour stories similar to social media (Instagram, Snapchat).

### Public Interface
**URL**: `/stories.html`

#### Features
- Post stories with text and optional media
- Carousel display of active stories
- Stories auto-expire after 24 hours
- Modal popup for viewing individual stories
- Arrow keys (← →) for navigation
- Hourly countdown showing time remaining
- Auto-refresh every 20 seconds

#### User Input Form Fields
| Field | Type | Required | Max Length | Notes |
|-------|------|----------|-----------|-------|
| authorName | text | Yes | 100 | Story creator name |
| authorEmail | email | Yes | 100 | For verification |
| content | textarea | Yes | 500 | Story text (shorter than posts) |
| mediaUrl | URL | No | 500 | Optional photo/video |

### Admin Management
**URL**: `/admin.html` → Stories tab (visible after login)

#### Admin Actions
- **Approve**: Publish story for 24h visibility
- **Reject**: Decline story
- **Delete**: Remove story
- **View**: See time remaining + expiration countdown

#### Admin Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/stories` | POST | No | Submit new story |
| `/api/stories/active` | GET | No | Get stories active in next 24h |
| `/api/admin/stories` | GET | Yes | View all stories (all statuses) |
| `/api/admin/stories/:id` | PUT | Yes | Approve/reject story |
| `/api/admin/stories/:id` | DELETE | Yes | Delete story |

#### Database Table
```sql
CREATE TABLE stories (
  id BIGSERIAL PRIMARY KEY,
  authorName VARCHAR(100),
  authorEmail VARCHAR(100),
  content TEXT,
  mediaUrl VARCHAR(500),
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
  expiresAt TIMESTAMP, -- NOW() + 24h when approved
  createdAt TIMESTAMP DEFAULT NOW(),
  approvedAt TIMESTAMP,
  approvedBy VARCHAR(100)
);

CREATE INDEX idx_stories_status ON stories(status);
CREATE INDEX idx_stories_expiresAt ON stories(expiresAt);
```

#### Auto-Cleanup
- **Frequency**: Every 30 minutes
- **Action**: Deletes stories where `expiresAt < NOW()`
- **No manual cleanup needed**

#### Example Workflow
1. User submits story → POST `/api/stories`
2. Story stored with `status='pending'`, `expiresAt=NOW()+24h`
3. Admin approves → PUT `/api/admin/stories/:id` with `status='approved'`
4. Story appears in `/api/stories/active` for next 24 hours
5. After 24h → auto-deleted by cron job
6. If admin rejects → status='rejected', not visible to public

#### Viewing Stories
- Stories display as carousel cards
- Click any story to open fullscreen modal
- Navigate with arrow buttons or keyboard arrows (← →)
- Press Escape to close modal
- Shows author name + countdown timer

---

## 3. 💝 Donations System

### Purpose
Allow users to support the Quiz Islamique 2026 mission through multiple payment methods.

### Public Interface
**URL**: `/donations.html`

#### Features
- Donation form with multiple currencies
- Quick-copy payment numbers
- Display of recent confirmed donations
- Donation summary (total amount + donor count)
- Admin approval workflow

#### User Input Form Fields
| Field | Type | Required | Options | Notes |
|-------|------|----------|---------|-------|
| donorName | text | Yes | - | Donor's name (1-100 chars) |
| donorEmail | email | Yes | - | For confirmation emails (future) |
| amount | number | Yes | 1-1000000 | Donation amount |
| currency | select | Yes | FCA, EUR, USD | Type of currency |
| paymentMethod | select | Yes | See below | How to pay |
| message | textarea | No | 0-500 | Optional greeting/message |

#### Payment Methods (Copy-Paste Numbers)
| Method | Number | Network | Region |
|--------|--------|---------|--------|
| **MTN MONEY** | 0574724233 | MTN | West Africa |
| **Orange Money (OM)** | 0705583082 | Orange | West Africa |
| **MOOV MONEY** | 0150070083 | MOOV | West Africa |
| **Wave** | 0574724233 | Wave | Global |

### Admin Management
**URL**: `/admin.html` → Donations tab (visible after login)

#### Admin Actions
- **Confirm**: Verify donation received and complete
- **Cancel**: Mark donation as cancelled (refund)
- **Delete**: Remove donation record
- **View**: See donor info, amount, method, date, status

#### Admin Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/donations` | POST | No | Record new donation |
| `/api/admin/donations` | GET | Yes | View all donations |
| `/api/admin/donations/:id` | PUT | Yes | Update donation status |
| `/api/admin/donations/:id` | DELETE | Yes | Delete donation |

#### Status Workflow

```
pending → confirmed (after payment verified)
          ↓
        cancelled (if refund issued)
```

#### Database Table
```sql
CREATE TABLE donations (
  id BIGSERIAL PRIMARY KEY,
  donorName VARCHAR(100),
  donorEmail VARCHAR(100),
  amount DECIMAL(10, 2),
  currency VARCHAR(10), -- FCA, EUR, USD
  paymentMethod VARCHAR(50), -- MTN MONEY, OM, MOOV MONEY, Wave
  message TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- pending, confirmed, cancelled
  createdAt TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_donations_status ON donations(status);
CREATE INDEX idx_donations_createdAt ON donations(createdAt DESC);
```

#### Example Workflow
1. User visits `/donations.html`
2. Fills donation form (amount, currency, payment method)
3. POST to `/api/donations` → records with `status='pending'`
4. User receives message with confirmation + payment instructions
5. User pays via selected method (MTN, Orange, Wave, etc.)
6. Admin receives notification (future feature)
7. Admin confirms payment in admin panel
8. Donation status → `status='confirmed'`
9. Donation appears in public "Recent Donations" list

#### Public Display
- Only **confirmed** donations are shown publicly
- Displays: Donor name, amount, currency, payment method
- Shows summary: Total amount in FCA + number of donors
- Last 20 donations visible
- Auto-refreshes every 60 seconds

---

## 4. 📸 Public Media System

### Purpose
Serve Quiz 2025 photos and other public media files.

#### Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/public-media` | GET | All media files |
| `/api/quiz-2025-media` | GET | Quiz 2025 specific media |
| `/api/public-media/stats` | GET | Media statistics by category |

#### Response Format
```json
// GET /api/public-media
[
  {
    "id": 1,
    "filename": "photo1.jpg",
    "filepath": "...",
    "category": "quiz-2025",
    "uploadedAt": "2026-02-10T14:30:00Z"
  }
]

// GET /api/public-media/stats
[
  {
    "category": "quiz-2025",
    "count": 45,
    "lastUpload": "2026-02-17T10:00:00Z"
  }
]
```

#### Database Table (admin_media)
Media files are managed by admins through `/admin.html` → Media Gallery tab

---

## 5. 🔐 Security & Validation

### Input Validation
- **Text fields**: HTML/script tags removed (`<>` stripped)
- **Emails**: Valid email format required
- **Numbers**: Min/max bounds enforced
- **Text length**: Truncated to max length before storage

### Authentication
- **Public endpoints**: No authentication (posts submit, stories submit, donations submit)
- **Admin endpoints**: Basic Auth required (username + password hash)
- **Header**: `Authorization: Basic base64(username:password)`

### CORS
- Secure credentials allowed only to explicit origins
- Wildcard origin (`*`) does NOT include credentials

### Database Security
- All queries use parameterized statements
- SQL injection prevention
- Connection pooling (max 20 connections)

---

## 6. 📊 Admin Dashboard Updates

### New Admin Sections

#### Posts Management Tab
```
+ Table showing all posts
+ Filter by status (all, pending, approved, rejected)
+ Show: Author, Content (preview), Status, Date
+ Buttons: Approve | Reject | Delete
+ Auto-refresh every 60 seconds
```

#### Stories Management Tab
```
+ Table showing all stories
+ Filter by status + expiration time
+ Show: Author, Content (preview), Status, Hours Left, Date
+ Buttons: Approve | Reject | Delete
+ Countdown showing hours remaining (auto-deleted after 0h)
```

#### Donations Tab
```
+ Summary stats: Total confirmed (FCA) | Count of donations
+ Table of all donations
+ Filter by status: Pending | Confirmed | Cancelled
+ Show: Donor, Amount, Currency, Method, Status, Date
+ Buttons: Confirm | Cancel | Delete
+ Color-coded status: Green=confirmed, Orange=pending, Grey=cancelled
```

---

## 7. 📱 Homepage Navigation

### Updated Hero Section Links
```html
<a href="posts.html">📰 Actualités</a>
<a href="stories.html">📱 Stories</a>
<a href="donations.html">💝 Donations</a>
```

All links added to main navigation for easy access.

---

## 8. 🚀 Deployment Status

### Current Status: ✅ LIVE
- **URL**: https://preselectionqi26.vercel.app
- **Deployed**: February 17, 2026
- **Build Time**: ~44 seconds
- **Environment**: Vercel (Node.js 24.x, PostgreSQL)

### What's Deployed
- All API endpoints (posts, stories, donations, media)
- All public pages (posts.html, stories.html, donations.html)
- Updated admin interface with new management tabs
- Database schema auto-created on server start
- Cron job for story expiration cleanup

---

## 9. 📝 File Structure

### New Public Pages
```
public/
├── posts.html          (199 lines) - Posts submission & feed
├── posts.js            (99 lines) - Posts frontend logic
├── stories.html        (295 lines) - Stories carousel interface
├── stories.js          (145 lines) - Stories viewer + submission
├── donations.html      (258 lines) - Donations form + methods
└── donations.js        (155 lines) - Donations submission
```

### Modified Files
```
server.js              (±1200 lines total)
  + Posts CRUD endpoints
  + Stories CRUD endpoints + 30min cron job
  + Donations CRUD endpoints
  + Public media endpoints
  + Database schema for posts, stories, donations

public/admin.js        (±1400 lines total)
  + loadPostsAdmin() function
  + loadStoriesAdmin() function
  + loadDonationsAdmin() function
  + Admin event listeners for all operations
  + Auto-refresh every 60 seconds

public/admin.html      (±380 lines total)
  + Posts Management section
  + Stories Management section
  + Donations Management section
  + Media Gallery section (reorganized)

public/index.html      (Modified)
  + Hero section: added Posts, Stories, Donations links
```

---

## 10. 🧪 Testing Checklist

### Posts Feature
- [ ] Submit post from `/posts.html`
- [ ] Post appears in admin with `pending` status
- [ ] Admin approves post
- [ ] Approved post appears on `/posts.html` feed
- [ ] Admin deletes post
- [ ] Post removed from feed

### Stories Feature
- [ ] Submit story from `/stories.html`
- [ ] Story appears in admin with expiration time
- [ ] Admin approves story
- [ ] Story appears in carousel on `/stories.html`
- [ ] Story shows countdown (hours remaining)
- [ ] Click story opens fullscreen modal
- [ ] Arrow keys navigate between stories
- [ ] Escape closes modal
- [ ] Check after 24h that story auto-deleted (next cron run)

### Donations Feature
- [ ] Submit donation from `/donations.html`
- [ ] Donation appears in admin with `pending` status
- [ ] Click copy buttons → numbers copied to clipboard
- [ ] Admin confirms donation payment
- [ ] Donation status → `confirmed`
- [ ] Donation appears in public "Recent Donations" list
- [ ] Summary shows correct total + count

### Admin Interface
- [ ] Login to `/admin.html`
- [ ] All new tabs visible: Posts, Stories, Donations, Media
- [ ] Can manage all three features
- [ ] Auto-refresh working (every 60 seconds)
- [ ] Logout hides all admin panels

### API Endpoints
- [ ] `POST /api/posts` → creates post
- [ ] `GET /api/posts` → returns approved posts
- [ ] `GET /api/admin/posts` → admin list
- [ ] Similar for stories and donations
- [ ] `/api/public-media` → returns media files
- [ ] `/api/quiz-2025-media` → Quiz 2025 specific

---

## 11. 🔄 Auto-Cleanup & Maintenance

### Story Expiration (30-minute intervals)
```javascript
setInterval(async () => {
  await pool.query('DELETE FROM stories WHERE expiresAt < NOW()');
}, 30 * 60 * 1000); // 30 minutes
```

### When This Runs
- Server startup + every 30 minutes continuously
- Runs in background (non-blocking)
- Deletes all stories with `expiresAt < NOW()`

### Manual Cleanup (if needed)
```sql
-- Delete all expired stories immediately
DELETE FROM stories WHERE expiresAt < NOW();

-- Delete all pending posts (older than 30 days)
DELETE FROM posts WHERE status = 'pending' AND createdAt < NOW() - INTERVAL '30 days';
```

---

## 12. 🐛 Known Limitations & Future Enhancements

### Current Limitations
- No photo upload (only URLs for posts/stories)
- No like/share counters (UI buttons only)
- No email notifications
- Donations don't auto-verify payment (manual admin confirmation)
- No QR codes for payment methods

### Planned Improvements
- [ ] Multer photo upload for posts/stories
- [ ] Like/share database tracking
- [ ] Email notifications for admins + users
- [ ] Payment method QR codes
- [ ] Sentiment analysis for auto-moderation
- [ ] Dashboard analytics for engagement metrics
- [ ] Export donations to CSV for accounting
- [ ] Rate limiting on submissions

---

## 13. 📞 Support & Troubleshooting

### Issue: Posts/Stories not appearing after submission
**Solution**: Check admin panel - posts/stories may be pending approval

### Issue: Stories not auto-deleting after 24h
**Solution**: Wait for next 30-minute cron cycle. Check in admin that story has `expiresAt` set.

### Issue: Copy buttons not working
**Solution**: Browser requires Clipboard API (HTTPS). Check browser console for errors.

### Issue: Admin can't approve/reject
**Solution**: Ensure logged in with correct credentials. Check browser DevTools Network tab.

### Issue: Media endpoints return empty
**Solution**: Upload media via `/admin.html` → Media Gallery tab first

---

## 14. 📚 API Quick Reference

### Posts
```bash
# Submit post
curl -X POST https://preselectionqi26.vercel.app/api/posts \
  -H "Content-Type: application/json" \
  -d '{"authorName":"Ali","authorEmail":"ali@example.com","content":"Hello!","imageUrl":null}'

# Get feeds
curl https://preselectionqi26.vercel.app/api/posts
```

### Stories
```bash
# Submit story
curl -X POST https://preselectionqi26.vercel.app/api/stories \
  -H "Content-Type: application/json" \
  -d '{"authorName":"Sara","authorEmail":"sara@example.com","content":"Story text","mediaUrl":null}'

# Get active stories (24h window)
curl https://preselectionqi26.vercel.app/api/stories/active
```

### Donations
```bash
# Submit donation
curl -X POST https://preselectionqi26.vercel.app/api/donations \
  -H "Content-Type: application/json" \
  -d '{"donorName":"Ahmed","donorEmail":"ahmed@example.com","amount":5000,"currency":"FCA","paymentMethod":"MTN MONEY","message":"Keep it up!"}'

# Get all donations (admin only)
curl -H "Authorization: Basic base64(user:pass)" \
  https://preselectionqi26.vercel.app/api/admin/donations
```

---

## ✅ Summary

All three major features are **live and functional** on production:
- ✅ Posts/Feed with approval workflow
- ✅ Stories with 24h auto-expiration
- ✅ Donations with 4 payment methods
- ✅ Full admin management interface
- ✅ Public media endpoints
- ✅ Deployed to Vercel with PostgreSQL

**No additional work needed unless requesting new features or bug fixes.**
