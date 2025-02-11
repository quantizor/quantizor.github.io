'use client';

import { useEffect, useState } from 'react';
import SiteTitle from '../../components/Title';

// Game colors in order
const COLORS = [
  {
    name: 'Classic',
    colors: [
      '#FFFFFF', // white
      '#FF0000', // red
      '#FFA500', // orange
      '#FFFF00', // yellow
      '#008000', // green
      '#0000FF', // blue
      '#4B0082', // indigo
      '#8F00FF', // violet
      '#666666', // black
    ],
  },
  {
    name: 'Winter',
    colors: [
      '#F0F8FF', // alice blue (snow)
      '#87CEEB', // sky blue
      '#1B4965', // deep blue
      '#48CAE4', // ice blue
      '#2D3A3A', // slate
      '#134611', // evergreen
      '#B4E1FF', // frost
      '#CAF0F8', // pale blue
      '#03045E', // midnight blue
    ],
  },
  {
    name: 'Spring',
    colors: [
      '#FFB3BA', // light pink
      '#E6A8D7', // orchid
      '#BAFFC9', // mint
      '#FF69B4', // hot pink
      '#98FB98', // pale green
      '#FFF0F5', // lavender blush
      '#FFE5B4', // peach
      '#E0BBE4', // wisteria
      '#4B0082', // indigo
    ],
  },
  {
    name: 'Summer',
    colors: [
      '#FFD700', // gold (sun)
      '#FF6B6B', // coral
      '#4ECDC4', // turquoise
      '#87D37C', // jungle green
      '#F7D794', // sand
      '#FF9F43', // sunset orange
      '#00CED1', // ocean blue
      '#98FB98', // pale green
      '#FF1493', // deep pink
    ],
  },
  {
    name: 'Autumn',
    colors: [
      '#8B4513', // saddle brown
      '#D35400', // pumpkin
      '#F1C40F', // golden yellow
      '#6D4C41', // deep brown
      '#A0522D', // sienna
      '#800000', // maroon
      '#DAA520', // goldenrod
      '#BF360C', // deep orange
      '#7B341E', // russet
    ],
  },
];

type BoardState = (number | null)[][];
type Difficulty = 'easy' | 'medium' | 'hard';

