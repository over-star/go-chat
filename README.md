# Chat Application

A full-featured real-time chat application built with Go (backend) and React (frontend).

## Features

- 🔐 User authentication (register/login)
- 💬 Private and group chats
- 📁 File and image sharing
- ✓ Message read receipts
- @️ User mentions in group chats
- 🔄 Multi-device sync via WebSocket
- 👥 Friend management
- 📱 Responsive, modern UI with dark theme

## Tech Stack

### Backend
- **Language**: Go 1.21+
- **Framework**: Gin
- **ORM**: GORM
- **Database**: MySQL 8
- **WebSocket**: Gorilla WebSocket
- **Authentication**: JWT

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Router**: React Router
- **HTTP Client**: Axios
- **Icons**: Lucide React

## Setup Instructions

### Option 1: Docker Deployment (Recommended)

The easiest way to run the application is using Docker Compose. This will start the database, backend API, backend gateway, and frontend.

1. Ensure you have [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/) installed.
2. In the root directory, run:
   ```bash
   docker-compose up --build
   ```
3. Access the application:
   - **Frontend**: `http://localhost`
   - **Backend API**: `http://localhost/api`
   - **WebSocket Gateway**: `ws://localhost/ws`

### Option 2: Manual Setup

#### Prerequisites
- Go 1.21 or higher
- Node.js 18 or higher
- MySQL 8

#### Database Setup

1. Create a MySQL database:
```sql
CREATE DATABASE chat_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. Update configuration in `chat-backend/configs/config.yaml`.

#### Backend Setup

```bash
cd chat-backend
go mod tidy
# Run API service
go run cmd/im-api/main.go
# Run Gateway service (in another terminal)
go run cmd/im-gateway/main.go
```

- API Service: `http://localhost:8081`
- Gateway Service: `ws://localhost:8082`

#### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will start on `http://localhost:5173`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Users
- `GET /api/users/profile` - Get current user profile
- `GET /api/users/search?q=query` - Search users
- `GET /api/users/friends` - Get friends list
- `GET /api/users/friend-requests` - Get pending friend requests
- `POST /api/users/friends` - Send friend request
- `POST /api/users/friends/accept` - Accept friend request
- `DELETE /api/users/friends/:id` - Remove friend

### Rooms
- `GET /api/rooms` - Get user's rooms
- `GET /api/rooms/:id` - Get specific room
- `POST /api/rooms` - Create new room
- `POST /api/rooms/:id/leave` - Leave room
- `DELETE /api/rooms/:id` - Delete room (creator only)

### Messages
- `GET /api/rooms/:id/messages` - Get room messages
- `POST /api/messages/upload` - Upload file/image
- `POST /api/messages/read` - Mark messages as read

### WebSocket
- `GET /ws?user_id=X&token=JWT` - WebSocket connection

## Project Structure

```
chat/
├── chat-backend/           # Go backend
│   ├── cmd/                # Entry points (api, gateway)
│   ├── configs/            # Configuration files
│   ├── internal/           # Internal business logic
│   │   ├── app/            # Application layer
│   │   ├── domain/         # Domain models
│   │   ├── infrastructure/ # Persistence & external services
│   │   └── interfaces/     # HTTP & WebSocket interfaces
│   ├── pkg/                # Shared packages
│   └── Dockerfile          # Backend Docker config
│
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── context/        # Context providers
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   └── App.jsx         # Root component
│   ├── Dockerfile          # Frontend Docker config
│   └── nginx.conf          # Nginx production config
│
└── docker-compose.yml       # Docker orchestration
```

## Usage

1. **Register** a new account at `/register`
2. **Login** with your credentials
3. **Add friends** by searching usernames
4. **Start chatting**:
   - Click on a friend to start a private chat
   - Create a group chat with multiple friends
5. **Send messages**, images, and files
6. **@mention** users in group chats
7. Messages are automatically marked as read

## Development

- Backend auto-migrates database on startup
- Frontend has hot reload enabled
- WebSocket automatically reconnects on disconnection
- All API requests include JWT authentication

## License

MIT
