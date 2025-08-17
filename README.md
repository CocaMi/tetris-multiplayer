# Multiplayer Tetris Battle

A real-time multiplayer Tetris game with battle mode, tournaments, and power-ups built with React, Node.js, and Socket.IO.

## Features

### 🎮 Game Features
- **Real-time Multiplayer**: Battle against friends in real-time Tetris matches
- **Multiple Game Modes**:
  - **Battle Mode**: Send garbage lines to opponents when clearing multiple lines
  - **Classic Mode**: Traditional Tetris with highest score wins
  - **Tournament Mode**: Bracket-style competitions with multiple rounds
- **Power-ups**: Strategic abilities to gain advantages over opponents
- **Live Leaderboard**: Track top players and compete for high scores
- **Tournament System**: Organized tournaments with prizes and rankings

### 🎯 Power-ups
- **Clear Lines**: Instantly clear bottom lines from your board
- **Slow Opponent**: Temporarily slow down an opponent's piece movement
- **Add Garbage**: Send garbage lines to a specific opponent
- **Shield**: Protect yourself from incoming garbage lines

### 🏆 Tournament Features
- **Registration System**: Sign up for upcoming tournaments
- **Live Brackets**: View tournament progress in real-time
- **Prize Pools**: Compete for virtual currency and bragging rights
- **Multiple Tournament Types**: Weekly, monthly, and special events

## Tech Stack

### Frontend
- **React 18** with functional components and hooks
- **Socket.IO Client** for real-time communication
- **Tailwind CSS** for styling with custom Tetris theme
- **React Router** for navigation
- **Framer Motion** for animations
- **Canvas API** for game rendering

### Backend
- **Node.js** with Express
- **Socket.IO** for WebSocket connections
- **MongoDB** with Mongoose for data persistence
- **Redis** for caching and session management
- **JWT** for authentication (future implementation)

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- Redis (v6.0 or higher)
- npm or yarn

### Clone the Repository
```bash
git clone <repository-url>
cd tetris-multiplayer
```

### Install Dependencies
```bash
# Install both server and client dependencies
npm run install:all

# Or install separately
npm install
cd client
npm install
cd ..
```

### Environment Configuration
Create a `.env` file in the root directory (already provided):
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Client URL
CLIENT_URL=http://localhost:3000

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/tetris

# Redis Configuration
REDIS_URL=redis://localhost:6379

# JWT Secret
JWT_SECRET=your_jwt_secret_here

# Game Configuration
MAX_PLAYERS_PER_ROOM=6
GAME_TIMEOUT=30000
POWER_UP_CHANCE=0.3
```

### Start the Development Servers

#### Option 1: Start both servers simultaneously
```bash
npm run dev
```

#### Option 2: Start servers separately
```bash
# Terminal 1 - Start server
npm run server:dev

