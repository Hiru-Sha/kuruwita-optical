# ============================================================
#  KURUWITA OPTICAL — Complete Deployment Guide
#  Follow these steps in order. Takes about 30–45 minutes.
# ============================================================

## WHAT YOU NEED FIRST
- A computer with internet
- A free GitHub account → https://github.com
- A free Supabase account → https://supabase.com
- A free Railway account → https://railway.app
- A free Vercel account → https://vercel.com
  (Sign up to all with Google — easiest)

═══════════════════════════════════════════════════════════
  STEP 1 — UPLOAD YOUR CODE TO GITHUB
═══════════════════════════════════════════════════════════

1. Go to https://github.com → click "New repository"
2. Name it: kuruwita-optical
3. Set to Private → click "Create repository"
4. Download and install GitHub Desktop: https://desktop.github.com
5. Open GitHub Desktop → File → Add Local Repository
6. Browse to your kuruwita-optical folder → click "Add"
7. Click "Publish repository" → keep it Private → Publish

═══════════════════════════════════════════════════════════
  STEP 2 — SET UP DATABASE (Supabase)
═══════════════════════════════════════════════════════════

1. Go to https://supabase.com → Sign in → "New project"
2. Name: kuruwita-optical
3. Set a strong database password → SAVE THIS PASSWORD!
4. Region: Singapore (closest to Sri Lanka)
5. Click "Create new project" → wait 2 minutes

6. Once ready, click "SQL Editor" in the left menu
7. Click "New query"
8. Open the file: backend/db/schema.sql
9. Copy ALL the text → Paste into the SQL Editor
10. Click "Run" (green button)
11. You should see: "Success. No rows returned"

12. Now get your connection string:
    → Settings → Database → Connection string → URI
    → Copy the full URL (starts with postgresql://)
    → Replace [YOUR-PASSWORD] with your actual password
    → SAVE THIS — you need it in Step 3

═══════════════════════════════════════════════════════════
  STEP 3 — DEPLOY BACKEND (Railway)
═══════════════════════════════════════════════════════════

1. Go to https://railway.app → Sign in with GitHub
2. Click "New Project" → "Deploy from GitHub repo"
3. Select: kuruwita-optical
4. Railway will detect the backend folder

5. Once deployed, click on your service → "Variables" tab
6. Add these environment variables one by one:
   
   DATABASE_URL    = (paste your Supabase connection string)
   JWT_SECRET      = KuruwitaOptical2024SecretKey!ChangThis
   PORT            = 5000
   FRONTEND_URL    = https://kuruwita-optical.vercel.app

7. Click "Deploy" → wait 2 minutes
8. Go to "Settings" tab → find your Railway URL
   It looks like: https://kuruwita-optical-backend.up.railway.app
   → SAVE THIS URL

9. Test it: open your browser and go to:
   https://[your-railway-url]/api/health
   You should see: {"status":"ok","app":"Kuruwita Optical"}
   ✅ Backend is working!

═══════════════════════════════════════════════════════════
  STEP 4 — DEPLOY FRONTEND (Vercel)
═══════════════════════════════════════════════════════════

1. Go to https://vercel.com → Sign in with GitHub
2. Click "Add New" → "Project"
3. Select: kuruwita-optical repository
4. Set Root Directory to: frontend
5. Framework Preset: Create React App

6. Under "Environment Variables" add:
   REACT_APP_API_URL = https://[your-railway-url]/api
   (use the Railway URL you saved in Step 3)

7. Click "Deploy" → wait 3 minutes
8. Vercel gives you a URL like: https://kuruwita-optical.vercel.app
   → SAVE THIS

9. Go back to Railway → update FRONTEND_URL variable:
   FRONTEND_URL = https://[your-vercel-url]
   → Redeploy Railway

═══════════════════════════════════════════════════════════
  STEP 5 — LOG IN FOR THE FIRST TIME
═══════════════════════════════════════════════════════════

1. Open https://[your-vercel-url] in your browser
2. Login with:
   Username: admin
   Password: password

3. ⚠️  IMMEDIATELY go to Settings → Change Password
   Set a strong password only you know!

4. To add staff login, go to Supabase → SQL Editor:

   INSERT INTO users (username, password, full_name, role)
   VALUES ('staff1', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Staff Name', 'staff');
   
   (This sets password to "password" — staff must change it immediately)

═══════════════════════════════════════════════════════════
  STEP 6 — ACCESS ON YOUR PHONE
═══════════════════════════════════════════════════════════

1. Open your Vercel URL on your phone browser
2. Tap the Share button → "Add to Home Screen"
3. It will work like an app on your phone! 📱
4. Works on both Android and iPhone

═══════════════════════════════════════════════════════════
  FOLDER STRUCTURE (for reference)
═══════════════════════════════════════════════════════════

kuruwita-optical/
├── backend/
│   ├── server.js              ← Main server entry point
│   ├── package.json
│   ├── .env.example           ← Copy to .env with your values
│   ├── db/
│   │   ├── pool.js            ← Database connection
│   │   └── schema.sql         ← Run this in Supabase
│   ├── middleware/
│   │   └── auth.js            ← JWT protection
│   └── routes/
│       ├── auth.js            ← Login, change password
│       ├── orders.js          ← All order operations
│       ├── customers.js       ← Customer profiles
│       ├── inventory.js       ← Stock management
│       ├── dealers.js         ← Dealer + purchases
│       └── reports.js         ← Dashboard + reports
│
└── frontend/
    ├── package.json
    ├── .env.example           ← Copy to .env with Railway URL
    └── src/
        ├── App.js             ← Main router (all 6 phases)
        ├── api/index.js       ← All API calls
        ├── context/
        │   └── AuthContext.js ← Login state management
        ├── components/
        │   └── Layout.js      ← Sidebar + header
        └── pages/
            ├── Login.js       ← Phase 1: Login screen
            ├── Dashboard.js   ← Phase 6: Dashboard
            ├── Orders.js      ← Phase 2+3: Orders
            ├── Customers.js   ← Phase 5: Customers
            ├── Inventory.js   ← Phase 4: Inventory
            ├── Reports.js     ← Phase 6: Reports
            └── Settings.js    ← Password & app info

═══════════════════════════════════════════════════════════
  COSTS (all free to start!)
═══════════════════════════════════════════════════════════

Supabase Free:  500MB database, 50,000 rows — enough for years
Railway Free:   $5/month credit — covers small apps
Vercel Free:    Unlimited frontend deployments

Total cost to start: Rs. 0 🎉

When your shop grows:
Railway Hobby: ~$5/month (Rs. 1,500)
Supabase Pro:  $25/month  (Rs. 7,500) — only if 500MB not enough

═══════════════════════════════════════════════════════════
  NEED HELP?
═══════════════════════════════════════════════════════════

If you get stuck at any step, come back to Claude and say:
"I'm stuck at Step [number] — [what happened]"
and share any error message you see.

Good luck with Kuruwita Optical! 🎉👁️
