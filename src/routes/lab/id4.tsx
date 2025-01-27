import SiteTitle from "@/components/Title";
import { Meta } from "@solidjs/meta";
import {
  Component,
  createEffect,
  createMemo,
  createSignal,
  onMount,
  Show,
} from "solid-js";

type RGB = { r: number; g: number; b: number };
type CMYK = { c: number; m: number; y: number; k: number };
type ColorMode = "rgb" | "cmyk";

const ColorMatcher: Component = () => {
  const [targetColor, setTargetColor] = createSignal<RGB>({ r: 0, g: 0, b: 0 });
  const [userColor, setUserColor] = createSignal<RGB>({ r: 0, g: 0, b: 0 });
  const [colorMode, setColorMode] = createSignal<ColorMode>("rgb");
  const [hasWon, setHasWon] = createSignal(false);
  const [hint, setHint] = createSignal<string | null>(null);
  const [hintTimer, setHintTimer] = createSignal<ReturnType<
    typeof window.setTimeout
  > | null>(null);

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

  // Computed signals for CMYK values
  const targetCmyk = createMemo(() => rgbToCmyk(targetColor()));
  const userCmyk = createMemo(() => rgbToCmyk(userColor()));

  const handleCmykChange = (channel: keyof CMYK, value: number) => {
    const currentCmyk = userCmyk();
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
    setUserColor({ r: 0, g: 0, b: 0 }); // Start from black instead of mid-gray
    setHasWon(false);
  };

  const createConfetti = () => {
    const confetti = document.createElement("div");
    confetti.className = "confetti-container";
    document.body.appendChild(confetti);

    // Create confetti pieces every 100ms
    let piecesCreated = 0;
    const createPieces = () => {
      for (let i = 0; i < 20; i++) {
        const piece = document.createElement("div");
        piece.className = "confetti-piece";
        piece.style.setProperty("--x", `${Math.random() * 100}vw`);
        piece.style.setProperty("--rotation", `${Math.random() * 360}deg`);
        piece.style.backgroundColor = `rgb(${targetColor().r}, ${
          targetColor().g
        }, ${targetColor().b})`;
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
    const target = targetColor();
    const user = userColor();

    // Calculate the difference for each channel
    const rDiff = Math.abs(target.r - user.r);
    const gDiff = Math.abs(target.g - user.g);
    const bDiff = Math.abs(target.b - user.b);

    // Check if colors match within a small tolerance
    const tolerance = 5;
    const isMatch =
      rDiff <= tolerance && gDiff <= tolerance && bDiff <= tolerance;

    // Only trigger win if all values have been intentionally set
    const hasInteracted = user.r !== 0 || user.g !== 0 || user.b !== 0;

    if (isMatch && hasInteracted && !hasWon()) {
      setHasWon(true);
      createConfetti();
    } else if (!isMatch && hasWon()) {
      setHasWon(false);
    }
  };

  const handleSliderChange = (channel: "r" | "g" | "b", value: number) => {
    setUserColor((prev) => ({ ...prev, [channel]: value }));
    checkWin();
  };

  const handleInputChange = (channel: "r" | "g" | "b", value: string) => {
    const numValue = Math.min(255, Math.max(0, parseInt(value) || 0));
    setUserColor((prev) => ({ ...prev, [channel]: numValue }));
    checkWin();
  };

  const getHint = () => {
    const target = targetColor();
    const user = userColor();

    // Find the channel with the biggest difference
    const rDiff = target.r - user.r;
    const gDiff = target.g - user.g;
    const bDiff = target.b - user.b;

    const diffs = [
      {
        channel: "Red",
        diff: Math.abs(rDiff),
        direction: rDiff > 0 ? "⬆️" : "⬇️",
      },
      {
        channel: "Green",
        diff: Math.abs(gDiff),
        direction: gDiff > 0 ? "⬆️" : "⬇️",
      },
      {
        channel: "Blue",
        diff: Math.abs(bDiff),
        direction: bDiff > 0 ? "⬆️" : "⬇️",
      },
    ];

    // Sort by difference to find the biggest one
    diffs.sort((a, b) => b.diff - a.diff);
    const biggest = diffs[0];

    // Clear any existing timer
    const currentTimer = hintTimer();
    if (currentTimer !== null) {
      clearTimeout(currentTimer);
    }

    // Make the hint more prominent with spaces
    setHint(`${biggest.channel} ${biggest.direction} `);

    // Clear hint after 5 seconds
    const timer = setTimeout(() => setHint(null), 5000);
    setHintTimer(timer);
  };

  onMount(() => {
    generateNewColor();
  });

  return (
    <>
      <Meta
        name="description"
        content="Huenigma - A color matching puzzle game"
      />
      <SiteTitle />

      <main class="flex flex-col items-center min-h-screen gap-8 pb-8 text-white">
        <div class="flex flex-col items-center gap-8">
          <h1
            class="text-5xl font-normal relative px-4 py-2 font-barriecito lowercase"
            style={{
              color: `rgb(${targetColor().r}, ${targetColor().g}, ${
                targetColor().b
              })`,
            }}
          >
            <span>huenigma</span>
          </h1>

          <Show when={hasWon()}>
            <div class="text-xl text-green-500 font-bold animate-bounce">
              Perfect Match! 🎉
            </div>
          </Show>

          <div class="flex gap-8">
            <div class="flex flex-col items-center gap-2">
              <div class="text-sm text-white/50">Target Color</div>
              <div
                class="w-32 h-32 rounded-lg"
                style={{
                  "background-color": `rgb(${targetColor().r}, ${
                    targetColor().g
                  }, ${targetColor().b})`,
                }}
              />
            </div>

            <div class="flex flex-col items-center gap-2">
              <div class="text-sm text-white/50">Your Mix</div>
              <div
                class="w-32 h-32 rounded-lg"
                style={{
                  "background-color": `rgb(${userColor().r}, ${
                    userColor().g
                  }, ${userColor().b})`,
                }}
              />
            </div>
          </div>
        </div>

        <Show when={colorMode() === "rgb"}>
          <div class="grid grid-cols-[max-content_auto_70px] gap-x-4 gap-y-6 w-full max-w-md items-center">
            <label class="text-red-500 self-center">Red</label>
            <input
              type="range"
              min="0"
              max="255"
              value={userColor().r}
              onInput={(e) =>
                handleSliderChange("r", parseInt(e.currentTarget.value))
              }
              class="h-3 bg-red-500/20 rounded-lg appearance-none cursor-pointer accent-red-500 self-center user-select-none"
              disabled={hasWon()}
            />
            <input
              type="number"
              min="0"
              max="255"
              value={userColor().r}
              onInput={(e) => handleInputChange("r", e.currentTarget.value)}
              class="px-2 py-1 bg-zinc-800 rounded text-center text-red-500 disabled:opacity-50 self-center"
              disabled={hasWon()}
            />

            <label class="text-green-500 self-center">Green</label>
            <input
              type="range"
              min="0"
              max="255"
              value={userColor().g}
              onInput={(e) =>
                handleSliderChange("g", parseInt(e.currentTarget.value))
              }
              class="h-3 bg-green-500/20 rounded-lg appearance-none cursor-pointer accent-green-500 self-center user-select-none"
              disabled={hasWon()}
            />
            <input
              type="number"
              min="0"
              max="255"
              value={userColor().g}
              onInput={(e) => handleInputChange("g", e.currentTarget.value)}
              class="px-2 py-1 bg-zinc-800 rounded text-center text-green-500 disabled:opacity-50 self-center"
              disabled={hasWon()}
            />

            <label class="text-blue-500 self-center">Blue</label>
            <input
              type="range"
              min="0"
              max="255"
              value={userColor().b}
              onInput={(e) =>
                handleSliderChange("b", parseInt(e.currentTarget.value))
              }
              class="h-3 bg-blue-500/20 rounded-lg appearance-none cursor-pointer accent-blue-500 self-center user-select-none"
              disabled={hasWon()}
            />
            <input
              type="number"
              min="0"
              max="255"
              value={userColor().b}
              onInput={(e) => handleInputChange("b", e.currentTarget.value)}
              class="px-2 py-1 bg-zinc-800 rounded text-center text-blue-500 disabled:opacity-50 self-center"
              disabled={hasWon()}
            />
          </div>
        </Show>

        <Show when={colorMode() === "cmyk"}>
          <div class="grid grid-cols-[max-content_auto_70px] gap-x-4 gap-y-6 w-full max-w-md items-center">
            <label class="text-cyan-500 self-center">Cyan</label>
            <input
              type="range"
              min="0"
              max="100"
              value={userCmyk().c}
              onInput={(e) =>
                handleCmykChange("c", parseInt(e.currentTarget.value))
              }
              class="h-3 bg-cyan-500/20 rounded-lg appearance-none cursor-pointer accent-cyan-500 self-center user-select-none"
              disabled={hasWon()}
            />
            <input
              type="number"
              min="0"
              max="100"
              value={userCmyk().c}
              onInput={(e) =>
                handleCmykChange("c", parseInt(e.currentTarget.value))
              }
              class="px-2 py-1 bg-zinc-800 rounded text-center text-cyan-500 disabled:opacity-50 self-center"
              disabled={hasWon()}
            />

            <label class="text-fuchsia-500 self-center">Magenta</label>
            <input
              type="range"
              min="0"
              max="100"
              value={userCmyk().m}
              onInput={(e) =>
                handleCmykChange("m", parseInt(e.currentTarget.value))
              }
              class="h-3 bg-fuchsia-500/20 rounded-lg appearance-none cursor-pointer accent-fuchsia-500 self-center user-select-none"
              disabled={hasWon()}
            />
            <input
              type="number"
              min="0"
              max="100"
              value={userCmyk().m}
              onInput={(e) =>
                handleCmykChange("m", parseInt(e.currentTarget.value))
              }
              class="px-2 py-1 bg-zinc-800 rounded text-center text-fuchsia-500 disabled:opacity-50 self-center"
              disabled={hasWon()}
            />

            <label class="text-yellow-500 self-center">Yellow</label>
            <input
              type="range"
              min="0"
              max="100"
              value={userCmyk().y}
              onInput={(e) =>
                handleCmykChange("y", parseInt(e.currentTarget.value))
              }
              class="h-3 bg-yellow-500/20 rounded-lg appearance-none cursor-pointer accent-yellow-500 self-center user-select-none"
              disabled={hasWon()}
            />
            <input
              type="number"
              min="0"
              max="100"
              value={userCmyk().y}
              onInput={(e) =>
                handleCmykChange("y", parseInt(e.currentTarget.value))
              }
              class="px-2 py-1 bg-zinc-800 rounded text-center text-yellow-500 disabled:opacity-50 self-center"
              disabled={hasWon()}
            />

            <label class="text-zinc-500 self-center">Black</label>
            <input
              type="range"
              min="0"
              max="100"
              value={userCmyk().k}
              onInput={(e) =>
                handleCmykChange("k", parseInt(e.currentTarget.value))
              }
              class="h-3 bg-zinc-500/20 rounded-lg appearance-none cursor-pointer accent-zinc-500 self-center user-select-none"
              disabled={hasWon()}
            />
            <input
              type="number"
              min="0"
              max="100"
              value={userCmyk().k}
              onInput={(e) =>
                handleCmykChange("k", parseInt(e.currentTarget.value))
              }
              class="px-2 py-1 bg-zinc-800 rounded text-center text-zinc-500 disabled:opacity-50 self-center"
              disabled={hasWon()}
            />
          </div>
        </Show>

        <div class="flex flex-col md:flex-row justify-between w-full max-w-md mt-8 gap-12 md:gap-4">
          <button
            onClick={getHint}
            class={`button text-zinc-500 hover:text-zinc-400 active:text-zinc-600 text-center min-w-[140px] ${
              hint() ? "hint-pulse" : ""
            }`}
            disabled={hasWon()}
          >
            {hint() ?? "Give me a hint"}
          </button>
          <button
            onClick={generateNewColor}
            class="button text-red-500 hover:text-red-400 active:text-red-600 text-center"
          >
            New game
          </button>
        </div>

        <p class="text-xs text-white/50 mt-8 max-w-md text-center">
          How to play: Use the RGB sliders to mix colors and match the target
          color shown above. Each slider controls the amount of Red, Green, or
          Blue in your mix (0-255). Get all values right to win!
        </p>

        <div class="flex gap-2 bg-zinc-800 p-1 rounded-lg mt-4">
          <button
            class={`px-4 py-2 rounded-md transition-colors ${
              colorMode() === "rgb"
                ? "bg-zinc-700 text-white"
                : "text-white/50 hover:text-white"
            }`}
            onClick={() => setColorMode("rgb")}
          >
            RGB
          </button>
          <button
            class={`px-4 py-2 rounded-md transition-colors ${
              colorMode() === "cmyk"
                ? "bg-zinc-700 text-white"
                : "text-white/50 hover:text-white"
            }`}
            onClick={() => setColorMode("cmyk")}
          >
            CMYK
          </button>
        </div>

        <Show when={hint()}>
          <div class="fixed bottom-8 left-1/2 -translate-x-1/2 bg-zinc-800 text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in">
            {hint()}
          </div>
        </Show>
      </main>

      <style>{`
        @keyframes confetti-slow {
          0% { transform: translate3d(0, 0, 0) rotateX(0) rotateY(0); }
          100% { transform: translate3d(25px, 105vh, 0) rotateX(360deg) rotateY(180deg); }
        }

        @keyframes confetti-medium {
          0% { transform: translate3d(0, 0, 0) rotateX(0) rotateY(0); }
          100% { transform: translate3d(100px, 105vh, 0) rotateX(100deg) rotateY(360deg); }
        }

        @keyframes confetti-fast {
          0% { transform: translate3d(0, 0, 0) rotateX(0) rotateY(0); }
          100% { transform: translate3d(-50px, 105vh, 0) rotateX(10deg) rotateY(250deg); }
        }

        @keyframes hint-pulse {
          0% {
            box-shadow: 0 0 5px rgba(251, 191, 36, 0);
          }
          50% {
            box-shadow: 0 0 15px rgba(251, 191, 36, 0.6);
          }
          100% {
            box-shadow: 0 0 5px rgba(251, 191, 36, 0);
          }
        }

        .hint-pulse {
          animation: hint-pulse 1s ease-in-out infinite;
        }

        .confetti-container {
          perspective: 700px;
          position: absolute;
          overflow: hidden;
          top: 0;
          right: 0;
          bottom: 0;
          left: 0;
        }

        .confetti {
          position: absolute;
          z-index: 1;
          top: -10px;
          border-radius: 0%;
        }

        .confetti--animation-slow {
          animation: confetti-slow 2.25s linear 1 forwards;
        }

        .confetti--animation-medium {
          animation: confetti-medium 1.75s linear 1 forwards;
        }

        .confetti--animation-fast {
          animation: confetti-fast 1.25s linear 1 forwards;
        }
      `}</style>
    </>
  );
};

export default ColorMatcher;
