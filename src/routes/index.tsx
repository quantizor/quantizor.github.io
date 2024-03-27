import { createEffect, createSignal } from 'solid-js';

import SiteTitle from '~/components/Title';

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
      <SiteTitle>quantizor's lab</SiteTitle>
      <main class="flex grow justify-center items-center max-h-screen text-center mx-auto p-4">
        <pre
          class="text-[1.5vw] md:text-xs"
          onPointerOut={() => setPaused(false)}
          onPointerOver={() => setPaused(true)}
        >
          {view()}
        </pre>
      </main>
      <footer class="border-current border-[1px] py-1 px-3 inline-flex gap-5 justify-center text-center text-lime-100 rounded self-center absolute top-3/4 left-1/2 translate-x-[-50%] translate-y-[-50%]">
        Coming soon
      </footer>
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
  ░▒███▒█▄ ▒▒█████▓  ▓█   ▓██▒▒██░   ▓██░  ▒██▒ ░ ░██░▒███████▒░ ████▓▒░░██▓ ▒██▒
   ░░ ▒▒░ ▒ ░▒▓▒ ▒ ▒  ▒▒   ▓▒█░░ ▒░   ▒ ▒   ▒ ░░   ░▓  ░▒▒ ▓░▒░▒░ ▒░▒░▒░ ░ ▒▓ ░▒▓░
   ░ ▒░  ░ ░░▒░ ░ ░   ▒   ▒▒ ░░ ░░   ░ ▒░    ░     ▒ ░░░▒ ▒ ░ ▒  ░ ▒ ▒░   ░▒ ░ ▒░
    ░   ░  ░░░ ░ ░   ░   ▒      ░   ░ ░   ░       ▒ ░░ ░ ░ ░ ░░ ░ ░ ▒    ░░   ░
    ░       ░           ░  ░         ░           ░    ░ ░        ░ ░     ░
                                                     ░
 `,
  String.raw`
 ___           ___           ___           ___           ___                       ___           ___           ___
 /\  \         /\__\         /\  \         /\__\         /\  \          ___        /\  \         /\  \         /\  \
/::\  \       /:/  /        /::\  \       /::|  |        \:\  \        /\  \       \:\  \       /::\  \       /::\  \
/:/\:\  \     /:/  /        /:/\:\  \     /:|:|  |         \:\  \       \:\  \       \:\  \     /:/\:\  \     /:/\:\  \
\:\~\:\  \   /:/  /  ___   /::\~\:\  \   /:/|:|  |__       /::\  \      /::\__\       \:\  \   /:/  \:\  \   /::\~\:\  \
\:\ \:\__\ /:/__/  /\__\ /:/\:\ \:\__\ /:/ |:| /\__\     /:/\:\__\  __/:/\/__/ _______\:\__\ /:/__/ \:\__\ /:/\:\ \:\__\
 \:\/:/  / \:\  \ /:/  / \/__\:\/:/  / \/__|:|/:/  /    /:/  \/__/ /\/:/  /    \::::::::/__/ \:\  \ /:/  / \/_|::\/:/  /
  \::/  /   \:\  /:/  /       \::/  /      |:/:/  /    /:/  /      \::/__/      \:\~~\~~      \:\  /:/  /     |:|::/  /
  /:/  /     \:\/:/  /        /:/  /       |::/  /     \/__/        \:\__\       \:\  \        \:\/:/  /      |:|\/__/
 /:/  /       \::/  /        /:/  /        /:/  /                    \/__/        \:\__\        \::/  /       |:|  |
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