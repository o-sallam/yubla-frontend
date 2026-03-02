# Frontend Deployment Guide

This guide covers deploying the Yubla frontend to various static hosting platforms.

## Prerequisites

- Git repository with frontend code
- Backend API deployed and accessible
- Node.js 18+ for building

## Environment Variables

Set this environment variable before building:

```env
VITE_API_BASE=https://your-backend-api.com
```

**Important:** Do NOT include trailing slash in the URL.

## Build for Production

```bash
cd frontend
npm install
npm run build
```

This creates a `dist/` directory with optimized static files.

## Netlify

### Via CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
cd frontend
npm run build
netlify deploy --prod --dir=dist
```

### Via Dashboard

1. Go to [netlify.com](https://netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Connect GitHub repository
4. Configure:
   - Base directory: `frontend`
   - Build command: `npm run build`
   - Publish directory: `frontend/dist`
5. Add environment variable:
   - Key: `VITE_API_BASE`
   - Value: `https://your-backend-api.com`
6. Deploy

### Netlify Configuration

Create `frontend/netlify.toml`:

```toml
[build]
  base = "frontend"
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  NODE_VERSION = "18"
```

## Vercel

### Via CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
cd frontend
vercel --prod
```

### Via Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New" → "Project"
3. Import GitHub repository
4. Configure:
   - Framework Preset: Vite
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. Add environment variable:
   - Name: `VITE_API_BASE`
   - Value: `https://your-backend-api.com`
6. Deploy

### Vercel Configuration

Create `frontend/vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

## Cloudflare Pages

### Via Dashboard

1. Go to [pages.cloudflare.com](https://pages.cloudflare.com)
2. Click "Create a project"
3. Connect GitHub repository
4. Configure:
   - Project name: `yubla-frontend`
   - Production branch: `main`
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: `frontend`
5. Add environment variable:
   - Variable name: `VITE_API_BASE`
   - Value: `https://your-backend-api.com`
6. Save and Deploy

### Cloudflare Configuration

Create `frontend/_redirects`:

```
/*    /index.html   200
```

## GitHub Pages

### Setup

```bash
# Install gh-pages
npm install -g gh-pages

# Build
cd frontend
npm run build

# Deploy
gh-pages -d dist
```

### GitHub Actions

Create `.github/workflows/deploy-frontend.yml`:

```yaml
name: Deploy Frontend

on:
  push:
    branches: [main]
    paths:
      - 'frontend/**'

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install and Build
        run: |
          cd frontend
          npm ci
          npm run build
        env:
          VITE_API_BASE: ${{ secrets.VITE_API_BASE }}
      
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./frontend/dist
```

Add `VITE_API_BASE` to repository secrets.

## AWS S3 + CloudFront

### S3 Setup

```bash
# Install AWS CLI
# https://aws.amazon.com/cli/

# Configure
aws configure

# Create bucket
aws s3 mb s3://yubla-frontend

# Enable static website hosting
aws s3 website s3://yubla-frontend \
  --index-document index.html \
  --error-document index.html

# Build and upload
cd frontend
npm run build
aws s3 sync dist/ s3://yubla-frontend --delete

# Make public
aws s3api put-bucket-policy --bucket yubla-frontend --policy '{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicReadGetObject",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::yubla-frontend/*"
  }]
}'
```

### CloudFront Setup

1. Go to CloudFront console
2. Create distribution
3. Origin: S3 bucket
4. Default root object: `index.html`
5. Error pages: 404 → /index.html (200)

## Firebase Hosting

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Initialize
cd frontend
firebase init hosting

# Configure:
# - Public directory: dist
# - Single-page app: Yes
# - GitHub deploys: Optional

# Build
npm run build

