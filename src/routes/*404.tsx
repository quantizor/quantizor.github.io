import SiteTitle from "@/components/Title";

export default function NotFound() {
  return (
    <div class="flex flex-col h-full justify-center gap-6 text-center">
      <SiteTitle>404</SiteTitle>
      <h1 class="text-amber-400 text-2xl font-bold">You seem lost</h1>
      <p>You don't have to go home, but there's more to do elsewhere (↰)</p>
    </div>
  );
}
