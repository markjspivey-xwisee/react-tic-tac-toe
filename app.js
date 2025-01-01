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

    // Cleanup function for WebRTC connections
    React.useEffect(() => {
        return () => {
            if (dataChannel) {
                dataChannel.close();
            }
            if (peerConnection) {
                peerConnection.close();
            }
        };
    }, [dataChannel, peerConnection]);

    const createGame = async () => {
        try {
            setConnecting(true);
            setError(null);

            // Create and configure the peer connection
            const configuration = {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            };

            console.log('Creating RTCPeerConnection...');
            const pc = new RTCPeerConnection(configuration);

            // Set up connection monitoring
            pc.onconnectionstatechange = () => {
                console.log('Connection state:', pc.connectionState);
                if (pc.connectionState === 'failed') {
                    setError('Connection failed. Please try again.');
                    setGameMode('menu');
                }
            };

            pc.oniceconnectionstatechange = () => {
                console.log('ICE connection state:', pc.iceConnectionState);
            };

            // Create the data channel
            console.log('Creating data channel...');
            const channel = pc.createDataChannel('gameChannel', {
                ordered: true
            });

            // Set up the data channel
            setupDataChannel(channel);

            // Handle ICE candidates
            pc.onicecandidate = (e) => {
                console.log('ICE candidate:', e.candidate);
                if (e.candidate === null) {
                    // Connection gathering complete, create connection code
                    console.log('ICE gathering complete');
                    const code = btoa(JSON.stringify({
                        sdp: pc.localDescription,
                        type: 'offer'
                    }));
                    setConnectionCode(code);
                }
            };

            // Create and set the offer
            console.log('Creating offer...');
            const offer = await pc.createOffer();
            console.log('Setting local description...');
            await pc.setLocalDescription(offer);

            setPeerConnection(pc);
            setPlayerSymbol('X');
            setGameMode('host');
            setError(null);
        } catch (err) {
            console.error('Error creating game:', err);
            setError('Failed to create game: ' + err.message);
            setGameMode('menu');
        } finally {
            setConnecting(false);
        }
    };

    const joinGame = async () => {
        if (!connectionCode.trim()) {
            setError('Please enter a valid connection code.');
            return;
        }

        setConnecting(true);
        setError(null);

        try {
            // Parse and validate the connection code
            let offerData;
            try {
                offerData = JSON.parse(atob(connectionCode.trim()));
                if (offerData.type !== 'offer') {
                    throw new Error('Invalid connection code');
                }
            } catch (e) {
                throw new Error('Invalid connection code format');
            }

            // Create and configure the peer connection
            const configuration = {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            };

            console.log('Creating RTCPeerConnection...');
            const pc = new RTCPeerConnection(configuration);

            // Set up connection monitoring
            pc.onconnectionstatechange = () => {
                console.log('Connection state:', pc.connectionState);
                if (pc.connectionState === 'failed') {
                    setError('Connection failed. Please try again.');
                    setGameMode('menu');
                }
            };

            pc.oniceconnectionstatechange = () => {
                console.log('ICE connection state:', pc.iceConnectionState);
            };

            // Handle incoming data channel
            pc.ondatachannel = (event) => {
                console.log('Received data channel');
                setupDataChannel(event.channel);
            };

            // Handle ICE candidates
            pc.onicecandidate = async (e) => {
                console.log('ICE candidate:', e.candidate);
                if (e.candidate === null) {
                    // Connection gathering complete, create answer code
                    console.log('ICE gathering complete');
                    const code = btoa(JSON.stringify({
                        sdp: pc.localDescription,
                        type: 'answer'
                    }));
                    setConnectionCode(code);
                }
            };

            // Set the remote description and create answer
            console.log('Setting remote description...');
            await pc.setRemoteDescription(new RTCSessionDescription(offerData.sdp));
            console.log('Creating answer...');
            const answer = await pc.createAnswer();
            console.log('Setting local description...');
            await pc.setLocalDescription(answer);

            setPeerConnection(pc);
            setPlayerSymbol('O');
            setGameMode('join');
            setError(null);
        } catch (err) {
            console.error('Error joining game:', err);
            setError(err.message || 'Failed to join game. Please check the connection code and try again.');
            setGameMode('menu');
        } finally {
            setConnecting(false);
        }
    };

    const setupDataChannel = (channel) => {
        console.log('Setting up data channel...');

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
            setError('Connection error: ' + err.message);
        };

        channel.onmessage = (event) => {
            console.log('Received message:', event.data);
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'move') {
                    handleRemoteMove(data.position);
                } else if (data.type === 'restart') {
                    handleRemoteRestart();
                }
            } catch (err) {
                console.error('Error processing message:', err);
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

        try {
            dataChannel.send(JSON.stringify({
                type: 'move',
                position: i
            }));
        } catch (err) {
            console.error('Error sending move:', err);
            setError('Failed to send move. Connection may be lost.');
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

    const restartGame = () => {
        setBoard(Array(9).fill(null));
        setIsX(true);
        setWinner(null);
        setIsMyTurn(playerSymbol === 'X');
        if (dataChannel) {
            try {
                dataChannel.send(JSON.stringify({ type: 'restart' }));
            } catch (err) {
                console.error('Error sending restart:', err);
                setError('Failed to restart game. Connection may be lost.');
            }
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
            <button onClick={createGame} disabled={connecting}>
                {connecting ? 'Creating Game...' : 'Host Game'}
            </button>
            <div className="join-section">
                <button onClick={() => setGameMode('join')} disabled={connecting}>
                    Join Game
                </button>
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
