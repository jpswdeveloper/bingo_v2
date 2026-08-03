# Melkam Bingo - Premium Bingo Social Experience

A modern, real-time bingo gaming platform built with Next.js 16, featuring crypto/ETB payments, live gameplay, and a premium user experience.

## Features

### Home/Lobby Page
- **Live Platform Activity Feed** - Real-time updates of player joins and wins
- **Active Players Counter** - Visual display of current active users
- **Multiple Stake Lobbies** - Choose from different stake levels (10 ETB, 20 ETB, High Roller)
- **Lobby Statistics** - View active lobbies, player counts, and capacity
- **Security Features** - RNG Certified and Instant Payout badges
- **Responsive Design** - Grid and list view options for lobby selection

### Live Game Page
- **Real-time Ball Drawing** - Animated ball drawer with current number display
- **Interactive Bingo Card** - 5x5 grid with automatic number marking
- **Recently Called Numbers** - Visual history of last 5 drawn numbers
- **Auto-Play Mode** - Automatic card marking feature
- **Game Statistics** - Session ID, live player count, current stake, and jackpot
- **Win Probability Tracker** - Real-time calculation of winning chances
- **Card Refresh** - Generate new cards during gameplay

## Tech Stack

- **Framework**: Next.js 16.2.12 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Icons**: Lucide React
- **Font**: Geist Sans & Geist Mono

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Build

```bash
npm run build
```

### Production

```bash
npm start
```

## Project Structure

```
bingo_v2/
├── app/
│   ├── game/
│   │   └── [id]/
│   │       └── page.tsx      # Live game interface
│   ├── layout.tsx             # Root layout with fonts
│   ├── page.tsx               # Home/lobby page
│   └── globals.css            # Global styles
├── public/                    # Static assets
└── package.json
```

## Pages

### Home (`/`)
The main lobby page where players can:
- View platform activity in real-time
- Check active player counts
- Select game lobbies by stake level
- View lobby statistics and capacity

### Game (`/game/[id]`)
The live gameplay interface featuring:
- Ball drawing animation
- Interactive bingo card
- Game controls (Auto-play, Refresh, Leave)
- Real-time statistics and probability tracking

## Design Features

- **Dark Theme** - Modern dark UI with gradient accents
- **Color-Coded Columns** - Each bingo column (B-I-N-G-O) has unique colors
- **Smooth Animations** - Pulse effects, transitions, and hover states
- **Responsive Layout** - Optimized for desktop gaming experience
- **Visual Feedback** - Clear indication of marked numbers and game state

## Customization

### Stake Levels
Modify the `lobbies` array in `app/page.tsx` to add or change stake levels.

### Bingo Card
Update the `bingoCard` state in `app/game/[id]/page.tsx` to customize card layout.

### Theme Colors
Edit `app/globals.css` to adjust the color scheme.

## Future Enhancements

- [ ] Real-time multiplayer with WebSocket
- [ ] User authentication and profiles
- [ ] Wallet integration for ETB/crypto payments
- [ ] Game history and statistics
- [ ] Chat functionality
- [ ] Multiple card play
- [ ] Win patterns validation
- [ ] Sound effects and animations
- [ ] Mobile responsive design
- [ ] Leaderboard system

## License

Private - All rights reserved

## Support

For issues and questions, contact the development team.
