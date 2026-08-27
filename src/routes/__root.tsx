import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import appCss from "../styles.css?url";
import "../styles.css";

const APP_NAME = "The Luminous Circuit";

const CRITICAL = `
html,body,#app{height:100%;margin:0;background:#070910;color:#e8eef8;font-family:system-ui,sans-serif}
.circuit-root{position:relative;width:100%;height:100dvh;height:100svh;background:#070910;overflow:hidden;color:#e8eef8;font-family:system-ui,sans-serif}
.circuit-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;background:#020308;touch-action:none}
`;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content:
          "width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no",
      },
      { title: APP_NAME },
      { name: "theme-color", content: "#070910" },
      { name: "color-scheme", content: "dark" },
      { name: "format-detection", content: "telephone=no" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "mobile-web-app-capable", content: "yes" },
      {
        name: "description",
        content:
          "Walk the living crystal city of the Luminous Circuit. Offer intention at the Core Spire.",
      },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
    ],
    styles: [{ children: CRITICAL }],
  }),
  component: () => (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body suppressHydrationWarning>
        <div
          id="lc-static-boot"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2147483646,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            background: "#070910",
            color: "#e8eef8",
            fontFamily: "system-ui,sans-serif",
            padding: 24,
            textAlign: "center",
          }}
        >
          <span style={{ letterSpacing: "0.28em", fontSize: 11, color: "#c9a66b", textTransform: "uppercase" }}>
            Luminous Circuit
          </span>
          <button
            id="lc-static-go"
            type="button"
            style={{
              border: 0,
              background: "transparent",
              color: "#7ef0ff",
              fontSize: 32,
              fontWeight: 700,
              padding: 16,
            }}
          >
            Tap to land
          </button>
          <span id="lc-static-sub" style={{ color: "#8b93a7", fontSize: 15 }}>
            Opening Core Spire…
          </span>
        </div>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){document.documentElement.style.background='#070910';var boot=document.getElementById('lc-static-boot');var go=document.getElementById('lc-static-go');var sub=document.getElementById('lc-static-sub');var taps=0;function hide(){if(boot)boot.style.display='none';}function land(){if(window.__LC_LAND){try{window.__LC_LAND();}catch(e){}if(window.__LC_BOOTED)hide();return;}taps+=1;if(sub)sub.textContent=taps>1?'Retrying…':'Still opening…';if(taps>1)location.replace(location.pathname+'?r='+Date.now());}if(go)go.onclick=function(e){e.preventDefault();land();};if(boot)boot.addEventListener('pointerdown',function(){land();});var n=0;setInterval(function(){if(window.__LC_BOOTED)hide();n+=1;if(!window.__LC_BOOTED&&sub&&n===12)sub.textContent='Slow wake. Tap twice to retry.';},400);})();`,
          }}
        />
        <PreviewHostBridge />
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});
