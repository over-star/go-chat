# AGENTS.md - Agent Instructions for Chat Application

This file contains build commands, testing instructions, and code style guidelines for agents working on this project.

## Build Commands

### Backend (Go)
```bash
cd server
go mod tidy                    # Install/update dependencies
go run main.go                 # Start development server (auto-migrates DB)
go build -o chat-server.exe    # Build production binary
```

### Frontend (React)
```bash
cd frontend
npm install                    # Install dependencies
npm run dev                    # Start dev server (http://localhost:5173)
npm run build                  # Build for production
npm run preview                # Preview production build
```

## Testing

No tests currently exist in this codebase. When adding tests:
- Backend: Use Go's standard testing framework (`go test ./...`)
- Frontend: Consider Vitest or React Testing Library

## Code Style Guidelines

### Backend (Go)

#### Imports
- Group imports in standard library, third-party, local order
- Use module path `chat-server` for local imports
- Example: `import ("fmt"; "github.com/gin-gonic/gin"; "chat-server/models")`

#### Naming Conventions
- Package names: lowercase, single word (`handlers`, `models`, `utils`)
- Structs: PascalCase (`AuthHandler`, `User`, `Message`)
- Methods: PascalCase when exported, camelCase when unexported
- Variables: camelCase, use descriptive names
- Constants: PascalCase or UPPER_SNAKE_CASE for globals
- Interfaces: typically named with -er suffix (`http.Handler`)

#### Formatting
- Use `gofmt` (Go standard formatter)
- 4-space indentation (Go standard)
- Exported structs should have JSON tags (`json:"field_name"`)
- Use `omitempty` for optional JSON fields
- Sensitive fields should use `json:"-"` to exclude from JSON

#### Error Handling
- Always check errors from function calls
- Use structured error responses via `utils.ErrorResponse()`
- Detailed errors: `utils.DetailedErrorResponse(code, message, errorCode, details)`
- Error codes defined in `utils/common.go`: `ErrCodeValidation`, `ErrCodeAuth`, etc.
- Return HTTP status codes: 400 (bad request), 401 (unauthorized), 404 (not found), 500 (server error)

#### Handlers
- Create struct-based handlers (`type AuthHandler struct{}`)
- Constructor: `func NewAuthHandler() *AuthHandler`
- Use Gin's `c.ShouldBindJSON(&req)` for request body binding
- Validate requests struct tags: `binding:"required,email,min=6,max=50"`
- Always return standardized response: `utils.SuccessResponse(data)` or error response

#### Models
- Use GORM tags: `gorm:"primarykey"`, `gorm:"uniqueIndex"`, `gorm:"not null"`
- Include timestamps: `CreatedAt time.Time`, `UpdatedAt time.Time`
- Soft delete: `DeletedAt gorm.DeletedAt` with `json:"-"`
- Create response DTOs: `UserResponse`, `MessageResponse`
- Add `ToResponse()` method to convert model to DTO

#### Middleware
- Use Gin middleware pattern: `func AuthMiddleware() gin.HandlerFunc`
- Set context values: `c.Set("user_id", userID)`
- Abort on auth failure: `c.Abort()`, `return`

#### Database
- Access via global config: `config.AppConfig.DB`
- Auto-migration in `main.go`: `db.AutoMigrate(&models.User{}, ...)`
- Use GORM query methods: `Where()`, `First()`, `Create()`, `Find()`

#### WebSocket
- Hub pattern for managing connections
- Client struct with ReadPump/WritePump goroutines
- Use `go` keyword for concurrent operations

### Frontend (React)

#### File Structure
- Components: `src/components/ComponentName.jsx`
- Pages: `src/pages/PageName.jsx`
- Services: `src/services/serviceName.js`
- Context: `src/context/ContextName.jsx`
- UI components: `src/components/ui/uiName.jsx`

#### Components
- Functional components with hooks
- Props destructuring: `function Message({ message, isOwn, roomMembers })`
- Export default components
- Use `className` (not `class`) for CSS classes
- Conditional rendering with ternary operators: `{isOwn ? <Check /> : <CheckCheck />}`

#### Styling
- Tailwind CSS utility classes
- Use `cn()` from `lib/utils` for className merging (wrapper around clsx + tailwind-merge)
- Responsive design: `w-full max-w-md`, `md:w-1/2`
- Dark mode support via CSS variables (`hsl(var(--background))`)
- Spacing: `gap-3`, `p-4`, `my-2`, etc.
- Colors: `bg-primary`, `text-foreground`, `border-border`
- Rounded corners: `rounded-lg`, `rounded-full`

#### State Management
- useState hooks: `const [loading, setLoading] = useState(false)`
- Context providers: `AuthProvider`, `WebSocketProvider`
- Use custom hooks from context: `const { login, user } = useAuth()`

#### API Calls
- Use axios via `api.js` (configured with baseURL and auth interceptor)
- Service pattern: `authService.js`, `userService.js`
- JWT stored in localStorage, added to Authorization header automatically
- Handle 401 globally (redirect to login, clear tokens)
- Error handling via `errorHandler.error()` toast notifications

#### Forms
- Controlled components with useState
- Form submission: `onSubmit={handleSubmit}`, prevent default
- Validation: `required` attribute, client-side checks
- Loading states: disable submit buttons during async operations

#### Routing
- React Router v6: `BrowserRouter`, `Routes`, `Route`, `Navigate`
- Protected routes: wrapper component checking auth status
- Navigation: `useNavigate()` hook or `Navigate` component
- Link to routes: `<Link to="/register">`

#### UI Components
- Radix UI primitives for accessible components
- Use `lucide-react` for icons
- Component imports: `import { Button } from '../components/ui/button'`
- Consistent styling across UI components

## Architecture Patterns

### Backend
- Handler -> Model/Service -> Database flow
- Middleware for cross-cutting concerns (auth, CORS)
- WebSocket hub pattern for real-time communication
- JWT stateless authentication

### Frontend
- Component-based architecture
- Context for global state (auth, WebSocket)
- Service layer for API abstraction
- Error boundary not currently implemented

## Configuration

### Environment Variables (Backend)
Location: `server/.env`
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `JWT_SECRET` (must be changed in production)
- `SERVER_PORT` (default: 8081)
- `UPLOAD_PATH` (default: ./uploads)

### CORS
Frontend origins allowed: `http://localhost:5173`, `http://localhost:3000`

## Important Notes

- Database auto-migrates on backend startup
- WebSocket requires JWT token as query parameter
- File uploads stored in `server/uploads/` directory
- All protected API routes require JWT in Authorization header
- Frontend expects backend at `http://localhost:8081`
- Dark mode enabled via Tailwind class strategy
