# MeduPal - OSCE Clinical Skills Training Platform

MeduPal is a comprehensive admin dashboard for managing OSCE (Objective Structured Clinical Examination) clinical skills training sessions, students, cases, and hardware sensors.

![MeduPal Dashboard](https://img.shields.io/badge/React-18.3-blue) ![Supabase](https://img.shields.io/badge/Backend-Supabase-green) ![Vite](https://img.shields.io/badge/Build-Vite-purple)

## 🚀 Features

- **Dashboard Overview**: Real-time monitoring of active stations, sessions, and system health
- **Cases Management**: Create, view, and delete clinical training cases
- **Sessions Management**: Schedule and manage OSCE training sessions
- **Students Management**: Track student profiles and performance
- **Stations Map**: Visualize and manage all clinical training stations
- **Hardware Integration**: Monitor sensor data and control audio output (planned)
- **Real-time Updates**: Live data synchronization via Supabase

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **npm** or **yarn** package manager
- **Git** - [Download here](https://git-scm.com/)
- **Supabase Account** - [Sign up here](https://supabase.com/)

## 🛠️ Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/YazeedQasas/MeduPal.git
cd MeduPal
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Supabase Backend

#### A. Create a New Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Click **"New Project"**
3. Fill in your project details:
   - **Name**: MeduPal
   - **Database Password**: (choose a strong password)
   - **Region**: (select closest to you)
4. Click **"Create new project"** and wait for setup to complete

#### B. Run Database Schema

1. In your Supabase project, go to **SQL Editor**
2. Copy the contents of `supabase_schema.sql` from this repository
3. Paste it into the SQL Editor and click **"Run"**
4. This will create all necessary tables (users, students, cases, sessions, stations, etc.)

#### C. Seed Initial Data (Optional)

1. In the SQL Editor, copy the contents of `supabase_seed.sql`
2. Paste and run it to populate the database with sample data

#### D. Set Up Row Level Security (RLS) Policies

Run each of the following SQL scripts in the SQL Editor:

1. `enable_cases_rls.sql` - Enables CRUD for cases
2. `enable_sessions_rls.sql` - Enables CRUD for sessions
3. `enable_students_rls.sql` - Enables CRUD for students
4. `enable_stations_rls.sql` - Enables CRUD for stations
5. `fix_delete_cascade.sql` - Fixes cascade delete for sessions

### 4. Configure Environment Variables

1. Create a `.env.local` file in the root directory:

```bash
cp .env.local.example .env.local
```

2. Get your Supabase credentials:
   - Go to **Project Settings** → **API**
   - Copy your **Project URL** and **anon/public key**

3. Update `.env.local`:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

⚠️ **Important**: Never commit `.env.local` to version control!

### 5. Run the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## 📁 Project Structure

```
MeduPal/
├── src/
│   ├── components/
│   │   ├── dashboard/          # Dashboard components
│   │   │   ├── Cases.jsx
│   │   │   ├── Sessions.jsx
│   │   │   ├── Students.jsx
│   │   │   ├── StationsMap.jsx
│   │   │   ├── Hardware.jsx
│   │   │   └── ...
│   │   └── layout/             # Layout components
│   │       ├── MainLayout.jsx
│   │       ├── Sidebar.jsx
│   │       └── Header.jsx
│   ├── lib/
│   │   ├── supabase.js         # Supabase client
│   │   └── utils.js            # Utility functions
│   ├── App.jsx                 # Main app component
│   └── main.jsx                # Entry point
├── public/                     # Static assets
├── supabase_schema.sql         # Database schema
├── supabase_seed.sql           # Sample data
├── enable_*_rls.sql            # RLS policy scripts
└── package.json
```

## 🗄️ Database Schema

The application uses the following main tables:

- **profiles** - User profiles and authentication
- **students** - Student information
- **cases** - Clinical training cases
- **stations** - Physical training stations/rooms
- **sessions** - Training sessions linking students, cases, and stations
- **sensor_readings** - Hardware sensor data (planned)

## 🔐 Authentication

MeduPal uses Supabase Authentication. To set up user authentication:

1. Go to **Authentication** → **Providers** in Supabase Dashboard
2. Enable **Email** provider
3. (Optional) Enable social providers (Google, GitHub, etc.)
4. Create test users in **Authentication** → **Users**

## 🚀 Deployment

### Deploy to Vercel (Recommended)

1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com/)
3. Click **"New Project"** and import your repository
4. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Click **"Deploy"**

### Deploy to Netlify

1. Push your code to GitHub
2. Go to [Netlify](https://netlify.com/)
3. Click **"Add new site"** → **"Import an existing project"**
4. Connect your repository
5. Build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
6. Add environment variables in **Site settings** → **Environment variables**
7. Click **"Deploy site"**

## 📝 Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## 🔧 Configuration

### Tailwind CSS

The project uses Tailwind CSS with a custom theme. Configuration is in `tailwind.config.js`.

### Vite

Build configuration is in `vite.config.js`.

## 🐛 Troubleshooting

### Issue: "Invalid API key" error

**Solution**: Double-check your `.env.local` file has the correct Supabase URL and anon key.

### Issue: "Row Level Security policy violation"

**Solution**: Make sure you've run all the `enable_*_rls.sql` scripts in Supabase SQL Editor.

### Issue: Database tables not found

**Solution**: Run `supabase_schema.sql` in the Supabase SQL Editor to create all tables.

### Issue: CORS errors

**Solution**: Check that your Supabase project URL matches exactly in `.env.local`.

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👥 Authors

- **Yazeed Qasas** - [GitHub](https://github.com/YazeedQasas)

## 🙏 Acknowledgments

- Built with [React](https://react.dev/)
- Backend powered by [Supabase](https://supabase.com/)
- UI components styled with [Tailwind CSS](https://tailwindcss.com/)
- Icons from [Lucide React](https://lucide.dev/)

## 📞 Support

For support, email your-email@example.com or open an issue on GitHub.

---

**Made with ❤️ for medical education**