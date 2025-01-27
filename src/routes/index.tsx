import { FaBrandsGithub } from "solid-icons/fa";
import { createEffect, createSignal } from "solid-js";

import SiteTitle from "@/components/Title";
import { profiles } from "@/resume.json";

export default function Home() {
  const [handle, setHandle] = createSignal<null | number>(null);
  const [paused, setPaused] = createSignal(false);
  const [view, setView] = createSignal(views[0]);

  createEffect(() => {
    if (paused()) {
      clearInterval(handle() ?? undefined);
    } else {
      setHandle(
        window.setInterval(() => {
          const target = views.indexOf(view()) + 1;
          setView(target >= views.length ? views[0] : views[target]);
        }, 1000)
      );
    }
  });

  return (
    <>
      <SiteTitle />

      <main class="flex grow md:justify-center items-center max-h-screen text-center mx-auto p-4">
        <pre
          class="text-[1.5vw] absolute max-w-full md:text-xs text-amber-400"
          onPointerOut={() => setPaused(false)}
          onPointerOver={() => setPaused(true)}
        >
          {view()}
        </pre>
      </main>

      <footer class="flex flex-wrap gap-5 justify-center text-center self-center absolute top-[40vh] md:top-3/4 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <a class="button" href="/cv">
          CV
        </a>
        <a class="button" href="/lab/id1">
          ID1
        </a>
        <a class="button rainbow-border" href="/lab/id2">
          <span class="rainbow-text">Prismoku</span>
        </a>
        <a class="button huetiful-border" href="/lab/id4">
          <span>huetiful</span>
        </a>
      </footer>

      <div class="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-5 items-center">
        <a title="GitHub" href={profiles.github}>
          <FaBrandsGithub height={24} />
        </a>

        <a title="X/Twitter" href={profiles.x}>
          <span class="text-[20px]">𝕏</span>
        </a>
      </div>
    </>
  );
}

