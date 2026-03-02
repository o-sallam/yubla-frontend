# Yubla Frontend

React web application for the Yubla School Grades Management System.

## Tech Stack

- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: CSS
- **HTTP Client**: Fetch API

## Prerequisites

- Node.js 18 or higher
- npm or yarn

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file in the frontend directory:

```env
VITE_API_BASE=http://localhost:3000
```

### Environment Variables

- `VITE_API_BASE` - Backend API URL (without trailing slash)

## Development

```bash
npm run dev
```

The application will start on `http://localhost:5173` with hot module replacement.

## Production Build

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Preview Production Build

```bash
npm run preview
```

## Project Structure

```
frontend/
├── src/
│   ├── App.jsx            # Main application component
│   ├── main.jsx           # Application entry point
│   ├── legacy/
│   │   ├── body.html      # Legacy HTML template
│   │   └── legacyScript.js # Legacy application logic
│   └── styles/
│       └── index.css      # Global styles
├── public/
│   └── vite.svg          # Favicon
├── index.html            # HTML template
├── .env                  # Environment variables (create this)
├── vite.config.js        # Vite configuration
└── package.json
```

## Features

### User Roles

1. **Super Admin**
   - System-wide management
   - Manage all tenants/schools
   - Manage all users
   - Import data
   - System statistics

2. **School Admin**
   - Manage school users
   - Manage teacher assignments
   - Manage students
   - View submissions

3. **Teacher**
   - View assigned classes
   - Submit grades
   - View student lists
   - View submissions

### Main Features

- User authentication and session management
- Multi-tenant support (multiple schools)
- Teacher management
- Student management
- Grade submission and tracking
- Data import (teachers and students)
- Lookup management (grades, sections, subjects)
- Assignment management

## Default Credentials

**Super Admin:**
- Username: `super.admin`
- Password: `Admin@123`

## API Integration

The frontend communicates with the backend API using the Fetch API. The base URL is configured via the `VITE_API_BASE` environment variable.

### API Base Configuration

In development:
```env
VITE_API_BASE=http://localhost:3000
```

In production:
```env
VITE_API_BASE=https://your-backend-api.com
```

## Deployment

### Build for Production

```bash
npm run build
```

### Deploy to Static Hosting

The `dist/` directory can be deployed to any static hosting service:

#### Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist
```

Or connect your GitHub repository in the Netlify dashboard.

#### Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

Or connect your GitHub repository in the Vercel dashboard.

#### Cloudflare Pages

1. Connect GitHub repository
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Add environment variable: `VITE_API_BASE`

#### GitHub Pages

```bash
# Build
npm run build

# Deploy (requires gh-pages package)
npm install -g gh-pages
gh-pages -d dist
```

### Environment Variables in Production

Make sure to set `VITE_API_BASE` to your production backend URL in your hosting platform's environment variables.

## Development Tips

### Hot Module Replacement

Vite provides instant hot module replacement. Changes to your code will be reflected immediately in the browser without a full page reload.

### Browser DevTools

- Open DevTools (F12)
- Check Console for errors
- Check Network tab for API calls
- Use React DevTools extension

### API Debugging

The application logs API base configuration to the console on startup:
```javascript
console.log('Environment:', {
  VITE_API_BASE: import.meta.env.VITE_API_BASE,
  PROD: import.meta.env.PROD,
  MODE: import.meta.env.MODE,
  apiBase: apiBase
});
```

## Troubleshooting

### Cannot Connect to Backend

1. Verify backend is running:
   ```bash
   curl http://localhost:3000/health
   ```

2. Check `VITE_API_BASE` in `.env`

3. Check browser console for CORS errors

### CORS Errors

Ensure the backend's `FRONTEND_ORIGIN` includes your frontend URL:
```env
# In backend/.env
FRONTEND_ORIGIN=http://localhost:5173
```

### Build Errors

```bash
# Clear cache and reinstall
rm -rf node_modules dist
npm install
npm run build
```

### Port Already in Use

```bash
# Find process using port 5173
lsof -i :5173

# Kill the process
kill -9 <PID>
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Performance

- Vite provides fast cold starts
- Hot module replacement for instant updates
- Optimized production builds with code splitting
- Asset optimization and minification

## Code Style

- Use functional components with hooks
- Follow React best practices
- Keep components small and focused
- Use meaningful variable names
- Comment complex logic

## Testing

Currently, the application uses manual testing. To test:

1. Start backend server
2. Start frontend dev server
3. Login with test credentials
4. Test all features manually

## Future Enhancements

- Add unit tests (Jest + React Testing Library)
- Add E2E tests (Playwright or Cypress)
- Add TypeScript
- Add component library (Material-UI or Ant Design)
- Add state management (Redux or Zustand)
- Add form validation library (React Hook Form)
- Add internationalization (i18n)

## License

Private - All rights reserved
