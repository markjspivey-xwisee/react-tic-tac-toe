function TicTacToe() {
    const [board, setBoard] = React.useState(Array(9).fill(null));
    const [isX, setIsX] = React.useState(true);
    const [winner, setWinner] = React.useState(null);
    const [gameMode, setGameMode] = React.useState('menu');
    const [playerSymbol, setPlayerSymbol] = React.useState(null);
    const [error, setError] = React.useState(null);
    const [isMyTurn, setIsMyTurn] = React.useState(false);
    const [connecting, setConnecting] = React.useState(false);
    const [connectionCode, setConnectionCode] = React.useState('');
    const [peerConnection, setPeerConnection] = React.useState(null);
    const [dataChannel, setDataChannel] = React.useState(null);

    const createGame = async () => {
        try {
            const pc = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            });

            const channel = pc.createDataChannel('gameChannel');
            setupDataChannel(channel);

            pc.onicecandidate = (e) => {
                if (e.candidate === null) {
                    // Connection gathering complete, create connection code
                    const code = btoa(JSON.stringify({
                        sdp: pc.localDescription,
                        type: 'offer'
                    }));
                    setConnectionCode(code);
                }
            };

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            setPeerConnection(pc);
            setPlayerSymbol('X');
            setGameMode('host');
            setError(null);
        } catch (err) {
            console.error('Error creating game:', err);
            setError('Failed to create game. Please try again.');
        }
    };

    const joinGame = async () => {
        if (!connectionCode.trim()) {
            setError('Please enter a valid connection code.');
            return;
        }

        setConnecting(true);
        try {
            const { sdp, type } = JSON.parse(atob(connectionCode.trim()));
            if (type !== 'offer') {
                throw new Error('Invalid connection code');
            }

            const pc = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            });

            pc.ondatachannel = (event) => {
                setupDataChannel(event.channel);
            };

            pc.onicecandidate = async (e) => {
                if (e.candidate === null) {
                    // Connection gathering complete, create answer code
                    const code = btoa(JSON.stringify({
                        sdp: pc.localDescription,
                        type: 'answer'
                    }));
                    setConnectionCode(code);
                }
            };

            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            setPeerConnection(pc);
            setPlayerSymbol('O');
            setGameMode('join');
            setError(null);
        } catch (err) {
            console.error('Error joining game:', err);
            setError('Failed to join game. Please check the connection code and try again.');
            setConnecting(false);
        }
    };

    const setupDataChannel = (channel) => {
        channel.onopen = () => {
            console.log('Data channel opened');
            setDataChannel(channel);
            setGameMode('play');
            setIsMyTurn(playerSymbol === 'X');
            setConnecting(false);
            setError(null);
        };

        channel.onclose = () => {
            console.log('Data channel closed');
            setError('Connection closed. Please start a new game.');
            setGameMode('menu');
        };

        channel.onerror = (err) => {
            console.error('Data channel error:', err);
            setError('Connection error. Please try again.');
        };

        channel.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'move') {
                handleRemoteMove(data.position);
            } else if (data.type === 'restart') {
                handleRemoteRestart();
            }
        };
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

    const handleClick = (i) => {
        if (winner || board[i] || !isMyTurn || !dataChannel) {
            return;
        }

        const newBoard = [...board];
        newBoard[i] = playerSymbol;
        setBoard(newBoard);
        setIsX(!isX);
        setIsMyTurn(false);

        dataChannel.send(JSON.stringify({
            type: 'move',
            position: i
        }));

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

    const restartGame = () => {
        setBoard(Array(9).fill(null));
        setIsX(true);
        setWinner(null);
        setIsMyTurn(playerSymbol === 'X');
        if (dataChannel) {
            dataChannel.send(JSON.stringify({ type: 'restart' }));
        }
    };

    const leaveGame = () => {
        if (dataChannel) {
            dataChannel.close();
        }
        if (peerConnection) {
            peerConnection.close();
        }
        setGameMode('menu');
        setConnectionCode('');
        setPlayerSymbol(null);
        setBoard(Array(9).fill(null));
        setIsX(true);
        setWinner(null);
        setError(null);
        setPeerConnection(null);
        setDataChannel(null);
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
                value={connectionCode}
                onChange={(e) => setConnectionCode(e.target.value)}
                placeholder="Enter Connection Code"
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
            <p>Share this Connection Code:</p>
            <p className="code">{connectionCode}</p>
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
