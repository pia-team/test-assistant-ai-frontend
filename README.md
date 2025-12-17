# Test Assistant AI - Frontend Application

The frontend user interface for the Test Assistant AI system. A modern, responsive web application built with Next.js 16, designed to provide a seamless experience for managing and executing automated tests.

## 🛠 Tech Stack

- **Core Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4, shadcn/ui components
- **Authentication**: NextAuth.js v5 (Beta) integrated with Keycloak
- **State Management**: TanStack Query (React Query)
- **UI Components**: Radix UI primitives, Lucide React icons, Sonner toasts
- **Internationalization**: Custom cookie-based solution (TR/EN)

## 🚀 Getting Started

### Prerequisites

- **Node.js 20** or higher
- **npm** or **pnpm**
- **Keycloak Server**: Must be running and configured for authentication.

### Configuration (.env.local)

Create a `.env.local` file in the root of the frontend directory with the following variables:

```properties
# Authentication (Keycloak)
KEYCLOAK_CLIENT_ID=test-assistant-frontend
KEYCLOAK_CLIENT_SECRET=your_client_secret_here
KEYCLOAK_ISSUER=http://localhost:8080/realms/test-realm

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_generated_secret_key

# Backend API
NEXT_PUBLIC_API_URL=http://localhost:8093
```

### Installation

Install the dependencies:

```bash
npm install
```

### Running Development Server

Start the application in development mode with TurboPack:

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the application.

## 🏗 Project Structure

```
src/
├── app/                  # Next.js App Router pages
│   ├── (protected)/      # Routes requiring authentication
│   ├── api/              # API Routes (NextAuth, etc.)
│   ├── login/            # Public login page
│   └── layout.tsx        # Root application layout
├── components/           # React components
│   ├── ui/               # Reusable UI components (buttons, inputs)
│   └── ...               # Feature-specific components
├── lib/                  # Utilities and configurations
│   ├── auth.ts           # Authentication logic
│   └── utils.ts          # Helper functions
├── locales/              # Translation files (tr.json, en.json)
└── types/                # TypeScript type definitions
```

## ✨ Key Features

- **Secure Authentication**: Protected routes and API calls using Keycloak and NextAuth.
- **Dynamic Test Management**: Create, edit, and run test scenarios via an intuitive UI.
- **Real-time Feedback**: Instant toasts and status updates using Sonner and React Query.
- **Responsive Design**: Fully responsive layout optimized for desktop and tablet.
- **Dark/Light Mode**: Built-in theme switching support.
- **Multi-language**: Switch between English and Turkish dynamically.

## 📦 Docker Support

To build and run the frontend as a Docker container:

```bash
# Build
docker build -t test-assistant-frontend .

# Run
docker run -p 3000:3000 test-assistant-frontend
```

## 📜 Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Starts the dev server with TurboPack |
| `npm run build` | Builds the application for production |
| `npm start` | Starts the production server |
| `npm run lint` | Runs ESLint for code quality |
