// @refresh reload
import { createHandler, StartServer } from '@solidjs/start/server';

export default createHandler(() => (
  <StartServer
    document={({ assets, children, scripts }) => (
      <html class="bg-zinc-900 text-lime-100 font-mono h-screen" lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" href="/favicon.png" />
          {assets}
        </head>
        <body class="h-screen">
          <div class="h-screen flex flex-col" id="app">
            {children}
          </div>
          {scripts}
        </body>
      </html>
    )}
  />
));
