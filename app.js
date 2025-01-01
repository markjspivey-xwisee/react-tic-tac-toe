function Square({ value, onClick }) {
    return (
        <button className="square" onClick={onClick}>
            {value}
        </button>
    );
}

function Board({ squares, onClick }) {
    return (
        <div className="board">
            {squares.map((value, i) => (
                <Square
                    key={i}
                    value={value}
                    onClick={() => onClick(i)}
                />
            ))}
        </div>
    );
}

function Game() {
    const [squares, setSquares] = React.useState(Array(9).fill(null));
    const [xIsNext, setXIsNext] = React.useState(true);

    const calculateWinner = (squares) => {
        const lines = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
            [0, 4, 8], [2, 4, 6] // diagonals
        ];

        for (let line of lines) {
            const [a, b, c] = line;
            if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
                return squares[a];
            }
        }
        return null;
    };

    const handleClick = (i) => {
        if (calculateWinner(squares) || squares[i]) {
            return;
        }

        const newSquares = squares.slice();
        newSquares[i] = xIsNext ? 'X' : 'O';
        setSquares(newSquares);
        setXIsNext(!xIsNext);
    };

    const handleRestart = () => {
        setSquares(Array(9).fill(null));
        setXIsNext(true);
    };

    const winner = calculateWinner(squares);
    const isDraw = !winner && squares.every(square => square !== null);
    const status = winner 
        ? `Winner: ${winner}` 
        : isDraw 
        ? "It's a draw!" 
        : `Next player: ${xIsNext ? 'X' : 'O'}`;

    return (
        <div className="game">
            <h1>Tic Tac Toe</h1>
            <div className="status">{status}</div>
            <Board squares={squares} onClick={handleClick} />
            <button className="restart" onClick={handleRestart}>
                Restart Game
            </button>
        </div>
    );
}

ReactDOM.render(
    <Game />,
    document.getElementById('root')
);