export default function Prismoku() {
  // Game state
  const [board, setBoard] = useState<BoardState>(() => {
    if (typeof window !== 'undefined') {
      return (
        JSON.parse(sessionStorage.getItem('sudokuBoard') || 'null') ||
        Array(9)
          .fill(null)
          .map(() => Array(9).fill(null))
      );
    }
    return Array(9)
      .fill(null)
      .map(() => Array(9).fill(null));
  });

  const [fixedCells, setFixedCells] = useState<boolean[][]>(() => {
    if (typeof window !== 'undefined') {
      return (
        JSON.parse(sessionStorage.getItem('sudokuFixedCells') || 'null') ||
        Array(9)
          .fill(null)
          .map(() => Array(9).fill(false))
      );
    }
    return Array(9)
      .fill(null)
      .map(() => Array(9).fill(false));
  });

  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [pickerPosition, setPickerPosition] = useState<{
    anchor: HTMLElement;
    x: number;
    y: number;
    size: number;
  } | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [isComplete, setIsComplete] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [isNewGame, setIsNewGame] = useState(false);
  const [showPalettePicker, setShowPalettePicker] = useState(false);
  const [showDifficultyMenu, setShowDifficultyMenu] = useState(false);
  const [currentPaletteIndex, setCurrentPaletteIndex] = useState(() =>
    parseInt(typeof window !== 'undefined' ? sessionStorage.getItem('sudokuPaletteIndex') || '0' : '0')
  );

  // Helper function to convert between color hex and index
  const getColorHex = (index: number) => COLORS[currentPaletteIndex].colors[index];

  // Check if a color can be placed at the given position
  const isValidPlacement = (board: BoardState, row: number, col: number, colorIndex: number) => {
    // Get only the fixed cells (initial state)
    const fixedBoard = board.map((r, i) => r.map((cell, j) => (fixedCells[i][j] ? cell : null)));

    // Check row - only consider fixed cells
    for (let x = 0; x < 9; x++) {
      if (fixedBoard[row][x] === colorIndex) return false;
    }

    // Check column - only consider fixed cells
    for (let y = 0; y < 9; y++) {
      if (fixedBoard[y][col] === colorIndex) return false;
    }

    // Check 3x3 box - only consider fixed cells
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let y = boxRow; y < boxRow + 3; y++) {
      for (let x = boxCol; x < boxCol + 3; x++) {
        if (fixedBoard[y][x] === colorIndex) return false;
      }
    }
    return true;
  };

  // Save state to session storage
  useEffect(() => {
    if (board && board.some((row) => row.some((cell) => cell !== null))) {
      sessionStorage.setItem('sudokuBoard', JSON.stringify(board));
      sessionStorage.setItem('sudokuFixedCells', JSON.stringify(fixedCells));
    }
  }, [board, fixedCells]);

  // Update session storage when palette changes
  useEffect(() => {
    sessionStorage.setItem('sudokuPaletteIndex', currentPaletteIndex.toString());
  }, [currentPaletteIndex]);

  // Initialize game
  useEffect(() => {
    const savedPaletteIndex = parseInt(sessionStorage.getItem('sudokuPaletteIndex') || '0');
    if (!isNaN(savedPaletteIndex) && savedPaletteIndex >= 0 && savedPaletteIndex < COLORS.length) {
      setCurrentPaletteIndex(savedPaletteIndex);
    }

    // Only generate a new puzzle if there isn't one in session storage
    if (!sessionStorage.getItem('sudokuBoard')) {
      generatePuzzle('easy');
    }

    // Reset initialLoad after a short delay
    setTimeout(() => setInitialLoad(false), 1000);

    // Add resize listener
    const handleResize = () => {
      const pos = pickerPosition;
      if (pos?.anchor) {
        updatePickerPosition(pos.anchor);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const removeCells = (board: BoardState, difficulty: Difficulty): BoardState => {
    const newBoard = board.map((row) => [...row]);
    let cellsToRemove;

    switch (difficulty) {
      case 'easy':
        cellsToRemove = 36; // Remove about 65%
        break;
      case 'medium':
        cellsToRemove = 44; // Remove about 72%
        break;
      case 'hard':
        cellsToRemove = 50; // Remove about 80%
        break;
      default:
        cellsToRemove = 53;
    }

    // Create a list of all positions
    const positions = [];
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        positions.push([i, j]);
      }
    }

    // Shuffle positions
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }

    // Remove cells
    for (let i = 0; i < cellsToRemove; i++) {
      if (positions.length === 0) break;
      const [row, col] = positions[i];
      newBoard[row][col] = null;
    }

    return newBoard;
  };

  // Generate a valid Sudoku board
  const generateInitialBoard = (difficulty: Difficulty): BoardState => {
    const board: BoardState = Array(9)
      .fill(null)
      .map(() => Array(9).fill(null));

    const availableIndices = Array.from({ length: COLORS[0].colors.length }, (_, i) => i);

    // Helper function to check if a color can be placed at a position
    const canPlaceColor = (row: number, col: number, colorIndex: number): boolean => {
      // Check row
      for (let x = 0; x < 9; x++) {
        if (board[row][x] === colorIndex) return false;
      }

      // Check column
      for (let y = 0; y < 9; y++) {
        if (board[y][col] === colorIndex) return false;
      }

      // Check 3x3 box
      const boxRow = Math.floor(row / 3) * 3;
      const boxCol = Math.floor(col / 3) * 3;
      for (let y = boxRow; y < boxRow + 3; y++) {
        for (let x = boxCol; x < boxCol + 3; x++) {
          if (board[y][x] === colorIndex) return false;
        }
      }

      return true;
    };

    // Helper function to solve the board
    const solve = (row = 0, col = 0): boolean => {
      if (col === 9) {
        row++;
        col = 0;
      }
      if (row === 9) return true;

      if (board[row][col] !== null) {
        return solve(row, col + 1);
      }

      const shuffledIndices = [...availableIndices].sort(() => Math.random() - 0.5);
      for (const colorIndex of shuffledIndices) {
        if (canPlaceColor(row, col, colorIndex)) {
          board[row][col] = colorIndex;
          if (solve(row, col + 1)) {
            return true;
          }
          board[row][col] = null;
        }
      }
      return false;
    };

    solve();
    return removeCells(board, difficulty);
  };

  const generatePuzzle = (difficulty: Difficulty) => {
    setIsNewGame(true);
    const newBoard = generateInitialBoard(difficulty);
    const newFixedCells = newBoard.map((row) => row.map((cell) => cell !== null));
    setBoard(newBoard);
    setFixedCells(newFixedCells);
    setDifficulty(difficulty);
    // Reset isNewGame after a short delay
    setTimeout(() => setIsNewGame(false), 1000);
  };

  const checkCompletion = (board: BoardState) => {
    // Check if board is full
    const isFull = board.every((row) => row.every((cell) => cell !== null));
    if (!isFull) return false;

    // Check if every row, column, and box has unique colors
    for (let i = 0; i < 9; i++) {
      const rowColors = new Set(board[i]);
      const colColors = new Set(board.map((row) => row[i]));
      if (rowColors.size !== 9 || colColors.size !== 9) return false;

      const boxRow = Math.floor(i / 3) * 3;
      const boxCol = (i % 3) * 3;
      const boxColors = new Set();
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          boxColors.add(board[boxRow + r][boxCol + c]);
        }
      }
      if (boxColors.size !== 9) return false;
    }
    return true;
  };

  const handleColorSelect = (colorIndex: number) => {
    const cell = selectedCell;
    if (!cell) return;

    const { row, col } = cell;
    if (fixedCells[row][col]) return;

    const newBoard = board.map((row) => [...row]);

    if (newBoard[row][col] === colorIndex) {
      newBoard[row][col] = null;
    } else {
      newBoard[row][col] = colorIndex;
    }

    setBoard(newBoard);

    // Check if puzzle is complete
    if (checkCompletion(newBoard)) {
      setIsComplete(true);
      createConfetti();
    }
    setSelectedCell(null);
    setPickerPosition(null);
  };

  const createConfetti = () => {
    const confetti = document.createElement('div');
    confetti.className = 'confetti-container';
    document.body.appendChild(confetti);

    // Create confetti pieces every 100ms
    let piecesCreated = 0;
    const createPieces = () => {
      for (let i = 0; i < 20; i++) {
        const piece = document.createElement('div');
        piece.className = 'confetti-piece';
        piece.style.setProperty('--x', `${Math.random() * 100}vw`);
        piece.style.setProperty('--rotation', `${Math.random() * 360}deg`);
        piece.style.backgroundColor =
          COLORS[currentPaletteIndex].colors[Math.floor(Math.random() * COLORS[0].colors.length)];
        confetti.appendChild(piece);
      }

      piecesCreated += 20;
      if (piecesCreated < 1000) {
        // Create more pieces over longer time
        setTimeout(createPieces, 100);
      }
    };

    createPieces();

    // Remove container after all animations
    setTimeout(() => {
      document.body.removeChild(confetti);
    }, 20000); // Let it run longer
  };

  const updatePickerPosition = (cell: HTMLElement) => {
    setPickerPosition({
      anchor: cell,
      size: cell.clientWidth,
      x: cell.offsetLeft,
      y: cell.offsetTop,
    });
  };

  const handleCellClick = (e: React.MouseEvent<HTMLElement>) => {
    const cell = e.currentTarget;
    const row = parseInt(cell.dataset.row ?? '');
    const col = parseInt(cell.dataset.col ?? '');

    if (isNaN(row) || isNaN(col) || fixedCells[row][col]) return;

    // If clicking the same cell, dismiss the picker
    if (selectedCell?.row === row && selectedCell?.col === col) {
      setSelectedCell(null);
      setPickerPosition(null);
      return;
    }

    setSelectedCell({ row, col });
    updatePickerPosition(cell);
  };

  const handleClickAway = (e: React.MouseEvent<HTMLElement>) => {
    const target = e.target as HTMLElement;
    if (pickerPosition && !target.closest('.color-menu') && !target.closest('.sudoku-cell')) {
      setSelectedCell(null);
      setPickerPosition(null);
    }
    if (!target.closest('.difficulty-menu')) {
      setShowDifficultyMenu(false);
    }
  };

  const getRadialPosition = (index: number, total: number) => {
    const angle = (index * 2 * Math.PI) / total - Math.PI / 2;
    const radius = 60;
    return {
      transform: `rotate(${angle}rad) translateX(${radius}px) rotate(${-angle}rad)`,
    };
  };

  const handleReset = () => {
    // Create a new board with only fixed cells
    const newBoard = board.map((row, i) => row.map((cell, j) => (fixedCells[i][j] ? cell : null)));
    setBoard(newBoard);
    setSelectedCell(null);
    setPickerPosition(null);
    setIsComplete(false);
  };

  // Helper for CSS custom properties
  const cssVar = (name: string) => `--${name}` as any;

  return (
    <div className="flex flex-col items-center min-h-screen text-white p-4 sm:p-8 gap-7" onClick={handleClickAway}>
      <SiteTitle>Prismoku!</SiteTitle>

      <div className="flex justify-between gap-2 w-full">
        <div className="relative">
          <button
            className="px-4 py-2 bg-white/10 hover:bg-white/20 transition-colors flex items-center gap-2"
            onClick={(e) => {
              e.stopPropagation();
              setShowDifficultyMenu(!showDifficultyMenu);
            }}
          >
            {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
            <svg
              className={`w-4 h-4 transition-transform ${showDifficultyMenu ? 'rotate-180' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showDifficultyMenu && (
            <div className="absolute top-full left-0 mt-1 bg-zinc-900/85 backdrop-blur-sm rounded shadow-xl z-50 min-w-[120px] overflow-hidden difficulty-menu">
              <button
                className="w-full px-4 py-2 text-left hover:bg-white/10 transition-colors"
                onClick={() => {
                  generatePuzzle('easy');
                  setShowDifficultyMenu(false);
                }}
              >
                Easy
              </button>
              <button
                className="w-full px-4 py-2 text-left hover:bg-white/10 transition-colors"
                onClick={() => {
                  generatePuzzle('medium');
                  setShowDifficultyMenu(false);
                }}
              >
                Medium
              </button>
              <button
                className="w-full px-4 py-2 text-left hover:bg-white/10 transition-colors"
                onClick={() => {
                  generatePuzzle('hard');
                  setShowDifficultyMenu(false);
                }}
              >
                Hard
              </button>
            </div>
          )}
        </div>

        <button className="px-4 py-2 bg-white/10 hover:bg-white/20 transition-colors ml-auto" onClick={handleReset}>
          Reset
        </button>

        <button
          className="px-4 py-2 bg-white/10 hover:bg-white/20 transition-colors"
          onClick={() => {
            generatePuzzle(difficulty);
          }}
        >
          New Game
        </button>
      </div>

      <h1 className="text-3xl sm:text-4xl font-bold flex mt-5">
        {Array.from('Prismoku!').map((char, i) => (
          <span
            key={i}
            style={{ color: COLORS[currentPaletteIndex].colors[i % COLORS[currentPaletteIndex].colors.length] }}
          >
            {char}
          </span>
        ))}
      </h1>

      <div className="w-full max-w-[min(90vw,500px)] aspect-square rounded-lg p-2 sm:p-4">
        <div
          className="grid gap-0 w-full h-full"
          style={{
            gridTemplateColumns: `1fr 1fr 1fr 12px 1fr 1fr 1fr 12px 1fr 1fr 1fr`,
            gridTemplateRows: `1fr 1fr 1fr 12px 1fr 1fr 1fr 12px 1fr 1fr 1fr`,
          }}
        >
          {board.map((row, rowIndex) =>
            row
              .map((cell, colIndex) => {
                const delay = Math.random() * 0.5;
                return [
                  rowIndex > 0 && rowIndex % 3 === 0 && colIndex === 0 && (
                    <div key={`gap-${rowIndex}-${colIndex}`} className="col-span-full" />
                  ),
                  <div
                    key={`cell-${rowIndex}-${colIndex}`}
                    data-row={rowIndex}
                    data-col={colIndex}
                    className={`sudoku-cell w-full aspect-square transition-all duration-200 inline-flex items-center justify-center text-2xl font-bold text-zinc-900
                    ${isComplete ? 'animate-fade-out' : ''}
                    ${initialLoad || isNewGame ? 'animate-fade-in' : ''}
                    ${
                      fixedCells[rowIndex][colIndex]
                        ? 'opacity-100 cursor-default pointer-events-none'
                        : 'cursor-pointer hover:bg-white/10'
                    }
                    ${selectedCell?.row === rowIndex && selectedCell?.col === colIndex ? 'anchor bg-white/20' : ''}
                  `}
                    style={{
                      backgroundColor: cell !== null ? getColorHex(cell) : undefined,
                      [cssVar('delay')]: `${delay}s`,
                    }}
                    onClick={handleCellClick}
                  >
                    {fixedCells[rowIndex][colIndex] === false && cell !== null ? '*' : ''}
                  </div>,
                  colIndex < 8 && Number.isInteger((colIndex + 1) / 3) && (
                    <div key={`col-gap-${rowIndex}-${colIndex}`} />
                  ),
                ];
              })
              .flat()
          )}
        </div>
      </div>

      {pickerPosition && (
        <div
          className="color-menu fixed z-[9999] size-48 transition-all"
          style={{
            top: `${pickerPosition.y}px`,
            left: `${pickerPosition.x}px`,
            height: `${pickerPosition.size}px`,
            width: `${pickerPosition.size}px`,
            transform: `translate(${
              0.00130381 * Math.pow(pickerPosition.size, 3) -
              0.144633 * Math.pow(pickerPosition.size, 2) +
              5.55451 * pickerPosition.size -
              76.1437
            }px, ${
              0.00130381 * Math.pow(pickerPosition.size, 3) -
              0.144633 * Math.pow(pickerPosition.size, 2) +
              5.55451 * pickerPosition.size -
              76.1437
            }px)`,
          }}
        >
          {COLORS[currentPaletteIndex].colors.map((_, colorIndex) => {
            const cell = selectedCell;
            const isValid = cell ? isValidPlacement(board, cell.row, cell.col, colorIndex) : true;
            const showInvalid = difficulty === 'easy';

            return (
              <div
                key={colorIndex}
                className="absolute -translate-x-1/2 -translate-y-1/2 opacity-0 pointer-events-auto"
                style={{
                  [cssVar('transform')]: getRadialPosition(colorIndex, COLORS[currentPaletteIndex].colors.length)
                    .transform,
                  animation: `fadeInAndSlide 0.15s ease-out forwards ${colorIndex * 0.02}s`,
                }}
              >
                <div
                  className={`w-10 h-10 rounded-full transform transition-transform border-2 border-white/20 hover:scale-110 cursor-pointer shadow-2xl`}
                  style={{
                    backgroundColor: getColorHex(colorIndex),
                    opacity: showInvalid && !isValid ? '0.15' : '1',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();

                    if (difficulty !== 'easy' || isValid) {
                      handleColorSelect(colorIndex);
                    }
                  }}
                />
              </div>
            );
          })}
        </div>
      )}

      {isComplete && <div className="text-3xl font-bold text-center mt-8">Congratulations! You won!</div>}

      <div className="relative mt-4">
        <button
          className="px-4 py-2 bg-white/10 rounded hover:bg-white/20 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            setShowPalettePicker(!showPalettePicker);
          }}
        >
          <div className="flex items-center gap-2">
            <span>Theme</span>
            <div className="flex -space-x-1">
              {COLORS[currentPaletteIndex].colors.slice(0, 5).map((color, i) => (
                <div
                  key={i}
                  className="w-3 h-3 rounded-full border border-white/20"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <svg
              className={`w-4 h-4 transition-transform ${showPalettePicker ? 'rotate-0' : 'rotate-180'}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {showPalettePicker && (
          <div className="absolute bottom-full mb-2 p-2 z-50 w-48 bg-zinc-900/85 backdrop-blur-sm rounded shadow-xl">
            {COLORS.map((palette, index) => (
              <button
                key={index}
                className="w-full px-3 py-2 rounded hover:bg-white/10 transition-colors flex items-center gap-2"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentPaletteIndex(index);
                  setShowPalettePicker(false);
                }}
              >
                <span className="capitalize">{palette.name}</span>
                <div className="flex -space-x-1 ml-auto">
                  {COLORS[index].colors.slice(0, 5).map((color, i) => (
                    <div
                      key={i}
                      className="w-3 h-3 rounded-full border border-white/20"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-white/50 mt-8 max-w-md text-center">
        How to play: Fill the grid so that every row, column, and 3x3 box contains each color exactly once. Click a cell
        to select it, then choose a color from the radial menu.
      </p>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: var(--final-opacity, 1);
            transform: scale(1);
          }
        }
        .animate-fade-in {
          opacity: 0;
          animation: fadeIn 0.5s ease-out var(--delay) forwards;
        }
        @keyframes fadeInAndSlide {
          from {
            opacity: 0;
            transform: rotate(0) translateX(0) rotate(0);
          }
          to {
            opacity: 1;
            transform: var(--transform);
          }
        }
        .color-menu {
          position: absolute;
          position-anchor: --tile;
          left: anchor(center);
          top: anchor(center);
          pointer-events: none;
        }
        .anchor {
          anchor-name: --tile;
          position: relative;
        }
        .confetti-container {
          position: fixed;
          top: -200px;
          left: 0;
          width: 100%;
          height: 200vh;
          pointer-events: none;
          z-index: 9999;
        }
        .confetti-piece {
          position: absolute;
          width: 15px;
          height: 15px;
          top: 0;
          left: var(--x);
          transform: rotate(var(--rotation));
          animation: fall 8s linear forwards;
          border-radius: 4px;
        }
        @keyframes fall {
          0% {
            transform: translateY(0) rotate(var(--rotation));
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(200vh) rotate(calc(var(--rotation) + 720deg));
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
