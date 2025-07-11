# 📚 LibraryOS - Modern Library Management System

A comprehensive, modern library management system with barcode scanning, real-time student tracking, staff authentication, login tracking, and advanced admin features. Built with Next.js, TypeScript, and Appwrite.

![LibraryOS Dashboard](https://via.placeholder.com/800x400/4F46E5/FFFFFF?text=LibraryOS+Dashboard)

## ✨ Features

### 🔐 **Authentication & Security**
- **Staff Login System** with role-based access control
- **Admin Panel** with advanced permissions
- **Password Protection** for admin accounts
- **Session Management** with automatic logout
- **Login History Tracking** with detailed session records

### 📊 **Student Management**
- **Barcode Scanning** for quick check-in/check-out
- **Real-time Tracking** of student presence
- **Automatic Student Registration** on first scan
- **Student Database** with contact information
- **Edit/Delete Records** with admin controls

### 📈 **Analytics & Reporting**
- **Live Dashboard** with real-time statistics
- **Daily/Monthly Reports** with filtering
- **PDF Export** for record keeping
- **Excel Export** for data analysis
- **Peak Hour Analysis** and usage patterns
- **Staff Activity Monitoring** with login/logout tracking

### 🛠️ **Admin Features**
- **Staff Management** - Add, edit, deactivate staff
- **Record Management** - View, filter, export, edit, delete all records
- **Student Management** - Add, edit, delete student records
- **Login History** - Track staff sessions and activity
- **System Analytics** - Usage statistics and insights
- **Database Management** - Full CRUD operations

### 🌐 **Cloud Integration**
- **Appwrite Backend** for cloud synchronization
- **Offline Mode** with localStorage fallback
- **Real-time Sync** across multiple devices
- **Connection Status** monitoring

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm/yarn
- Modern web browser
- Appwrite account (optional - works offline)

### Installation

1. **Clone the repository**
   \`\`\`bash
   git clone <your-repo-url>
   cd library-management-system
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   npm install
   # or
   yarn install
   \`\`\`

3. **Set up environment variables**
   \`\`\`bash
   cp .env.local.example .env.local
   \`\`\`
   
   Edit `.env.local` with your Appwrite credentials (see Appwrite Setup section below):
   \`\`\`env
   NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
   NEXT_PUBLIC_APPWRITE_PROJECT_ID=your-project-id
   NEXT_PUBLIC_APPWRITE_DATABASE_ID=library-db
   NEXT_PUBLIC_APPWRITE_RECORDS_COLLECTION_ID=records
   NEXT_PUBLIC_APPWRITE_STUDENTS_COLLECTION_ID=students
   NEXT_PUBLIC_APPWRITE_STAFF_COLLECTION_ID=staff
   NEXT_PUBLIC_APPWRITE_LOGIN_RECORDS_COLLECTION_ID=login-records
   \`\`\`

4. **Run the development server**
   \`\`\`bash
   npm run dev
   # or
   yarn dev
   \`\`\`

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 🗄️ Appwrite Database Setup (Complete Guide)

### Step 1: Create Appwrite Account

1. **Go to [Appwrite Cloud](https://cloud.appwrite.io)**
2. **Sign up** for a free account
3. **Verify your email** address
4. **Create a new project**
   - Click "Create Project"
   - Enter project name: `Library Management System`
   - Choose your preferred region
   - Click "Create"

### Step 2: Get Project Credentials

1. **Copy Project ID**
   - Go to your project dashboard
   - Copy the Project ID from the top of the page
   - Save this for your `.env.local` file

2. **Get Endpoint URL**
   - The endpoint is usually: `https://cloud.appwrite.io/v1`
   - Or check in your project settings

### Step 3: Create Database

1. **Navigate to Databases**
   - Click "Databases" in the left sidebar
   - Click "Create Database"
   - Database ID: `library-db`
   - Name: `Library Management Database`
   - Click "Create"

### Step 4: Create Collections

You need to create **4 collections** with specific attributes and indexes:

#### 📋 **Collection 1: Records** (`records`)

**Purpose**: Store check-in/check-out records

1. **Create Collection**
   - Collection ID: `records`
   - Name: `Library Records`
   - Click "Create"

2. **Add Attributes**
   \`\`\`
   admissionId (String)
   - Size: 50
   - Required: Yes
   - Array: No
   
   studentName (String)
   - Size: 100
   - Required: Yes
   - Array: No
   
   checkInTime (DateTime)
   - Required: No
   - Array: No
   
   checkOutTime (DateTime)
   - Required: No
   - Array: No
   
   date (String)
   - Size: 10
   - Required: Yes
   - Array: No
   - Default: (leave empty)
   
   status (Enum)
   - Elements: checked-in, checked-out
   - Required: Yes
   - Array: No
   \`\`\`

3. **Create Indexes**
   \`\`\`
   Index 1:
   - Key: date_index
   - Type: key
   - Attributes: date (DESC)
   
   Index 2:
   - Key: admissionId_index
   - Type: key
   - Attributes: admissionId (ASC)
   
   Index 3:
   - Key: status_index
   - Type: key
   - Attributes: status (ASC)
   \`\`\`

#### 👥 **Collection 2: Students** (`students`)

**Purpose**: Store student information

1. **Create Collection**
   - Collection ID: `students`
   - Name: `Students Database`
   - Click "Create"

2. **Add Attributes**
   \`\`\`
   admissionId (String)
   - Size: 50
   - Required: Yes
   - Array: No
   
   name (String)
   - Size: 100
   - Required: Yes
   - Array: No
   
   email (String)
   - Size: 100
   - Required: No
   - Array: No
   
   phone (String)
   - Size: 20
   - Required: No
   - Array: No
   \`\`\`

3. **Create Indexes**
   \`\`\`
   Index 1:
   - Key: admissionId_unique
   - Type: unique
   - Attributes: admissionId (ASC)
   
   Index 2:
   - Key: name_index
   - Type: key
   - Attributes: name (ASC)
   \`\`\`

#### 👨‍💼 **Collection 3: Staff** (`staff`)

**Purpose**: Store staff information

1. **Create Collection**
   - Collection ID: `staff`
   - Name: `Staff Database`
   - Click "Create"

2. **Add Attributes**
   \`\`\`
   staffId (String)
   - Size: 20
   - Required: Yes
   - Array: No
   
   name (String)
   - Size: 100
   - Required: Yes
   - Array: No
   
   role (String)
   - Size: 50
   - Required: Yes
   - Array: No
   
   email (String)
   - Size: 100
   - Required: No
   - Array: No
   
   isActive (Boolean)
   - Required: No
   - Default: true
   - Array: No
   \`\`\`

3. **Create Indexes**
   \`\`\`
   Index 1:
   - Key: staffId_unique
   - Type: unique
   - Attributes: staffId (ASC)
   
   Index 2:
   - Key: isActive_index
   - Type: key
   - Attributes: isActive (ASC)
   \`\`\`

#### 📊 **Collection 4: Login Records** (`login-records`)

**Purpose**: Track staff login/logout sessions

1. **Create Collection**
   - Collection ID: `login-records`
   - Name: `Login Records`
   - Click "Create"

2. **Add Attributes**
   \`\`\`
   staffId (String)
   - Size: 20
   - Required: Yes
   - Array: No
   
   staffName (String)
   - Size: 100
   - Required: Yes
   - Array: No
   
   staffRole (String)
   - Size: 50
   - Required: Yes
   - Array: No
   
   loginTime (DateTime)
   - Required: Yes
   - Array: No
   
   logoutTime (DateTime)
   - Required: No
   - Array: No
   
   sessionDuration (Integer)
   - Required: No
   - Array: No
   - Min: 0
   - Max: 86400
   
   ipAddress (String)
   - Size: 50
   - Required: No
   - Array: No
   
   userAgent (String)
   - Size: 500
   - Required: No
   - Array: No
   \`\`\`

3. **Create Indexes**
   \`\`\`
   Index 1:
   - Key: loginTime_index
   - Type: key
   - Attributes: loginTime (DESC)
   
   Index 2:
   - Key: staffId_index
   - Type: key
   - Attributes: staffId (ASC)
   
   Index 3:
   - Key: logoutTime_index
   - Type: key
   - Attributes: logoutTime (ASC)
   \`\`\`

### Step 5: Set Permissions

**⚠️ IMPORTANT**: For each collection, set the following permissions:

1. **Go to each collection**
2. **Click "Settings" tab**
3. **Scroll to "Permissions" section**
4. **Set permissions as follows**:

\`\`\`
Read: any
Create: any
Update: any
Delete: any
\`\`\`

**Note**: These are permissive settings for development. In production, implement proper role-based permissions.

### Step 6: Update Environment Variables

Update your `.env.local` file with the actual values:

\`\`\`env
# Appwrite Configuration
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your-actual-project-id-here
NEXT_PUBLIC_APPWRITE_DATABASE_ID=library-db
NEXT_PUBLIC_APPWRITE_RECORDS_COLLECTION_ID=records
NEXT_PUBLIC_APPWRITE_STUDENTS_COLLECTION_ID=students
NEXT_PUBLIC_APPWRITE_STAFF_COLLECTION_ID=staff
NEXT_PUBLIC_APPWRITE_LOGIN_RECORDS_COLLECTION_ID=login-records

# Optional: API Key for server-side operations
APPWRITE_API_KEY=your-api-key-here
\`\`\`

### Step 7: Test Connection

1. **Restart your development server**
   \`\`\`bash
   npm run dev
   \`\`\`

2. **Check connection status**
   - Open the app in your browser
   - Look for the connection status indicator
   - It should show "Connected to Appwrite Cloud"

3. **Test functionality**
   - Try logging in with demo credentials
   - Scan a student ID to create a record
   - Check if data appears in your Appwrite console

## 👥 Demo Accounts

### Staff Accounts
| Staff ID | Name | Role | Password |
|----------|------|------|----------|
| STAFF001 | Sarah Johnson | Head Librarian | `library123` |
| STAFF002 | Michael Chen | Assistant Librarian | `library123` |
| STAFF003 | Emily Davis | Library Assistant | `library123` |

### Admin Accounts
| Staff ID | Name | Role | Password |
|----------|------|------|----------|
| ADMIN | Administrator | System Admin | `admin2024` |
| ADMIN001 | John Admin | System Admin | `admin2024` |

> **Note**: Staff passwords are optional for backward compatibility. Admin passwords are required.

## 🎯 Usage Guide

### 📱 **Staff Login**
1. Enter your Staff ID (e.g., `STAFF001`)
2. For admin accounts, enter password: `admin2024`
3. Click "Login" or press Enter
4. **Login session is automatically tracked** with timestamp and duration

### 📊 **Student Check-in/Check-out**
1. Navigate to "Scanner" tab
2. Scan barcode or type admission ID
3. Press Enter or click "Process"
4. System automatically handles check-in vs check-out

### 📋 **View Records**
1. Navigate to "Records" tab
2. Select date using calendar picker
3. View all activities for that date
4. Use filters to search specific students

### 🔧 **Admin Panel** (Admin accounts only)
1. Login with admin credentials
2. Click "Admin Panel" button (top-right)
3. Access advanced features:
   - **Records Management** - View, filter, export, edit, delete all data
   - **Student Management** - Add/edit/delete student records
   - **Staff Management** - Add/remove staff accounts
   - **Login History** - Track staff sessions and activity
   - **Analytics** - Usage statistics and reports

## 🔧 Configuration

### Environment Variables
\`\`\`env
# Required for Appwrite integration
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your-project-id
NEXT_PUBLIC_APPWRITE_DATABASE_ID=library-db
NEXT_PUBLIC_APPWRITE_RECORDS_COLLECTION_ID=records
NEXT_PUBLIC_APPWRITE_STUDENTS_COLLECTION_ID=students
NEXT_PUBLIC_APPWRITE_STAFF_COLLECTION_ID=staff
NEXT_PUBLIC_APPWRITE_LOGIN_RECORDS_COLLECTION_ID=login-records

# Optional: Server-side API key
APPWRITE_API_KEY=your-api-key
\`\`\`

### Customization

#### **Adding New Staff**
Edit `components/auth-context.tsx`:
\`\`\`typescript
const STAFF_DATABASE = {
  STAFF004: {
    id: "STAFF004",
    name: "Your Name",
    role: "Your Role",
    password: "your-password",
    isAdmin: false,
  },
  // ... existing staff
}
\`\`\`

#### **Changing Admin Password**
Update the password in `components/auth-context.tsx`:
\`\`\`typescript
ADMIN: {
  id: "ADMIN",
  name: "Administrator",
  role: "System Admin",
  password: "your-new-password", // Change this
  isAdmin: true,
},
\`\`\`

## 🐛 Troubleshooting

### Common Issues

**1. "Failed to fetch" Error**
- ✅ Check internet connection
- ✅ Verify Appwrite credentials in `.env.local`
- ✅ Ensure all environment variables are set correctly
- ✅ System falls back to localStorage automatically

**2. Collections Not Found**
- ✅ Verify collection IDs match exactly in Appwrite console
- ✅ Check that all 4 collections are created
- ✅ Ensure collection IDs in `.env.local` match Appwrite

**3. Permission Denied Errors**
- ✅ Check collection permissions are set to "any" for all operations
- ✅ Verify project ID is correct
- ✅ Try recreating the collections with proper permissions

**4. Admin Access Denied**
- ✅ Logout current user
- ✅ Login with `ADMIN` and password `admin2024`
- ✅ Check browser console for errors

**5. Records Not Showing**
- ✅ Verify all collections exist in Appwrite
- ✅ Check collection IDs in environment variables
- ✅ Try refreshing the page
- ✅ Check browser network tab for API errors

**6. Login History Not Working**
- ✅ Verify `login-records` collection exists
- ✅ Check all attributes are created correctly
- ✅ Ensure DateTime attributes are properly configured

**7. Duplicate Entries Being Created**
- ✅ This has been fixed in the latest version
- ✅ System now properly checks for existing records before creating new ones
- ✅ Each student can only have one active check-in per day
- ✅ Scanning the same ID multiple times will toggle between check-in/check-out

**8. Multiple Records for Same Entry**
- ✅ Enhanced duplicate detection prevents multiple check-ins
- ✅ System sorts records by time to find the most recent status
- ✅ Clear validation messages when student is already checked in

### Demo Mode
If Appwrite is not configured:
- System runs in demo mode
- Data stored in browser localStorage
- All features work normally including login tracking
- Yellow banner indicates demo mode

### Debugging Steps

1. **Check Browser Console**
   \`\`\`javascript
   // Open browser dev tools and check for errors
   console.log("Checking Appwrite connection...")
   \`\`\`

2. **Verify Environment Variables**
   \`\`\`bash
   # Check if .env.local exists and has correct values
   cat .env.local
   \`\`\`

3. **Test Appwrite Connection**
   - Go to Appwrite console
   - Check if collections exist
   - Verify permissions are set correctly
   - Test creating a document manually

4. **Check Network Requests**
   - Open browser dev tools
   - Go to Network tab
   - Try performing an action
   - Check if API requests are successful

## 📊 Database Schema Reference

### Quick Reference Table

| Collection | Purpose | Key Attributes | Indexes |
|------------|---------|----------------|---------|
| `records` | Check-in/out logs | admissionId, studentName, date, status | date, admissionId, status |
| `students` | Student database | admissionId (unique), name, email, phone | admissionId (unique), name |
| `staff` | Staff accounts | staffId (unique), name, role, isActive | staffId (unique), isActive |
| `login-records` | Login tracking | staffId, loginTime, logoutTime, duration | loginTime, staffId, logoutTime |

### Relationships

\`\`\`
Students (1) ←→ (Many) Records
Staff (1) ←→ (Many) LoginRecords
\`\`\`

## 🚀 Deployment

### Vercel (Recommended)

1. **Push code to GitHub**
   ```bash
   git add .
   git commit -m "Deploy to Vercel"
   git push origin main
   ```

2. **Connect repository to Vercel**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository
   - Configure project settings

3. **Add environment variables in Vercel dashboard**
   - Go to Project Settings → Environment Variables
   - Add each variable:
   
   ```env
   NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
   NEXT_PUBLIC_APPWRITE_PROJECT_ID=686f3b60002d25d1e005
   NEXT_PUBLIC_APPWRITE_DATABASE_ID=library-db
   NEXT_PUBLIC_APPWRITE_RECORDS_COLLECTION_ID=records
   NEXT_PUBLIC_APPWRITE_STUDENTS_COLLECTION_ID=students
   NEXT_PUBLIC_APPWRITE_STAFF_COLLECTION_ID=staff
   NEXT_PUBLIC_APPWRITE_LOGIN_RECORDS_COLLECTION_ID=login-records
   ```

4. **Deploy automatically**
   - Vercel will automatically deploy
   - Check deployment logs for any errors
   - Test the connection status in your deployed app

### Vercel Deployment Troubleshooting

**1. Environment Variables Not Working**
- ✅ Ensure all variables start with `NEXT_PUBLIC_`
- ✅ Double-check variable names match exactly
- ✅ Redeploy after adding variables
- ✅ Check Vercel deployment logs

**2. Appwrite Connection Issues**
- ✅ Use global endpoint: `https://cloud.appwrite.io/v1`
- ✅ Verify project ID is correct
- ✅ Check Appwrite console for API errors
- ✅ Test connection from Vercel deployment

**3. CORS Issues**
- ✅ Add your Vercel domain to Appwrite project platforms
- ✅ Go to Appwrite Console → Your Project → Settings → Platforms
- ✅ Add Web Platform with your Vercel URL (e.g., `https://your-app.vercel.app`)

**4. Function Timeout Issues**
- ✅ Appwrite queries have built-in timeouts
- ✅ Check Vercel function logs for timeout errors
- ✅ Consider implementing retry logic

### Adding Vercel Domain to Appwrite

1. **Go to Appwrite Console**
2. **Select your project**
3. **Go to Settings → Platforms**
4. **Click "Add Platform"**
5. **Select "Web App"**
6. **Add your domains:**
   ```
   https://your-app.vercel.app
   https://your-app-git-main-username.vercel.app
   localhost:3000 (for development)
   ```

### Vercel Environment Variables Setup

```bash
# In Vercel Dashboard → Project Settings → Environment Variables

# Variable Name: NEXT_PUBLIC_APPWRITE_ENDPOINT
# Value: https://cloud.appwrite.io/v1
# Environment: Production, Preview, Development

# Variable Name: NEXT_PUBLIC_APPWRITE_PROJECT_ID  
# Value: 686f3b60002d25d1e005
# Environment: Production, Preview, Development

# Variable Name: NEXT_PUBLIC_APPWRITE_DATABASE_ID
# Value: library-db
# Environment: Production, Preview, Development

# Variable Name: NEXT_PUBLIC_APPWRITE_RECORDS_COLLECTION_ID
# Value: records
# Environment: Production, Preview, Development

# Variable Name: NEXT_PUBLIC_APPWRITE_STUDENTS_COLLECTION_ID
# Value: students
# Environment: Production, Preview, Development

# Variable Name: NEXT_PUBLIC_APPWRITE_STAFF_COLLECTION_ID
# Value: staff
# Environment: Production, Preview, Development

# Variable Name: NEXT_PUBLIC_APPWRITE_LOGIN_RECORDS_COLLECTION_ID
# Value: login-records
# Environment: Production, Preview, Development
```

## 🐛 Troubleshooting

### Vercel Deployment Issues

**1. Appwrite Not Working on Vercel**
- ✅ Check environment variables are properly set in Vercel dashboard
- ✅ Ensure all variables start with `NEXT_PUBLIC_`
- ✅ Use global Appwrite endpoint: `https://cloud.appwrite.io/v1`
- ✅ Add Vercel domain to Appwrite platforms
- ✅ Check browser console for CORS errors
- ✅ Verify project ID is correct

**2. Connection Status Shows "Demo Mode" on Vercel**
- ✅ Environment variables not properly configured
- ✅ Check Vercel deployment logs
- ✅ Ensure variables are added to all environments (Production, Preview, Development)
- ✅ Redeploy after adding environment variables

**3. "Failed to fetch" Errors on Vercel**
- ✅ CORS issue - add Vercel domain to Appwrite platforms
- ✅ Network connectivity issue - check Vercel function logs
- ✅ Wrong endpoint URL - verify in environment variables
- ✅ Project ID mismatch - double-check in Appwrite console

**4. Environment Variables Not Loading**
```javascript
// Add this to debug in your deployed app
console.log("Environment variables check:", {
  endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT,
  projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
  hasEndpoint: !!process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT,
  hasProjectId: !!process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID
})
```

**5. Deployment Succeeds but App Doesn't Work**
- ✅ Check browser console for JavaScript errors
- ✅ Verify API calls in Network tab
- ✅ Test locally with same environment variables
- ✅ Check Vercel function logs for server-side errors

---

**LibraryOS** - Making library management modern, efficient, and beautiful! 📚✨

Built with ❤️ using Next.js, TypeScript, and Appwrite.

**Latest Version:** Complete admin controls with record editing and deletion! 🔐📊✏️