# Deploy
firebase deploy --only hosting
```

### Firebase Configuration

`frontend/firebase.json`:

```json
{
  "hosting": {
    "public": "dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

## Azure Static Web Apps

```bash
# Install Azure CLI
# https://docs.microsoft.com/en-us/cli/azure/install-azure-cli

# Login
az login

# Create resource group
az group create --name yubla-rg --location eastus

# Create static web app
az staticwebapp create \
  --name yubla-frontend \
  --resource-group yubla-rg \
  --source https://github.com/yourusername/yubla \
  --location eastus \
  --branch main \
  --app-location "frontend" \
  --output-location "dist"
```

## DigitalOcean App Platform

1. Go to [cloud.digitalocean.com](https://cloud.digitalocean.com)
2. Create → Apps → GitHub
3. Select repository
4. Configure:
   - Type: Static Site
   - Source Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. Add environment variable: `VITE_API_BASE`
6. Deploy

## Custom Domain Setup

### Netlify

1. Go to Site settings → Domain management
2. Add custom domain
3. Configure DNS:
   ```
   CNAME www your-site.netlify.app
   A     @   75.2.60.5
   ```

### Vercel

1. Go to Project settings → Domains
2. Add domain
3. Configure DNS as instructed

### Cloudflare Pages

1. Go to Custom domains
2. Add domain
3. DNS automatically configured if using Cloudflare DNS

## SSL/HTTPS

All platforms provide automatic SSL certificates:
- Netlify: Let's Encrypt (automatic)
- Vercel: Let's Encrypt (automatic)
- Cloudflare: Cloudflare SSL (automatic)
- AWS: ACM certificate (manual setup)

## Performance Optimization

### Build Optimization

Already configured in `vite.config.js`:
- Code splitting
- Asset optimization
- Minification
- Tree shaking

### CDN

Most platforms include CDN:
- Netlify: Global CDN
- Vercel: Edge Network
- Cloudflare: Global CDN
- AWS CloudFront: Global CDN

### Caching

Configure cache headers (platform-specific):

**Netlify** (`_headers`):
```
/assets/*
  Cache-Control: public, max-age=31536000, immutable

/*.html
  Cache-Control: public, max-age=0, must-revalidate
```

**Vercel** (`vercel.json`):
```json
{
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

## Environment-Specific Builds

### Multiple Environments

**Staging:**
```env
VITE_API_BASE=https://staging-api.yourdomain.com
```

**Production:**
```env
VITE_API_BASE=https://api.yourdomain.com
```

### Branch Deployments

Most platforms support branch deployments:
- `main` → Production
- `develop` → Staging
- Feature branches → Preview

## Post-Deployment

### Verify Deployment

1. Visit your deployed URL
2. Check browser console for errors
3. Test login functionality
4. Verify API calls work
5. Test all features

### Common Issues

**API calls fail:**
- Check `VITE_API_BASE` is set correctly
- Verify backend CORS allows your domain
- Check browser console for errors

**404 on refresh:**
- Configure SPA redirects (see platform sections above)

**Assets not loading:**
- Check build output directory is correct
- Verify asset paths in build

## Monitoring

### Analytics

Add analytics to `index.html`:

**Google Analytics:**
```html
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

**Plausible:**
```html
<script defer data-domain="yourdomain.com" src="https://plausible.io/js/script.js"></script>
```

### Error Tracking

**Sentry:**
```bash
npm install @sentry/react
```

Configure in `src/main.jsx`:
```javascript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  environment: import.meta.env.MODE,
});
```

### Uptime Monitoring

- **UptimeRobot:** Free monitoring
- **Pingdom:** Paid monitoring
- **StatusCake:** Free tier

## Rollback

### Netlify
```bash
netlify rollback
```

### Vercel
Dashboard → Deployments → Previous deployment → Promote to Production

### GitHub Pages
```bash
git revert HEAD
git push
```

## Cost Estimates

- **Netlify:** Free (100GB bandwidth/month)
- **Vercel:** Free (100GB bandwidth/month)
- **Cloudflare Pages:** Free (unlimited bandwidth)
- **GitHub Pages:** Free
- **AWS S3 + CloudFront:** ~$1-5/month
- **Firebase:** Free (10GB storage, 360MB/day transfer)

## Continuous Deployment

All platforms support automatic deployment on git push:

1. Connect GitHub repository
2. Configure build settings
3. Push to main branch
4. Automatic build and deploy

## Support

For deployment issues:
- Check platform documentation
- Review build logs
- Verify environment variables
- Test locally with production build
- Check browser console for errors
