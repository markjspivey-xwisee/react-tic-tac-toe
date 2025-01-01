function TicTacToe() {
    const [board, setBoard] = React.useState(Array(9).fill(null));
    const [isX, setIsX] = React.useState(true);
    const [winner, setWinner] = React.useState(null);
    const [peer, setPeer] = React.useState(null);
    const [conn, setConn] = React.useState(null);
    const [roomId, setRoomId] = React.useState('');
    const [gameMode, setGameMode] = React.useState('menu'); // 'menu', 'host', 'join', 'play'
    const [playerSymbol, setPlayerSymbol] = React.useState(null);

    React.useEffect(() => {
        const newPeer = new Peer();
        newPeer.on('open', (id) => {
            setPeer(newPeer);
        });

        newPeer.on('connection', (connection) => {
            setConn(connection);
            setupConnection(connection);
            setGameMode('play');
            setPlayerSymbol('X');
        });

        return () => {
            if (peer) {
                peer.destroy();
            }
        };
    }, []);

    const setupConnection = (connection) => {
        connection.on('data', (data) => {
            if (data.type === 'move') {
                handleRemoteMove(data.position);
            }
        });
    };

    const handleRemoteMove = (position) => {
        const newBoard = [...board];
        newBoard[position] = playerSymbol === 'X' ? 'O' : 'X';
        setBoard(newBoard);
        setIsX(!isX);
        checkWinner(newBoard);
    };

    const hostGame = () => {
        setGameMode('host');
        setRoomId(peer.id);
    };

    const joinGame = () => {
        if (!roomId) return;
        const connection = peer.connect(roomId);
        setConn(connection);
        setupConnection(connection);
        setGameMode('play');
        setPlayerSymbol('O');
    };

    const handleClick = (i) => {
        if (winner || board[i] || 
            (playerSymbol === 'X' && !isX) || 
            (playerSymbol === 'O' && isX)) {
            return;
        }

        const newBoard = [...board];
        newBoard[i] = isX ? 'X' : 'O';
        setBoard(newBoard);
        setIsX(!isX);

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
    };

    const renderStatus = () => {
        if (winner === 'draw') {
            return "Game ended in a draw!";
        } else if (winner) {
            return `Winner: ${winner}`;
        } else {
            return `Next player: ${isX ? 'X' : 'O'}`;
        }
    };

    const renderMenu = () => (
        <div className="menu">
            <h2>Choose Game Mode</h2>
            <button onClick={hostGame}>Host Game</button>
            <div className="join-section">
                <button onClick={() => setGameMode('join')}>Join Game</button>
            </div>
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
        </div>
    );

    const renderHost = () => (
        <div className="host-menu">
            <h2>Waiting for Player</h2>
            <p>Share this Room ID: {roomId}</p>
            <button onClick={() => setGameMode('menu')}>Back</button>
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
