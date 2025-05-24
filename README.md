# ♟️ Chess Game Frontend

This is the frontend for a full-featured multiplayer and AI chess application, built using **React**, **react-chessboard** and **chess.js** with **real-time WebSocket**.

## 🎮 Game Modes

1. **Play vs Computer (Stockfish)**
   - Features: Undo, Resign

2. **Play Local (Two players on one device)**
   - Feature: Undo

3. **Play Multiplayer**
   - Random or Invite Code-based matchmaking
   - Real-time Chat
   - Offer/Accept/Reject Draw
   - Timer Mode (1, 3, 5, 10, 30 minutes)
   - Invite Code Generation and Entry
   - Requires Login (or Guest access)

## ✨ Features

- Login and Signup with Play as Guest options
- Chessboard supports drag-and-drop and click-to-move
- Real-time multiplayer using WebSockets
- Mobile-friendly responsive UI
- Sound effects:
  - Self move, Opponent move
  - Capture, Promotion, Castling
  - Game Start/End, Illegal Move, Check
- Chess.com-style logo in header
- Complete input validation on all forms

## 🛠️ Tech Stack

- React
- react-chessboard
- chess.js
- WebSocket (`ws`)
- Tailwind CSS
- React Router

## ⚙️ Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/vaibhav1565/Chess-frontend
cd Chess-frontend
```

### 2. Install Dependencies
```bash
npm ci
```

### 3. Start the Development Server
```bash
npm run dev
```

### 4. Have the [Chess-backend](https://github.com/vaibhav1565/Chess-backend) running for multiplayer functionality.