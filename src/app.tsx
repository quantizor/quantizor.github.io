import { MetaProvider } from "@solidjs/meta";
import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";

import "./app.css";

export default function App() {
  return (
    <MetaProvider>
      <Router
        root={(props) => (
          <>
            <Suspense>
              {props.location.pathname !== "/" && (
                <a
                  class="relative md:absolute top-4 left-4 leading-none text-2xl z-20"
                  title="Back to index"
                  href="/"
                >
                  ↰
                </a>
              )}
              {props.children}
            </Suspense>
          </>
        )}
      >
        <FileRoutes />
      </Router>
    </MetaProvider>
  );
}