const views = [
  String.raw`
 ________  ___  ___  ________  ________   _________  ___  ________  ________  ________
|\   __  \|\  \|\  \|\   __  \|\   ___  \|\___   ___\\  \|\_____  \|\   __  \|\   __  \
\ \  \|\  \ \  \\\  \ \  \|\  \ \  \\ \  \|___ \  \_\ \  \\|___/  /\ \  \|\  \ \  \|\  \
 \ \  \\\  \ \  \\\  \ \   __  \ \  \\ \  \   \ \  \ \ \  \   /  / /\ \  \\\  \ \   _  _\
  \ \  \\\  \ \  \\\  \ \  \ \  \ \  \\ \  \   \ \  \ \ \  \ /  /_/__\ \  \\\  \ \  \\  \|
   \ \_____  \ \_______\ \__\ \__\ \__\\ \__\   \ \__\ \ \__\\________\ \_______\ \__\\ _\
    \|___| \__\|_______|\|__|\|__|\|__| \|__|    \|__|  \|__|\|_______|\|_______|\|__|\|__|
`,

  String.raw`
██████╗ ██╗   ██╗ █████╗ ███╗   ██╗████████╗██╗███████╗ ██████╗ ██████╗
██╔═══██╗██║   ██║██╔══██╗████╗  ██║╚══██╔══╝██║╚══███╔╝██╔═══██╗██╔══██╗
██║   ██║██║   ██║███████║██╔██╗ ██║   ██║   ██║  ███╔╝ ██║   ██║██████╔╝
██║▄▄ ██║██║   ██║██╔══██║██║╚██╗██║   ██║   ██║ ███╔╝  ██║   ██║██╔══██╗
╚██████╔╝╚██████╔╝██║  ██║██║ ╚████║   ██║   ██║███████╗╚██████╔╝██║  ██║
 ╚══▀▀═╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝   ╚═╝   ╚═╝╚══════╝ ╚═════╝ ╚═╝  ╚═╝`,

  String.raw`
   █████   █    ██  ▄▄▄       ███▄    █ ▄▄▄█████▓ ██▓▒███████▒ ▒█████   ██▀███
  ▒██▓  ██▒ ██  ▓██▒▒████▄     ██ ▀█   █ ▓  ██▒ ▓▒▓██▒▒ ▒ ▒ ▄▀░▒██▒  ██▒▓██ ▒ ██▒
  ▒██▒  ██░▓██  ▒██░▒██  ▀█▄  ▓██  ▀█ ██▒▒ ▓██░ ▒░▒██▒░ ▒ ▄▀▒░ ▒██░  ██▒▓██ ░▄█ ▒
 ░██  █▀ ░▓▓█  ░██░░██▄▄▄▄██ ▓██▒  ▐▌██▒░ ▓██▓ ░ ░██░  ▄▀▒   ░▒██   ██░▒██▀▀█▄
  ░▒███▒█▄ ▒█████▓  ▓█   ▓██▒▒██░   ▓██░  ▒██▒ ░ ░██░▒███████▒░ ████▓▒░░██▓ ▒██▒
   ░░ ▒▒░ ▒ ░▒▓▒ ▒ ▒  ▒▒   ▓▒█░░ ▒░   ▒ ▒   ▒ ░░   ░▓  ░▒▒ ▓░▒░▒░ ▒░▒░▒░ ░ ▒▓ ░▒▓░
   ░ ▒░  ░ ░░▒░ ░ ░   ▒   ▒▒ ░░ ░░   ░ ▒░    ░     ▒ ░░░▒ ▒ ░ ▒  ░ ▒ ▒░   ░▒ ░ ▒░
    ░   ░  ░░░ ░ ░   ░   ▒      ░   ░ ░   ░       ▒ ░░ ░ ░ ░ ░░ ░ ░ ▒    ░░   ░
                                                     ░
 `,
  String.raw`
 ___           ___           ___           ___           ___                       ___           ___           ___
 /\  \         /\__\         /\  \         /\__\         /\  \          ___        /\  \         /\  \         /\  \
/::\  \       /:/  /        /::\  \       /::|  |        \:\  \        /\  \       \:\  \       /::\  \       /::\  \
/:/\:\  \     /:/  /  ___   /:/\:\  \     /:|:|  |__       /::\  \      /::\__\       \:\  \     /:/\:\  \     /:/\:\  \
\:\~\:\  \   /:/__/  /\__\ /:/\:\  \   /:/ |:| /\__\     /:/\:\__\  __/:/\/__/ _______\:\__\   /:/  \:\  \   /::\~\:\  \
\:\ \:\__\ /:/  /  /:/  / \/__\:\/:/  / \/__|:|/:/  /    /:/  \/__/ /\/:/  /    \::::::::/__/ \:\  \ /:/  /   /:/\:\ \:\__\
 \:\/:/  / \:\  /:/  /       \::/  /      |:/:/  /     \/__/        \::/__/      \:\~~\~~      \:\  /:/  /    \/_|::\/:/  /
 /:/  /     \:\  /:/  /        /:/  /       |::/  /                    \/__/        \:\  \        \:\/:/  /       |:|::/  /
 \/__/         \/__/         \/__/         \/__/                                   \/__/         \/__/         \|__|
 `,
  String.raw`
 --.- ..- .- -. - .. --.. --- .-.
 `,
  String.raw`

 @@@@@@    @@@  @@@   @@@@@@   @@@  @@@  @@@@@@@  @@@  @@@@@@@@   @@@@@@   @@@@@@@
@@@@@@@@   @@@  @@@  @@@@@@@@  @@@@ @@@  @@@@@@@  @@@  @@@@@@@@  @@@@@@@@  @@@@@@@@
@@!  @@@   @@!  @@@  @@!  @@@  @@!@!@@@    @@!    @@!       @@!  @@!  @@@  @@!  @@@
!@!  @!@   !@!  @!@  !@!  @!@  !@!!@!@!    !@!    !@!      !@!   !@!  @!@  !@!  @!@
@!@  !@!   @!@  !@!  @!@!@!@!  @!@ !!@!    @!!    !!@     @!!    @!@  !@!  @!@!!@!
!@!  !!!   !@!  !!!  !!!@!!!!  !@!  !!!    !!!    !!!    !!!     !@!  !!!  !!@!@!
!!:!!:!:   !!:  !!!  !!:  !!!  !!:  !!!    !!:    !!:   !!:      !!:  !!!  !!: :!!
:!: :!:    :!:  !:!  :!:  !:!  :!:  !:!    :!:    :!:  :!:       :!:  !:!  :!:  !:!
::::: :!   ::::: ::  ::   :::   ::   ::     ::     ::   :: ::::  ::::: ::  ::   :::
 : :  :::   : :  :    :   : :  ::    :      :     :    : :: : :   : :  :    :   : :
 `,
];
