'use client';

import { useEffect, useState } from 'react';
import SiteTitle from '@/components/Title';

type RGB = {
  r: number;
  g: number;
  b: number;
};

type CMYK = {
  c: number;
  m: number;
  y: number;
  k: number;
};

type ColorMode = 'rgb' | 'cmyk';

export default function HuetifulGame() {
  // Game state
  const [targetColor, setTargetColor] = useState<RGB>({ r: 0, g: 0, b: 0 });
  const [userColor, setUserColor] = useState<RGB>({ r: 0, g: 0, b: 0 });
  const [colorMode, setColorMode] = useState<ColorMode>('rgb');
  const [hasWon, setHasWon] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [hintTimer, setHintTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [timerInterval, setTimerInterval] = useState<ReturnType<typeof setInterval>>();

  // Color conversion functions
  const rgbToCmyk = (rgb: RGB): CMYK => {
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;

    const k = 1 - Math.max(r, g, b);
    const c = (1 - r - k) / (1 - k) || 0;
    const m = (1 - g - k) / (1 - k) || 0;
    const y = (1 - b - k) / (1 - k) || 0;

    return {
      c: Math.round(c * 100),
      m: Math.round(m * 100),
      y: Math.round(y * 100),
      k: Math.round(k * 100),
    };
  };

  const cmykToRgb = (cmyk: CMYK): RGB => {
    const c = cmyk.c / 100;
    const m = cmyk.m / 100;
    const y = cmyk.y / 100;
    const k = cmyk.k / 100;

    const r = Math.round(255 * (1 - c) * (1 - k));
    const g = Math.round(255 * (1 - m) * (1 - k));
    const b = Math.round(255 * (1 - y) * (1 - k));

    return { r, g, b };
  };

  // Computed values for CMYK
  const targetCmyk = rgbToCmyk(targetColor);
  const userCmyk = rgbToCmyk(userColor);

  const handleCmykChange = (channel: keyof CMYK, value: number) => {
    const currentCmyk = userCmyk;
    const newCmyk = { ...currentCmyk, [channel]: value };
    setUserColor(cmykToRgb(newCmyk));
    checkWin();
  };

  const generateRandomColor = () => {
    const MIN_BRIGHTNESS = 100; // At least one channel should be at least this bright
    const MAX_BRIGHTNESS = 250; // At least one channel should be below this
    let r = Math.floor(Math.random() * 256);
    let g = Math.floor(Math.random() * 256);
    let b = Math.floor(Math.random() * 256);

    // If all channels are too dark, boost the brightest one
    const maxChannel = Math.max(r, g, b);
    if (maxChannel < MIN_BRIGHTNESS) {
      if (r === maxChannel) r = MIN_BRIGHTNESS;
      else if (g === maxChannel) g = MIN_BRIGHTNESS;
      else b = MIN_BRIGHTNESS;
    }

    // If all channels are too bright, reduce the dimmest one
    const minChannel = Math.min(r, g, b);
    if (minChannel > MAX_BRIGHTNESS) {
      if (r === minChannel) r = MAX_BRIGHTNESS;
      else if (g === minChannel) g = MAX_BRIGHTNESS;
      else b = MAX_BRIGHTNESS;
    }

    return { r, g, b };
  };

  const generateNewColor = () => {
    setTargetColor(generateRandomColor());
    setUserColor({ r: 0, g: 0, b: 0 });
    setHasWon(false);
    setHint(null);
    if (hintTimer) {
      clearTimeout(hintTimer);
      setHintTimer(null);
    }
    startTimer();

    // Clean up any existing confetti
    const existingConfetti = document.querySelector('.confetti-container');
    if (existingConfetti) {
      document.body.removeChild(existingConfetti);
    }
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
        piece.style.backgroundColor = `rgb(${targetColor.r}, ${targetColor.g}, ${targetColor.b})`;
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

  const checkWin = () => {
    const target = targetColor;
    const user = userColor;

    // Calculate the difference for each channel
    const rDiff = Math.abs(target.r - user.r);
    const gDiff = Math.abs(target.g - user.g);
    const bDiff = Math.abs(target.b - user.b);

    // Check if colors match within a small tolerance
    const tolerance = 5;
    if (rDiff <= tolerance && gDiff <= tolerance && bDiff <= tolerance) {
      setHasWon(true);
      stopTimer();
      createConfetti();
    }
  };

  const handleSliderChange = (channel: keyof RGB, value: number) => {
    setUserColor((prev) => ({ ...prev, [channel]: value }));
    checkWin();
  };

  const handleInputChange = (channel: keyof RGB, value: string) => {
    const numValue = Math.min(255, Math.max(0, parseInt(value) || 0));
    setUserColor((prev) => ({ ...prev, [channel]: numValue }));
    checkWin();
  };

  const getHint = () => {
    const target = targetColor;
    const user = userColor;

    // Find the channel with the biggest difference
    const rDiff = target.r - user.r;
    const gDiff = target.g - user.g;
    const bDiff = target.b - user.b;

    const diffs = [
      { channel: 'Red', diff: Math.abs(rDiff), direction: rDiff > 0 ? '⬆️' : '⬇️' },
      { channel: 'Green', diff: Math.abs(gDiff), direction: gDiff > 0 ? '⬆️' : '⬇️' },
      { channel: 'Blue', diff: Math.abs(bDiff), direction: bDiff > 0 ? '⬆️' : '⬇️' },
    ];

    // Sort by difference to find the biggest one
    diffs.sort((a, b) => b.diff - a.diff);
    const biggest = diffs[0];

    // Clear any existing timer
    if (hintTimer !== null) {
      clearTimeout(hintTimer);
    }

    // Make the hint more prominent with spaces
    setHint(`${biggest.channel} ${biggest.direction} `);

    // Clear hint after 5 seconds
    const timer = setTimeout(() => setHint(null), 5000);
    setHintTimer(timer);
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const startTimer = () => {
    // Clear any existing timer
    if (timerInterval) {
      clearInterval(timerInterval);
    }

    setElapsedTime(0);
    const startTime = Date.now();

    const interval = setInterval(() => {
      setElapsedTime(Date.now() - startTime);
    }, 100);

    setTimerInterval(interval);
  };

  const stopTimer = () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(undefined);
    }
  };

  useEffect(() => {
    generateNewColor();
    return () => {
      stopTimer();
      if (hintTimer) clearTimeout(hintTimer);
    };
  }, []);

  return (
    <main className="flex flex-col items-center min-h-screen gap-8 pb-8 text-white">
      <SiteTitle>huetiful</SiteTitle>

      <div className="absolute top-4 right-4 font-mono text-xl text-white/70">{formatTime(elapsedTime)}</div>

      <div className="flex flex-col items-center gap-8">
        <h1
          className="text-5xl relative px-4 py-2 lowercase"
          style={{
            color: `rgb(${targetColor.r}, ${targetColor.g}, ${targetColor.b})`,
            fontFamily: 'barriecito',
          }}
        >
          <span>huetiful</span>
        </h1>

        {hasWon && <div className="text-xl text-green-500 font-bold animate-bounce">Perfect Match! 🎉</div>}

        <div className="flex gap-8">
          <div className="flex flex-col items-center gap-2">
            <div className="text-sm text-white/50">Target Color</div>
            <div
              className="w-32 h-32 rounded-lg"
              style={{
                backgroundColor: `rgb(${targetColor.r}, ${targetColor.g}, ${targetColor.b})`,
              }}
            />
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="text-sm text-white/50">Your Mix</div>
            <div
              className="w-32 h-32 rounded-lg"
              style={{
                backgroundColor: `rgb(${userColor.r}, ${userColor.g}, ${userColor.b})`,
              }}
            />
          </div>
        </div>
      </div>

      {colorMode === 'rgb' && (
        <div className="grid grid-cols-[max-content_auto_70px] gap-x-4 gap-y-6 w-full max-w-md items-center">
          <label className="text-red-500 self-center">Red</label>
          <input
            type="range"
            min="0"
            max="255"
            value={userColor.r}
            onChange={(e) => handleSliderChange('r', parseInt(e.target.value))}
            className="h-3 bg-red-500/20 rounded-lg appearance-none cursor-pointer accent-red-500 self-center user-select-none"
            disabled={hasWon}
          />
          <input
            type="number"
            min="0"
            max="255"
            value={userColor.r}
            onChange={(e) => handleInputChange('r', e.target.value)}
            className="px-2 py-1 bg-zinc-800 rounded text-center text-red-500 disabled:opacity-50 self-center"
            disabled={hasWon}
          />

          <label className="text-green-500 self-center">Green</label>
          <input
            type="range"
            min="0"
            max="255"
            value={userColor.g}
            onChange={(e) => handleSliderChange('g', parseInt(e.target.value))}
            className="h-3 bg-green-500/20 rounded-lg appearance-none cursor-pointer accent-green-500 self-center user-select-none"
            disabled={hasWon}
          />
          <input
            type="number"
            min="0"
            max="255"
            value={userColor.g}
            onChange={(e) => handleInputChange('g', e.target.value)}
            className="px-2 py-1 bg-zinc-800 rounded text-center text-green-500 disabled:opacity-50 self-center"
            disabled={hasWon}
          />

          <label className="text-blue-500 self-center">Blue</label>
          <input
            type="range"
            min="0"
            max="255"
            value={userColor.b}
            onChange={(e) => handleSliderChange('b', parseInt(e.target.value))}
            className="h-3 bg-blue-500/20 rounded-lg appearance-none cursor-pointer accent-blue-500 self-center user-select-none"
            disabled={hasWon}
          />
          <input
            type="number"
            min="0"
            max="255"
            value={userColor.b}
            onChange={(e) => handleInputChange('b', e.target.value)}
            className="px-2 py-1 bg-zinc-800 rounded text-center text-blue-500 disabled:opacity-50 self-center"
            disabled={hasWon}
          />
        </div>
      )}

      {colorMode === 'cmyk' && (
        <div className="grid grid-cols-[max-content_auto_70px] gap-x-4 gap-y-6 w-full max-w-md items-center">
          <label className="text-cyan-500 self-center">Cyan</label>
          <input
            type="range"
            min="0"
            max="100"
            value={userCmyk.c}
            onChange={(e) => handleCmykChange('c', parseInt(e.target.value))}
            className="h-3 bg-cyan-500/20 rounded-lg appearance-none cursor-pointer accent-cyan-500 self-center user-select-none"
            disabled={hasWon}
          />
          <input
            type="number"
            min="0"
            max="100"
            value={userCmyk.c}
            onChange={(e) => handleCmykChange('c', parseInt(e.target.value))}
            className="px-2 py-1 bg-zinc-800 rounded text-center text-cyan-500 disabled:opacity-50 self-center"
            disabled={hasWon}
          />

          <label className="text-fuchsia-500 self-center">Magenta</label>
          <input
            type="range"
            min="0"
            max="100"
            value={userCmyk.m}
            onChange={(e) => handleCmykChange('m', parseInt(e.target.value))}
            className="h-3 bg-fuchsia-500/20 rounded-lg appearance-none cursor-pointer accent-fuchsia-500 self-center user-select-none"
            disabled={hasWon}
          />
          <input
            type="number"
            min="0"
            max="100"
            value={userCmyk.m}
            onChange={(e) => handleCmykChange('m', parseInt(e.target.value))}
            className="px-2 py-1 bg-zinc-800 rounded text-center text-fuchsia-500 disabled:opacity-50 self-center"
            disabled={hasWon}
          />

          <label className="text-yellow-500 self-center">Yellow</label>
          <input
            type="range"
            min="0"
            max="100"
            value={userCmyk.y}
            onChange={(e) => handleCmykChange('y', parseInt(e.target.value))}
            className="h-3 bg-yellow-500/20 rounded-lg appearance-none cursor-pointer accent-yellow-500 self-center user-select-none"
            disabled={hasWon}
          />
          <input
            type="number"
            min="0"
            max="100"
            value={userCmyk.y}
            onChange={(e) => handleCmykChange('y', parseInt(e.target.value))}
            className="px-2 py-1 bg-zinc-800 rounded text-center text-yellow-500 disabled:opacity-50 self-center"
            disabled={hasWon}
          />

          <label className="text-zinc-500 self-center">Black</label>
          <input
            type="range"
            min="0"
            max="100"
            value={userCmyk.k}
            onChange={(e) => handleCmykChange('k', parseInt(e.target.value))}
            className="h-3 bg-zinc-500/20 rounded-lg appearance-none cursor-pointer accent-zinc-500 self-center user-select-none"
            disabled={hasWon}
          />
          <input
            type="number"
            min="0"
            max="100"
            value={userCmyk.k}
            onChange={(e) => handleCmykChange('k', parseInt(e.target.value))}
            className="px-2 py-1 bg-zinc-800 rounded text-center text-zinc-500 disabled:opacity-50 self-center"
            disabled={hasWon}
          />
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between w-full max-w-md mt-8 gap-12 md:gap-4">
        <button
          onClick={getHint}
          className={`button text-zinc-500 hover:text-zinc-400 active:text-zinc-600 text-center min-w-[140px] ${
            hint ? 'hint-pulse' : ''
          }`}
          disabled={hasWon}
        >
          {hint ?? 'Give me a hint'}
        </button>
        <button
          onClick={generateNewColor}
          className="button text-red-500 hover:text-red-400 active:text-red-600 text-center"
        >
          New game
        </button>
      </div>

      <p className="text-xs text-white/50 mt-8 max-w-md text-center">
        How to play: Use the RGB sliders to mix colors and match the target color shown above. Each slider controls the
        amount of Red, Green, or Blue in your mix (0-255). Get all values right to win!
      </p>

      <div className="flex gap-2 bg-zinc-800 p-1 rounded-lg mt-4">
        <button
          className={`px-4 py-2 rounded-md transition-colors ${
            colorMode === 'rgb' ? 'bg-zinc-700 text-white' : 'text-white/50 hover:text-white'
          }`}
          onClick={() => setColorMode('rgb')}
        >
          RGB
        </button>
        <button
          className={`px-4 py-2 rounded-md transition-colors ${
            colorMode === 'cmyk' ? 'bg-zinc-700 text-white' : 'text-white/50 hover:text-white'
          }`}
          onClick={() => setColorMode('cmyk')}
        >
          CMYK
        </button>
      </div>

      {hint && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-zinc-800 text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in">
          {hint}
        </div>
      )}
    </main>
  );
}
