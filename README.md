# Rentified - Django + Next.js Full Stack Application

A modern full-stack web application built with Django REST Framework backend and Next.js frontend, following 2025 best practices.

## 🏗️ Project Structure

```
my-gaff-list/
├── backend/                 # Django application
│   ├── apps/               # Django applications
│   │   ├── api/           # API endpoints
│   │   ├── core/          # Core functionality
│   │   └── users/         # User management
│   ├── my_gaff_list/      # Django project settings
│   ├── manage.py
│   └── requirements.txt
├── frontend/               # Next.js application
│   ├── src/
│   │   ├── app/           # App Router pages
│   │   └── lib/           # Utilities and API client
│   ├── package.json
│   └── next.config.ts
├── packages/               # Shared packages (future use)
├── turbo.json             # Turborepo configuration
└── package.json           # Root package.json
```

## 🚀 Tech Stack

### Backend
- **Django 5.1** - Web framework
- **Django REST Framework** - API development
- **Djoser** - Authentication endpoints
- **Simple JWT** - JWT token authentication
- **django-cors-headers** - CORS handling
- **PostgreSQL/SQLite** - Database

### Frontend
- **Next.js 15** - React framework with App Router
- **React 19** - JavaScript library
- **TypeScript** - Type safety
- **Tailwind CSS v4** - Styling
- **Axios** - HTTP client
- **Turbopack** - Fast bundler

## 📦 Installation

### Prerequisites
- Python 3.12+
- Node.js 18.17.0+
- npm or yarn

### 1. Clone and Setup

```bash
git clone <repository-url>
cd my-gaff-list
```

### 2. Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Configure environment
cp .env.example .env  # Edit with your settings

# Run migrations
python manage.py migrate

# Create superuser (optional)
python manage.py createsuperuser
```

### 3. Frontend Setup

```bash
cd frontend
npm install
```

### 4. Root Setup (for Turborepo)

```bash
# At project root
npm install
```

## 🏃‍♂️ Running the Application

### Development Mode

#### Option 1: Run Both Services (Recommended)
```bash
# At project root
npm run dev
```

#### Option 2: Run Services Separately
```bash
# Terminal 1 - Backend
npm run backend:dev
# or
cd backend && source venv/bin/activate && python manage.py runserver

# Terminal 2 - Frontend
npm run frontend:dev
# or
cd frontend && npm run dev
```

### Production Mode

```bash
# Build frontend
cd frontend && npm run build

# Run with production settings
cd backend && python manage.py runserver --settings=my_gaff_list.settings.production
```

## 🔧 Configuration

### Backend Configuration (.env)
```env
DEBUG=True
SECRET_KEY=your-secret-key-here
DATABASE_URL=sqlite:///db.sqlite3
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

### Frontend Configuration (.env.local)
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

## 🔐 Authentication

The application uses JWT authentication with the following endpoints:

- **Register**: `POST /api/auth/users/`
- **Login**: `POST /api/auth/jwt/create/`
- **Refresh Token**: `POST /api/auth/jwt/refresh/`
- **User Profile**: `GET /api/auth/users/me/`

### Frontend API Usage

```typescript
import { authApi } from '@/lib/api';

// Login
const response = await authApi.login({
  email: 'user@example.com',
  password: 'password'
});

// Register
const response = await authApi.register({
  email: 'user@example.com',
  password: 'password',
  re_password: 'password'
});
```

## 🎯 API Endpoints

### Authentication
- `POST /api/auth/users/` - User registration
- `POST /api/auth/jwt/create/` - Login
- `POST /api/auth/jwt/refresh/` - Refresh token
- `GET /api/auth/users/me/` - Get current user

### General
- `GET /api/` - API overview and status

## 🔨 Development

### Adding New Django Apps

```bash
cd backend
source venv/bin/activate
python manage.py startapp app_name apps/app_name
```

Then add to `INSTALLED_APPS` in settings.py:
```python
INSTALLED_APPS = [
    # ...
    'apps.app_name',
]
```

### Adding Frontend Pages

Create new pages in `frontend/src/app/`:
```typescript
// frontend/src/app/about/page.tsx
export default function About() {
  return <div>About Page</div>;
}
```

## 🧪 Testing

### Backend Tests
```bash
cd backend
source venv/bin/activate
python manage.py test
```

### Frontend Tests
```bash
cd frontend
npm run test  # Add testing framework as needed
```

## 🚀 Deployment

### Backend Deployment
- Configure production database
- Set `DEBUG=False`
- Configure static files serving
- Set up proper CORS origins
- Use environment variables for secrets

### Frontend Deployment
- Build the application: `npm run build`
- Deploy to Vercel, Netlify, or other platforms
- Configure environment variables

### Docker Deployment (Optional)

Create `Dockerfile` in backend and frontend directories for containerized deployment.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure `CORS_ALLOWED_ORIGINS` includes your frontend URL
2. **Module Import Errors**: Check Python path configuration in settings.py
3. **Node Modules Issues**: Delete `node_modules` and run `npm install`
4. **Database Issues**: Run `python manage.py migrate`

### Useful Commands

```bash
# Reset database
cd backend && rm db.sqlite3 && python manage.py migrate

# Clear Next.js cache
cd frontend && rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json && npm install
```
