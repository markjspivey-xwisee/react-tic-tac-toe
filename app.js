function TicTacToe() {
    const [board, setBoard] = React.useState(Array(9).fill(null));
    const [isX, setIsX] = React.useState(true);
    const [winner, setWinner] = React.useState(null);
    const [peer, setPeer] = React.useState(null);
    const [conn, setConn] = React.useState(null);
    const [roomId, setRoomId] = React.useState('');
    const [gameMode, setGameMode] = React.useState('menu');
    const [playerSymbol, setPlayerSymbol] = React.useState(null);
    const [error, setError] = React.useState(null);
    const [isMyTurn, setIsMyTurn] = React.useState(false);

    React.useEffect(() => {
        const randomId = Math.random().toString(36).substring(7);
        const newPeer = new Peer(randomId, {
            debug: 2,
            config: {
                'iceServers': [
                    { url: 'stun:stun.l.google.com:19302' },
                    { url: 'stun:stun1.l.google.com:19302' },
                    { url: 'stun:stun2.l.google.com:19302' },
                    { url: 'stun:stun3.l.google.com:19302' },
                    { url: 'stun:stun4.l.google.com:19302' }
                ]
            },
            host: '0.peerjs.com',
            secure: true,
            port: 443
        });

        newPeer.on('open', (id) => {
            console.log('My peer ID is: ' + id);
            setPeer(newPeer);
            setError(null);
        });

        newPeer.on('error', (err) => {
            console.error('PeerJS error:', err);
            if (err.type === 'peer-unavailable') {
                setError('Could not find the game room. Please check the Room ID and try again.');
            } else if (err.type === 'disconnected') {
                setError('Connection lost. Please try again.');
                setGameMode('menu');
            } else {
                setError('Connection error: ' + err.message);
            }
        });

        newPeer.on('connection', (connection) => {
            console.log('Incoming connection from:', connection.peer);
            setConn(connection);
            setupConnection(connection);
            setGameMode('play');
            setPlayerSymbol('X');
            setIsMyTurn(true); // X goes first
            setError(null);
        });

        return () => {
            if (newPeer) {
                newPeer.destroy();
            }
        };
    }, []);

    const setupConnection = (connection) => {
        connection.on('open', () => {
            console.log('Connection opened');
            setError(null);
        });

        connection.on('data', (data) => {
            console.log('Received data:', data);
            if (data.type === 'move') {
                handleRemoteMove(data.position);
            } else if (data.type === 'restart') {
                handleRemoteRestart();
            }
        });

        connection.on('close', () => {
            console.log('Connection closed');
            setError('Connection closed. Please start a new game.');
            setGameMode('menu');
        });

        connection.on('error', (err) => {
            console.error('Connection error:', err);
            setError('Connection error: ' + err.message);
        });
    };

    const handleRemoteMove = (position) => {
        setBoard(prevBoard => {
            const newBoard = [...prevBoard];
            newBoard[position] = playerSymbol === 'X' ? 'O' : 'X';
            return newBoard;
        });
        setIsX(prev => !prev);
        setIsMyTurn(true);
    };

    const handleRemoteRestart = () => {
        setBoard(Array(9).fill(null));
        setIsX(true);
        setWinner(null);
        setIsMyTurn(playerSymbol === 'X');
    };

    const hostGame = () => {
        if (!peer) {
            setError('Connection not ready. Please try again.');
            return;
        }
        setGameMode('host');
        setRoomId(peer.id);
        setError(null);
    };

    const joinGame = () => {
        if (!peer || !roomId) {
            setError('Please enter a valid room ID.');
            return;
        }

        try {
            const connection = peer.connect(roomId.trim());
            connection.on('open', () => {
                setConn(connection);
                setupConnection(connection);
                setGameMode('play');
                setPlayerSymbol('O');
                setIsMyTurn(false); // X goes first
                setError(null);
            });
        } catch (err) {
            console.error('Error joining game:', err);
            setError('Failed to join game: ' + err.message);
        }
    };

    const handleClick = (i) => {
        if (winner || board[i] || !isMyTurn) {
            return;
        }

        const newBoard = [...board];
        newBoard[i] = playerSymbol;
        setBoard(newBoard);
        setIsX(!isX);
        setIsMyTurn(false);

        if (conn) {
            conn.send({
                type: 'move',
                position: i
            });
        }

        checkWinner(newBoard);
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
                setWinner(currentBoard[a]);
                return;
            }
        }

        if (currentBoard.every(square => square !== null)) {
            setWinner('draw');
        }
    };

    const renderSquare = (i) => {
        return (
            <button className="square" onClick={() => handleClick(i)}>
                {board[i]}
            </button>
        );
    };

    const restartGame = () => {
        setBoard(Array(9).fill(null));
        setIsX(true);
        setWinner(null);
        setIsMyTurn(playerSymbol === 'X');
        if (conn) {
            conn.send({ type: 'restart' });
        }
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
            <button onClick={hostGame}>Host Game</button>
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
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="Enter Room ID"
            />
            <button onClick={joinGame}>Join</button>
            <button onClick={() => setGameMode('menu')}>Back</button>
            {error && <div className="error">{error}</div>}
        </div>
    );

    const renderHost = () => (
        <div className="host-menu">
            <h2>Waiting for Player</h2>
            <p>Share this Room ID: {roomId}</p>
            <button onClick={() => setGameMode('menu')}>Back</button>
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
            <button className="restart" onClick={restartGame}>
                Restart Game
            </button>
            <div className="player-info">
                You are: {playerSymbol}
            </div>
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
