# React Tic Tac Toe

A simple Tic Tac Toe game built with React. Play it directly in your browser!

## Features

- Interactive 3x3 game board
- Turn-based gameplay alternating between X and O
- Win detection for rows, columns, and diagonals
- Draw detection when no more moves are possible
- Restart button to begin a new game
- Clean, responsive design

## How to Play

1. Click any empty square to place your mark (X or O)
2. Take turns with another player
3. Get three in a row (horizontally, vertically, or diagonally) to win
4. Click "Restart Game" to start a new game

## Play with GitHub Codespaces

This project is configured to run instantly in GitHub Codespaces:

1. Visit [https://github.com/markjspivey-xwisee/react-tic-tac-toe](https://github.com/markjspivey-xwisee/react-tic-tac-toe)
2. Click the green "Code" button
3. Select the "Codespaces" tab
4. Click "Create codespace on main"
5. Wait for the environment to set up (this takes about a minute)
6. The server will start automatically and a browser preview will open
7. Start playing!

The game will be running at port 8000, and Codespaces will automatically forward this port and open it in your browser.

## Development

This project uses vanilla React with no build tools, making it easy to run and modify.

### Running Locally

1. Clone the repository
```bash
git clone https://github.com/markjspivey-xwisee/react-tic-tac-toe.git
cd react-tic-tac-toe
```

2. Start a local HTTP server
```bash
python -m http.server 8000
```

3. Open `http://localhost:8000` in your browser

## Project Structure

- `index.html` - The main HTML file that loads React and our game
- `app.js` - The React components and game logic
- `styles.css` - All the styling for the game
- `.devcontainer/` - Configuration for GitHub Codespaces
