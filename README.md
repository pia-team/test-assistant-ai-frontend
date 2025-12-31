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
NEXT_PUBLIC_API_URL=http://localhost:8080
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

### Development Build

For local development with default values:

```bash
docker build -t test-assistant-frontend:dev .
docker run -p 3000:3000 test-assistant-frontend:dev
```

### Test Environment Build

Build with test environment configuration:

```bash
docker build \
  --build-arg NEXT_PUBLIC_SOCKET_URL=https://test-asistant-ai-be.dnext-pia.com/socket \
  --build-arg NEXT_PUBLIC_KEYCLOAK_URL=https://diam.dnext-pia.com \
  --build-arg NEXT_PUBLIC_KEYCLOAK_REALM=orbitant-realm \
  --build-arg NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=orbitant-ui-client \
  -t test-assistant-frontend:test .

docker run -p 3000:3000 test-assistant-frontend:test
```

### Production Environment Build

```bash
docker build \
  --build-arg NEXT_PUBLIC_SOCKET_URL=<PRODUCTION_SOCKET_URL> \
  --build-arg NEXT_PUBLIC_KEYCLOAK_URL=<PRODUCTION_KEYCLOAK_URL> \
  --build-arg NEXT_PUBLIC_KEYCLOAK_REALM=<PRODUCTION_REALM> \
  --build-arg NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=<PRODUCTION_CLIENT_ID> \
  -t test-assistant-frontend:prod .
```

### Build Arguments Reference

| Argument                         | Description                                | Default                      |
| -------------------------------- | ------------------------------------------ | ---------------------------- |
| `NEXT_PUBLIC_SOCKET_URL`         | Socket.io server URL for real-time updates | `http://localhost:8080`      |
| `NEXT_PUBLIC_KEYCLOAK_URL`       | Keycloak authentication server URL         | `https://diam.dnext-pia.com` |
| `NEXT_PUBLIC_KEYCLOAK_REALM`     | Keycloak realm name                        | `orbitant-realm`             |
| `NEXT_PUBLIC_KEYCLOAK_CLIENT_ID` | Keycloak client ID                         | `orbitant-ui-client`         |

> **Important**: `NEXT_PUBLIC_*` variables are inlined at build time. You must rebuild the image to change these values.

## 🔄 CI/CD Integration

### Required CI/CD Variables

Configure these variables in your CI/CD pipeline (GitLab CI, Jenkins, GitHub Actions, etc.):

| Variable             | Description           | Example                                            |
| -------------------- | --------------------- | -------------------------------------------------- |
| `SOCKET_URL`         | Backend Socket.io URL | `https://test-asistant-ai-be.dnext-pia.com/socket` |
| `KEYCLOAK_URL`       | Keycloak server URL   | `https://diam.dnext-pia.com`                       |
| `KEYCLOAK_REALM`     | Keycloak realm        | `orbitant-realm`                                   |
| `KEYCLOAK_CLIENT_ID` | Keycloak client ID    | `orbitant-ui-client`                               |

### GitLab CI Example

```yaml
build:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  script:
    - docker build
      --build-arg NEXT_PUBLIC_SOCKET_URL=$SOCKET_URL
      --build-arg NEXT_PUBLIC_KEYCLOAK_URL=$KEYCLOAK_URL
      --build-arg NEXT_PUBLIC_KEYCLOAK_REALM=$KEYCLOAK_REALM
      --build-arg NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=$KEYCLOAK_CLIENT_ID
      -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
```

### GitHub Actions Example

```yaml
- name: Build Docker image
  run: |
    docker build \
      --build-arg NEXT_PUBLIC_SOCKET_URL=${{ secrets.SOCKET_URL }} \
      --build-arg NEXT_PUBLIC_KEYCLOAK_URL=${{ secrets.KEYCLOAK_URL }} \
      --build-arg NEXT_PUBLIC_KEYCLOAK_REALM=${{ secrets.KEYCLOAK_REALM }} \
      --build-arg NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=${{ secrets.KEYCLOAK_CLIENT_ID }} \
      -t myapp:${{ github.sha }} .
```

### Jenkins Example

```groovy
stage('Build') {
    steps {
        sh '''
            docker build \
                --build-arg NEXT_PUBLIC_SOCKET_URL=${SOCKET_URL} \
                --build-arg NEXT_PUBLIC_KEYCLOAK_URL=${KEYCLOAK_URL} \
                --build-arg NEXT_PUBLIC_KEYCLOAK_REALM=${KEYCLOAK_REALM} \
                --build-arg NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=${KEYCLOAK_CLIENT_ID} \
                -t test-assistant-frontend:${BUILD_NUMBER} .
        '''
    }
}
```

### Rollback Procedure

If issues occur after deployment:

1. **Quick Fix**: Deploy previous image version from registry
2. **Rebuild**: Run pipeline with corrected environment variables
3. **Verify**: Check browser DevTools → Network tab for correct WebSocket URL

## 📜 Scripts

| Script          | Description                           |
| --------------- | ------------------------------------- |
| `npm run dev`   | Starts the dev server with TurboPack  |
| `npm run build` | Builds the application for production |
| `npm start`     | Starts the production server          |
| `npm run lint`  | Runs ESLint for code quality          |
