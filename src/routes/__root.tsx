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
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){document.documentElement.style.background='#070910';if(!/SamsungBrowser/i.test(navigator.userAgent||''))return;var s=document.createElement('script');s.type='module';s.src='/__client.js';s.onerror=function(){var b=document.createElement('button');b.textContent='Retry land';b.setAttribute('style','position:fixed;left:24px;right:24px;bottom:96px;height:52px;border:0;border-radius:12px;background:#e8eef8;color:#070910;font-weight:800;font-size:18px;font-family:system-ui,sans-serif');b.onclick=function(){location.reload()};document.body.appendChild(b);};document.head.appendChild(s);})();`,
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
