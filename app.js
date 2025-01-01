function TicTacToe() {
    const [board, setBoard] = React.useState(Array(9).fill(null));
    const [isX, setIsX] = React.useState(true);
    const [winner, setWinner] = React.useState(null);
    const [gameId, setGameId] = React.useState('');
    const [gameMode, setGameMode] = React.useState('menu');
    const [playerSymbol, setPlayerSymbol] = React.useState(null);
    const [error, setError] = React.useState(null);
    const [isMyTurn, setIsMyTurn] = React.useState(false);
    const [connecting, setConnecting] = React.useState(false);

    const database = firebase.database();

    React.useEffect(() => {
        if (gameId && gameMode === 'play') {
            const gameRef = database.ref(`games/${gameId}`);
            
            gameRef.on('value', (snapshot) => {
                const gameData = snapshot.val();
                if (gameData) {
                    setBoard(gameData.board);
                    setIsX(gameData.isX);
                    setWinner(gameData.winner);
                    setIsMyTurn(gameData.currentTurn === playerSymbol);
                }
            });

            // Clean up listener when component unmounts or game changes
            return () => {
                gameRef.off();
            };
        }
    }, [gameId, gameMode, playerSymbol]);

    const createGame = async () => {
        try {
            const newGameRef = database.ref('games').push();
            const gameData = {
                board: Array(9).fill(null),
                isX: true,
                winner: null,
                currentTurn: 'X',
                players: 1,
                createdAt: firebase.database.ServerValue.TIMESTAMP
            };
            
            await newGameRef.set(gameData);
            setGameId(newGameRef.key);
            setPlayerSymbol('X');
            setGameMode('host');
            setError(null);
            
            // Listen for second player
            const gameRef = database.ref(`games/${newGameRef.key}`);
            gameRef.on('value', (snapshot) => {
                const data = snapshot.val();
                if (data && data.players === 2) {
                    setGameMode('play');
                    setIsMyTurn(true);
                    gameRef.off();
                }
            });

            // Clean up old games
            const oldGames = database.ref('games').orderByChild('createdAt').endAt(Date.now() - 24 * 60 * 60 * 1000);
            oldGames.once('value', (snapshot) => {
                snapshot.forEach((childSnapshot) => {
                    childSnapshot.ref.remove();
                });
            });
        } catch (err) {
            console.error('Error creating game:', err);
            setError('Failed to create game. Please try again.');
        }
    };

    const joinGame = async () => {
        if (!gameId.trim()) {
            setError('Please enter a valid game ID.');
            return;
        }

        setConnecting(true);
        try {
            const gameRef = database.ref(`games/${gameId}`);
            const snapshot = await gameRef.once('value');
            const gameData = snapshot.val();

            if (!gameData) {
                setError('Game not found. Please check the ID and try again.');
                setConnecting(false);
                return;
            }

            if (gameData.players === 2) {
                setError('Game is full. Please try another game.');
                setConnecting(false);
                return;
            }

            await gameRef.update({
                players: 2
            });

            setPlayerSymbol('O');
            setGameMode('play');
            setIsMyTurn(false);
            setError(null);
        } catch (err) {
            console.error('Error joining game:', err);
            setError('Failed to join game. Please try again.');
        }
        setConnecting(false);
    };

    const handleClick = async (i) => {
        if (winner || board[i] || !isMyTurn) {
            return;
        }

        const newBoard = [...board];
        newBoard[i] = playerSymbol;

        try {
            await database.ref(`games/${gameId}`).update({
                board: newBoard,
                isX: !isX,
                currentTurn: playerSymbol === 'X' ? 'O' : 'X'
            });

            const winner = checkWinner(newBoard);
            if (winner) {
                await database.ref(`games/${gameId}`).update({
                    winner: winner
                });
            }
        } catch (err) {
            console.error('Error updating game:', err);
            setError('Failed to make move. Please try again.');
        }
    };

    const checkWinner = (currentBoard) => {
        const lines = [
            [0, 1, 2],
            [3, 4, 5],
            [6, 7, 8],
            [0, 3, 6],
            [1, 4, 7],
            [2, 5, 8],
            [0, 4, 8],
            [2, 4, 6],
        ];

        for (let i = 0; i < lines.length; i++) {
            const [a, b, c] = lines[i];
            if (currentBoard[a] && 
                currentBoard[a] === currentBoard[b] && 
                currentBoard[a] === currentBoard[c]) {
                return currentBoard[a];
            }
        }

        if (currentBoard.every(square => square !== null)) {
            return 'draw';
        }

        return null;
    };

    const restartGame = async () => {
        try {
            await database.ref(`games/${gameId}`).update({
                board: Array(9).fill(null),
                isX: true,
                winner: null,
                currentTurn: 'X'
            });
        } catch (err) {
            console.error('Error restarting game:', err);
            setError('Failed to restart game. Please try again.');
        }
    };

    const leaveGame = () => {
        if (gameId) {
            database.ref(`games/${gameId}`).remove();
        }
        setGameMode('menu');
        setGameId('');
        setPlayerSymbol(null);
        setBoard(Array(9).fill(null));
        setIsX(true);
        setWinner(null);
        setError(null);
    };

    const renderSquare = (i) => {
        return (
            <button className="square" onClick={() => handleClick(i)} disabled={!isMyTurn || winner}>
                {board[i]}
            </button>
        );
    };

    const renderStatus = () => {
        if (winner === 'draw') {
            return "Game ended in a draw!";
        } else if (winner) {
            return `Winner: ${winner}`;
        } else {
            return isMyTurn ? "Your turn" : "Opponent's turn";
        }
    };

    const renderMenu = () => (
        <div className="menu">
            <h2>Choose Game Mode</h2>
            <button onClick={createGame}>Host Game</button>
            <div className="join-section">
                <button onClick={() => setGameMode('join')}>Join Game</button>
            </div>
            {error && <div className="error">{error}</div>}
        </div>
    );

    const renderJoin = () => (
        <div className="join-menu">
            <h2>Join Game</h2>
            <input
                type="text"
                value={gameId}
                onChange={(e) => setGameId(e.target.value)}
                placeholder="Enter Game ID"
                disabled={connecting}
            />
            <button onClick={joinGame} disabled={connecting}>
                {connecting ? 'Connecting...' : 'Join'}
            </button>
            <button onClick={() => setGameMode('menu')} disabled={connecting}>
                Back
            </button>
            {error && <div className="error">{error}</div>}
        </div>
    );

    const renderHost = () => (
        <div className="host-menu">
            <h2>Waiting for Player</h2>
            <p>Share this Game ID: {gameId}</p>
            <button onClick={leaveGame}>Back</button>
            {error && <div className="error">{error}</div>}
        </div>
    );

    const renderGame = () => (
        <div>
            <h1>Tic Tac Toe</h1>
            <div className="status">{renderStatus()}</div>
            <div className="board">
                <div className="board-row">
                    {renderSquare(0)}
                    {renderSquare(1)}
                    {renderSquare(2)}
                </div>
                <div className="board-row">
                    {renderSquare(3)}
                    {renderSquare(4)}
                    {renderSquare(5)}
                </div>
                <div className="board-row">
                    {renderSquare(6)}
                    {renderSquare(7)}
                    {renderSquare(8)}
                </div>
            </div>
            <button className="restart" onClick={restartGame} disabled={!winner}>
                Restart Game
            </button>
            <div className="player-info">
                You are: {playerSymbol}
            </div>
            <button onClick={leaveGame} className="leave">
                Leave Game
            </button>
            {error && <div className="error">{error}</div>}
        </div>
    );

    const renderContent = () => {
        switch (gameMode) {
            case 'menu':
                return renderMenu();
            case 'join':
                return renderJoin();
            case 'host':
                return renderHost();
            case 'play':
                return renderGame();
            default:
                return renderMenu();
        }
    };

    return (
        <div className="game">
            {renderContent()}
        </div>
    );
}

ReactDOM.render(
    <TicTacToe />,
    document.getElementById('root')
);
