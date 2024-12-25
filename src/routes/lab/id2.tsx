import SiteTitle from '@/components/Title';
import { Meta } from '@solidjs/meta';
import { Component, createEffect, createMemo, createSignal, For, onMount, Show } from 'solid-js';

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
  {
    name: 'Christmas',
    colors: [
      '#FF0000', // bright red
      '#006400', // dark green
      '#FFD700', // gold
      '#01796F', // pine green
      '#8B0000', // dark red
      '#228B22', // forest green
      '#E6B800', // antique gold
      '#B22222', // firebrick
      '#FFFFFF', // snow white
    ],
  },
  {
    name: 'Neon',
    colors: [
      '#FF1493', // deep pink
      '#00FF00', // lime
      '#FF4500', // orange red
      '#FF00FF', // magenta
      '#00FFFF', // cyan
      '#7FFF00', // chartreuse
      '#FF69B4', // hot pink
      '#39FF14', // neon green
      '#FFA500', // orange
    ],
  },
] as const;

type Difficulty = 'easy' | 'medium' | 'hard';
type BoardState = (number | null)[][];

const Prismoku: Component = () => {
  // Initialize state from session storage or defaults
  const [board, setBoard] = createSignal<BoardState>(
    JSON.parse(sessionStorage.getItem('sudokuBoard') || 'null') || Array(9).fill(null).map(() => Array(9).fill(null))
  );

  const [fixedCells, setFixedCells] = createSignal<boolean[][]>(
    JSON.parse(sessionStorage.getItem('sudokuFixedCells') || 'null') || Array(9).fill(null).map(() => Array(9).fill(false))
  );

  const [selectedCell, setSelectedCell] = createSignal<{ row: number; col: number } | null>(null);
  const [pickerPosition, setPickerPosition] = createSignal<{ anchor: HTMLElement; x: number; y: number; size: number } | null>(null);
  const [difficulty, setDifficulty] = createSignal<'easy' | 'medium' | 'hard'>('easy');
  const [isComplete, setIsComplete] = createSignal(false);
  const [palette, setPalette] = createSignal<number[]>(Array.from({ length: COLORS[0].colors.length }, (_, i) => i));
  const [initialLoad, setInitialLoad] = createSignal(true);
  const [isNewGame, setIsNewGame] = createSignal(false);

  const [showPalettePicker, setShowPalettePicker] = createSignal(false);
  const [showDifficultyMenu, setShowDifficultyMenu] = createSignal(false);

  // Helper function to convert between color hex and index
  const [currentPaletteIndex, setCurrentPaletteIndex] = createSignal<number>(
    parseInt(sessionStorage.getItem('sudokuPaletteIndex') || '0')
  );
  const getColorHex = (index: number) => COLORS[currentPaletteIndex()].colors[index];

  // Check if a color can be placed at the given position
  const isValidPlacement = (board: BoardState, row: number, col: number, colorIndex: number) => {
    // Get only the fixed cells (initial state)
    const fixedBoard = board.map((r, i) =>
      r.map((cell, j) => fixedCells()[i][j] ? cell : null)
    );

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

  // Create effect to save state changes to session storage
  createEffect(() => {
    const currentBoard = board();
    const currentFixedCells = fixedCells();

    // Only save if we have a valid board with some non-null values
    if (currentBoard && currentBoard.some(row => row.some(cell => cell !== null))) {
      sessionStorage.setItem('sudokuBoard', JSON.stringify(currentBoard));
      sessionStorage.setItem('sudokuFixedCells', JSON.stringify(currentFixedCells));
    }
  });

  // Update session storage when palette changes
  createEffect(() => {
    sessionStorage.setItem('sudokuPaletteIndex', currentPaletteIndex().toString());
  });

  const removeCells = (board: BoardState, difficulty: Difficulty): BoardState => {
    const newBoard = board.map(row => [...row]);
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
    const newFixedCells = newBoard.map((row) =>
      row.map((cell) => cell !== null)
    );
    setBoard(newBoard);
    setFixedCells(newFixedCells);
    setDifficulty(difficulty);
    // Reset isNewGame after a short delay
    setTimeout(() => setIsNewGame(false), 1000);
  };

  const checkCompletion = (board: BoardState) => {
    // Check if board is full
    const isFull = board.every(row => row.every(cell => cell !== null));
    if (!isFull) return false;

    // Check if every row, column, and box has unique colors
    for (let i = 0; i < 9; i++) {
      const rowColors = new Set(board[i]);
      const colColors = new Set(board.map(row => row[i]));
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
    const cell = selectedCell();
    if (!cell) return;

    const { row, col } = cell;
    if (fixedCells()[row][col]) return;

    const newBoard = board().map(row => [...row]);

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
        piece.style.backgroundColor = COLORS[currentPaletteIndex()].colors[Math.floor(Math.random() * COLORS[0].colors.length)];
        confetti.appendChild(piece);
      }

      piecesCreated += 20;
      if (piecesCreated < 1000) { // Create more pieces over longer time
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

  const handleCellClick = (e: MouseEvent) => {
    const cell = (e.currentTarget as HTMLElement);
    const row = parseInt(cell.dataset.row ?? '');
    const col = parseInt(cell.dataset.col ?? '');

    if (isNaN(row) || isNaN(col) || fixedCells()[row][col]) return;

    // If clicking the same cell, dismiss the picker
    if (selectedCell()?.row === row && selectedCell()?.col === col) {
      setSelectedCell(null);
      setPickerPosition(null);
      return;
    }

    setSelectedCell({ row, col });

    updatePickerPosition(cell);
  };

  const handleClickAway = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (pickerPosition() && !target.closest('.color-menu') && !target.closest('.sudoku-cell')) {
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
    const newBoard = board().map((row, i) =>
      row.map((cell, j) => fixedCells()[i][j] ? cell : null)
    );
    setBoard(newBoard);
    setSelectedCell(null);
    setPickerPosition(null);
    setIsComplete(false);
  };

  onMount(() => {
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
      const pos = pickerPosition();
      if (pos?.anchor) {
        updatePickerPosition(pos.anchor);
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  });

  const offset = createMemo(() => {
    const size = pickerPosition()?.size ?? 0;

    return 0.00130381 * Math.pow(size, 3) - 0.144633 * Math.pow(
      size, 2) + 5.55451
      * size - 76.1437
  })

  const gap = 12

  return (
    <div class="flex flex-col items-center min-h-screen text-white p-4 sm:p-8 gap-7" onClick={handleClickAway}>
      <SiteTitle>Prismoku!</SiteTitle>

      <Meta name="og:description" content="A colorful twist on the classic Sudoku puzzle." />
      <Meta name="og:image" content="/images/prismoku.png" />

      <div class="flex justify-between gap-2 w-full">
        <div class="relative">
          <button
            class="px-4 py-2 bg-white/10 hover:bg-white/20 transition-colors flex items-center gap-2"
            onClick={(e) => {
              e.stopPropagation();
              setShowDifficultyMenu(!showDifficultyMenu());
            }}
          >
            {difficulty().charAt(0).toUpperCase() + difficulty().slice(1)}
            <svg
              class={`w-4 h-4 transition-transform ${showDifficultyMenu() ? 'rotate-180' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <Show when={showDifficultyMenu()}>
            <div class="absolute top-full left-0 mt-1 bg-zinc-900/85 backdrop-blur-sm rounded shadow-xl z-50 min-w-[120px] overflow-hidden difficulty-menu">
              <button
                class="w-full px-4 py-2 text-left hover:bg-white/10 transition-colors"
                onClick={() => {
                  generatePuzzle('easy');
                  setShowDifficultyMenu(false);
                }}
              >
                Easy
              </button>
              <button
                class="w-full px-4 py-2 text-left hover:bg-white/10 transition-colors"
                onClick={() => {
                  generatePuzzle('medium');
                  setShowDifficultyMenu(false);
                }}
              >
                Medium
              </button>
              <button
                class="w-full px-4 py-2 text-left hover:bg-white/10 transition-colors"
                onClick={() => {
                  generatePuzzle('hard');
                  setShowDifficultyMenu(false);
                }}
              >
                Hard
              </button>
            </div>
          </Show>
        </div>

        <button
          class="px-4 py-2 bg-white/10 hover:bg-white/20 transition-colors ml-auto"
          onClick={handleReset}
        >
          Reset
        </button>

        <button
          class="px-4 py-2 bg-white/10 hover:bg-white/20 transition-colors"
          onClick={() => {
            generatePuzzle(difficulty());
          }}
        >
          New Game
        </button>
      </div>

      <h1 class="text-3xl sm:text-4xl font-bold flex mt-5">
        <span style={{ color: COLORS[currentPaletteIndex()].colors[0] }}>P</span>
        <span style={{ color: COLORS[currentPaletteIndex()].colors[1] }}>r</span>
        <span style={{ color: COLORS[currentPaletteIndex()].colors[2] }}>i</span>
        <span style={{ color: COLORS[currentPaletteIndex()].colors[3] }}>s</span>
        <span style={{ color: COLORS[currentPaletteIndex()].colors[4] }}>m</span>
        <span style={{ color: COLORS[currentPaletteIndex()].colors[5] }}>o</span>
        <span style={{ color: COLORS[currentPaletteIndex()].colors[6] }}>k</span>
        <span style={{ color: COLORS[currentPaletteIndex()].colors[7] }}>u</span>
        <span style={{ color: COLORS[currentPaletteIndex()].colors[8] }}>!</span>
      </h1>

      <div
        class="w-full max-w-[min(90vw,500px)] aspect-square rounded-lg p-2 sm:p-4"
      >
        <div class="grid gap-0 w-full h-full" style={{
          "grid-template-columns": `1fr 1fr 1fr ${gap}px 1fr 1fr 1fr ${gap}px 1fr 1fr 1fr`,
          "grid-template-rows": `1fr 1fr 1fr ${gap}px 1fr 1fr 1fr ${gap}px 1fr 1fr 1fr`,
        }}>
          <For each={board()}>
            {(row, rowIndex) => (
              <For each={row}>
                {(cell, colIndex) => {
                  const delay = Math.random() * 0.5;
                  return [
                    rowIndex() > 0 && rowIndex() % 3 === 0 && colIndex() === 0 && <div class="col-span-full" />,
                    <div
                      data-row={rowIndex()}
                      data-col={colIndex()}
                      class={`sudoku-cell w-full aspect-square transition-all duration-200 inline-flex items-center justify-center text-2xl font-bold text-zinc-900
                        ${isComplete() ? 'animate-fade-out' : ''}
                        ${(initialLoad() || isNewGame()) ? 'animate-fade-in' : ''}
                        ${fixedCells()[rowIndex()][colIndex()] ? 'opacity-100 cursor-default pointer-events-none' : 'cursor-pointer hover:bg-white/10'}
                        ${selectedCell()?.row === rowIndex() && selectedCell()?.col === colIndex() ? 'anchor' : ''}
                        ${selectedCell()?.row === rowIndex() && selectedCell()?.col === colIndex() ? 'bg-white/20' : ''}
                      `}
                      style={{
                        'background-color': cell !== null ? getColorHex(cell) : undefined,
                        '--delay': `${delay}s`,
                      }}
                      onClick={handleCellClick}
                    >{fixedCells()[rowIndex()][colIndex()] === false && cell !== null ? '*': ''}</div>,
                    colIndex() < 8 && Number.isInteger((colIndex() + 1) / 3) && <div />,
                  ];
                }}
              </For>
            )}
          </For>
        </div>
      </div>

      <Show when={pickerPosition()}>
        <div
          class="color-menu fixed z-[9999] size-48 transition-all"
          style={{
            top: `${pickerPosition()?.y ?? 0}px`,
            left: `${pickerPosition()?.x ?? 0}px`,
            height: `${pickerPosition()?.size ?? 0}px`,
            width: `${pickerPosition()?.size ?? 0}px`,
            transform: `translate(${offset()}px, ${offset()}px)`,
          }}
        >
          {COLORS[currentPaletteIndex()].colors.map((_, colorIndex) => {
            const cell = selectedCell();
            const isValid = cell ? isValidPlacement(board(), cell.row, cell.col, colorIndex) : true;
            const showInvalid = difficulty() === 'easy';

            return (
              <div
                class="absolute -translate-x-1/2 -translate-y-1/2 opacity-0 pointer-events-auto"
                style={{
                  '--transform': getRadialPosition(colorIndex, palette().length).transform,
                  animation: `fadeInAndSlide 0.15s ease-out forwards ${colorIndex * 0.02}s`,
                }}
              >
                <div
                  class={`w-10 h-10 rounded-full transform transition-transform border-2 border-white/20 hover:scale-110 cursor-pointer shadow-2xl`}
                  style={{
                    'background-color': getColorHex(colorIndex),
                    'opacity': showInvalid && !isValid ? '0.15' : '1',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();

                    if (difficulty() !== 'easy' || isValid) {
                      handleColorSelect(colorIndex);
                    }
                  }}
                />
              </div>
            );
          })}
        </div>
      </Show>

      <Show when={isComplete()}>
        <div class="text-3xl font-bold text-center mt-8">Congratulations! You won!</div>
      </Show>

      <div class="relative mt-4">
        <button
          class="px-4 py-2 bg-white/10 rounded hover:bg-white/20 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            setShowPalettePicker(!showPalettePicker());
          }}
        >
          <div class="flex items-center gap-2">
            <span>Theme</span>
            <div class="flex -space-x-1">
              <For each={COLORS[currentPaletteIndex()].colors.slice(0, 5)}>
                {(color) => (
                  <div
                    class="w-3 h-3 rounded-full border border-white/20"
                    style={{ 'background-color': color }}
                  />
                )}
              </For>
            </div>
            <svg
                class={`w-4 h-4 transition-transform ${showPalettePicker() ? 'rotate-0' : 'rotate-180'}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M19 9l-7 7-7-7" />
              </svg>
          </div>
        </button>

        <Show when={showPalettePicker()}>
          <div class="absolute bottom-full mb-2 p-2 z-50 w-48 bg-zinc-900/85 backdrop-blur-sm rounded shadow-xl">
            <For each={COLORS}>
              {(palette, index) => (
                <button
                  class="w-full px-3 py-2 rounded hover:bg-white/10 transition-colors flex items-center gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentPaletteIndex(index());
                    setShowPalettePicker(false);
                  }}
                >
                  <span class="capitalize">{palette.name}</span>
                  <div class="flex -space-x-1 ml-auto">
                    <For each={COLORS[index()].colors.slice(0, 5)}>
                      {(color) => (
                        <div
                          class="w-3 h-3 rounded-full border border-white/20"
                          style={{ 'background-color': color }}
                        />
                      )}
                    </For>
                  </div>
                </button>
              )}
            </For>
          </div>
        </Show>
      </div>

      <p class="text-xs text-white/50 mt-8 max-w-md text-center">
        How to play: Fill the grid so that every row, column, and 3x3 box contains each color exactly once.
        Click a cell to select it, then choose a color from the radial menu.
      </p>

      <style>
        {`
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
            top: -200px; /* Start higher up */
            left: 0;
            width: 100%;
            height: 200vh; /* Much taller container */
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
        `}
      </style>
    </div>
  );
};

export default Prismoku;