# Terminal 2 - Start client
npm run client:dev
```

### Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Socket.IO**: ws://localhost:5000

## Game Controls

### Keyboard Controls
- **← Arrow Key**: Move piece left
- **→ Arrow Key**: Move piece right
- **↓ Arrow Key**: Soft drop (piece falls faster)
- **↑ Arrow Key**: Rotate piece clockwise
- **Spacebar**: Hard drop (instant drop)

### Power-up Usage
- Click on power-up buttons in the side panel
- Select target opponent (if applicable)
- Power-ups are automatically consumed when used

## Game Rules

### Battle Mode
- Clear 2 or more lines to send garbage lines to opponents
- Number of garbage lines = cleared lines - 1
- Power-ups are awarded for clearing 2+ lines
- Last player standing wins

### Classic Mode
- Traditional Tetris scoring
- No garbage lines or power-ups
- Player with highest score when time expires wins

### Tournament Mode
- Single elimination bracket
- Best of 3 matches per round
- Winners advance to next round
- Final champion receives tournament rewards

## Scoring System

### Line Clear Points
- **1 line**: 100 points × level
- **2 lines**: 300 points × level
- **3 lines**: 500 points × level
- **4 lines (Tetris)**: 800 points × level

### Bonus Points
- **Soft drop**: 1 point per line
- **Hard drop**: 2 points per line

### Level Progression
- Level increases every 10 lines cleared
- Higher levels = more points per line clear

## Project Structure

```
tetris-multiplayer/
├── client/                 # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/    # React components
│   │   │   ├── App.js     # Main app component
│   │   │   ├── Lobby.js   # Game lobby
│   │   │   ├── GameRoom.js # Room waiting area
│   │   │   ├── TetrisGame.js # Main game component
│   │   │   ├── Leaderboard.js # Player rankings
│   │   │   └── Tournament.js # Tournament system
│   │   ├── App.css
│   │   ├── index.css
│   │   └── index.js
│   ├── package.json
│   └── tailwind.config.js
├── server/                # Node.js backend
│   └── index.js          # Main server file
├── package.json          # Root package.json
├── .env                  # Environment variables
└── README.md            # This file
```

## API Endpoints

### Game Rooms
- `GET /api/rooms` - Get list of public game rooms

### Leaderboard
- `GET /api/leaderboard` - Get player rankings
- `GET /api/leaderboard?period=all|monthly|weekly` - Get filtered rankings

### Socket.IO Events

#### Client to Server
- `player:join` - Join the game with username
- `room:create` - Create a new game room
- `room:join` - Join an existing room
- `game:move` - Send game move (left, right, rotate, drop, hard_drop)
- `powerup:use` - Use a power-up

#### Server to Client
- `player:joined` - Confirmation of player joining
- `room:created` - Room creation confirmation
- `room:joined` - Room join confirmation
- `room:full` - Room is full notification
- `room:not_found` - Room not found error
- `game:start` - Game starts notification
- `game:update` - Game state update
- `game:over` - Game over notification
- `powerup:used` - Power-up usage notification

## Development

### Adding New Features
1. **New Game Modes**: Extend the `GameRoom` class and add mode-specific logic
2. **New Power-ups**: Add to the `powerUps` array and implement in `handlePowerUp`
3. **Tournament Types**: Extend tournament system in `Tournament` component
4. **Authentication**: Implement JWT-based user system

### Code Style
- Use functional React components with hooks
- Follow ES6+ JavaScript standards
- Use Tailwind CSS classes for styling
- Implement proper error handling and validation
- Write comments for complex logic

### Testing
```bash
# Run client tests
cd client
npm test

# Run server tests (when implemented)
npm test
```

## Deployment

### Production Build
```bash
# Build client for production
npm run build

# Start production server
npm start
```

### Environment Requirements for Production
- MongoDB database
- Redis server
- Node.js production environment
- Proper environment variables configuration

## Troubleshooting

### Common Issues

#### Port Already in Use
- Check if port 5000 (server) or 3000 (client) is available
- Kill existing processes: `lsof -ti:5000 | xargs kill -9`

#### MongoDB Connection Issues
- Ensure MongoDB is running: `sudo systemctl start mongod`
- Check connection string in `.env` file
- Verify MongoDB is accessible on configured port

#### Redis Connection Issues
- Ensure Redis is running: `sudo systemctl start redis`
- Check Redis connection string in `.env` file
- Test Redis connection: `redis-cli ping`

#### Socket.IO Connection Issues
- Verify CORS settings in server configuration
- Check client URL in `.env` file
- Ensure WebSocket connections are not blocked by firewall

## Future Enhancements

### Planned Features
- [ ] User accounts and profiles
- [ ] Friends system and private messaging
- [ ] Game replay system
- [ ] Spectator mode
- [ ] Mobile app version
- [ ] AI opponents for practice
- [ ] Custom game rooms with advanced settings
- [ ] Achievements and badges system
- [ ] In-game chat system
- [ ] Team battle mode

### Technical Improvements
- [ ] Add comprehensive test suite
- [ ] Implement database migrations
- [ ] Add rate limiting and security measures
- [ ] Optimize game performance for large rooms
- [ ] Add logging and monitoring
- [ ] Implement automated deployment pipeline

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue in the GitHub repository
- Check the troubleshooting section above
- Review the code comments for implementation details

---

**Built with ❤️ using modern web technologies**
