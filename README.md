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

### Prerequisites
- Go 1.21 or higher
- Node.js 18 or higher
- MySQL 8

### Database Setup

1. Create a MySQL database:
```sql
CREATE DATABASE chat_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. Update database credentials in `server/.env` (copy from `.env.example`):
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=chat_db
JWT_SECRET=your-secret-key
SERVER_PORT=8080
```

### Backend Setup

```bash
cd server
go mod tidy
go run main.go
```

The server will start on `http://localhost:8080` and automatically create database tables.

### Frontend Setup

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
├── server/                 # Go backend
│   ├── config/            # Configuration
│   ├── handlers/          # HTTP handlers
│   ├── middleware/        # Middleware (auth, CORS)
│   ├── models/            # Database models
│   ├── utils/             # Utility functions
│   ├── websocket/         # WebSocket hub and client
│   └── main.go            # Entry point
│
└── frontend/              # React frontend
    ├── src/
    │   ├── components/    # React components
    │   ├── context/       # React context providers
    │   ├── pages/         # Page components
    │   ├── services/      # API services
    │   ├── App.jsx        # Root component
    │   └── main.jsx       # Entry point
    └── package.json
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
