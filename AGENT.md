# LaPointe App Agent Instructions

## Build/Test/Lint Commands
- **Backend**: `cd backend && npm run dev` (starts with nodemon)
- **Frontend**: `cd frontend && npm run dev` (Vite dev server)
- **Frontend Build**: `cd frontend && npm run build`
- **Frontend Lint**: `cd frontend && npm run lint`
- **Frontend Preview**: `cd frontend && npm run preview`

## Architecture
- **Stack**: React + Vite frontend, Express + MongoDB backend
- **Database**: MongoDB with Mongoose ODM
- **Auth**: JWT with bcrypt password hashing
- **Backend structure**: `/controllers`, `/middleware`, `/models`, `/routes`
- **Frontend structure**: Vite React app with Tailwind CSS

## Code Style
- **ES Modules**: Use `import/export` syntax (both frontend/backend)
- **Backend**: Express.js with async/await, Mongoose models with schema validation
- **Frontend**: React functional components with hooks, ESLint with React plugins
- **Naming**: camelCase for variables/functions, PascalCase for components
- **Database**: Mongoose schemas with validation, enum fields where appropriate
- **Error handling**: Try/catch blocks, proper HTTP status codes
- **Environment**: Use `.env` files for sensitive config (backend)
