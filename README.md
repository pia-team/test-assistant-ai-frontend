# Test Assistant AI - Next.js Frontend

Modern web application for automated test generation and execution.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Auth**: NextAuth.js + Keycloak
- **State**: TanStack Query (React Query)
- **Icons**: Lucide React
- **Toast**: Sonner
- **i18n**: Cookie-based (TR/EN)

## Getting Started

### Prerequisites

- Node.js 20+
- npm or pnpm
- Keycloak server configured

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Edit .env.local with your values
```

### Environment Variables

```env
KEYCLOAK_CLIENT_SECRET=your-keycloak-client-secret
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-key
API_URL=http://localhost:8093
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Production Build

```bash
npm run build
npm start
```

### Docker

```bash
# Build image
docker build -t test-assistant-ai-nextjs .

# Run container
docker run -p 3000:3000 \
  -e KEYCLOAK_CLIENT_SECRET=xxx \
  -e NEXTAUTH_SECRET=xxx \
  -e API_URL=http://backend:8093 \
  test-assistant-ai-nextjs
```

## Project Structure

```
src/
├── app/
│   ├── (protected)/     # Auth-guarded routes
│   │   ├── page.tsx           # Home
│   │   ├── test-run/          # Test execution
│   │   └── upload-json/       # JSON upload
│   ├── login/            # Login page
│   ├── api/auth/         # NextAuth handlers
│   ├── actions/          # Server Actions
│   └── layout.tsx        # Root layout
├── components/
│   ├── ui/              # shadcn components
│   ├── navbar.tsx
│   └── providers.tsx
├── lib/
│   ├── auth.ts          # NextAuth config
│   ├── i18n.ts          # i18n helpers
│   └── utils.ts
├── locales/
│   ├── tr.json
│   └── en.json
└── types/
```

## Features

- 🔐 Keycloak SSO Authentication
- 🌍 Multi-language support (TR/EN)
- 🌙 Dark/Light theme
- ⚡ Server-side rendering
- 📦 React Query caching
- 🐳 Docker ready

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
