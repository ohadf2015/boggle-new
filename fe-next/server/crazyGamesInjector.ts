/**
 * CrazyGames SDK Script Injector — Express Middleware
 *
 * Injects the CrazyGames SDK <script> tags into the <head> of HTML responses.
 *
 * WHY THIS EXISTS:
 * - Raw <script> tags in Next.js Server Components are stripped from HTML
 * - next/script beforeInteractive doesn't work with custom Express servers
 * - CrazyGames QA tool requires the SDK script in the initial HTML source
 *
 * This middleware patches the low-level Node.js http.ServerResponse write/end
 * methods (not Express wrappers) to intercept Next.js streaming HTML output.
 *
 * SECURITY: All injected content is static string literals — no user input.
 */
import { Request, Response, NextFunction, RequestHandler } from 'express';
import type http from 'http';

const CRAZYGAMES_FORCE_DISABLED = process.env.NEXT_PUBLIC_CRAZYGAMES_ENABLED === 'false';

// Static script tags to inject
const CRAZYGAMES_SCRIPTS = `<script src="https://sdk.crazygames.com/crazygames-sdk-v3.js"></script><script id="crazygames-bootstrap">(function(){var inIframe=false;try{inIframe=window.self!==window.top}catch(e){inIframe=true}if(!inIframe){window.__crazyGamesEnvironment='disabled';window.__crazyGamesReady=true;return}var attempts=0;function tryInit(){if(window.CrazyGames&&window.CrazyGames.SDK){window.CrazyGames.SDK.init().then(function(){return window.CrazyGames.SDK.getEnvironment()}).then(function(env){window.__crazyGamesEnvironment=env;window.__crazyGamesReady=true;if(env==='crazygames'){document.body&&document.body.classList.add('crazygames-embed');window.CrazyGames.SDK.game.sdkGameLoadingStart();var signalReady=function(){window.CrazyGames.SDK.game.sdkGameLoadingStop()};if(typeof requestIdleCallback==='function'){requestIdleCallback(signalReady,{timeout:3000})}else{setTimeout(signalReady,1000)}}}).catch(function(){window.__crazyGamesEnvironment='disabled';window.__crazyGamesReady=true})}else if(attempts<100){attempts++;setTimeout(tryInit,50)}else{window.__crazyGamesEnvironment='disabled';window.__crazyGamesReady=true}}tryInit()})()</script>`;

/**
 * Express middleware that injects CrazyGames SDK scripts into HTML <head>.
 * Patches the underlying Node.js http.ServerResponse methods directly,
 * which is what Next.js uses for streaming HTML output.
 */
export function crazyGamesScriptInjector(): RequestHandler {
  if (CRAZYGAMES_FORCE_DISABLED) {
    return (_req: Request, _res: Response, next: NextFunction): void => { next(); };
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip non-page requests
    const path = req.path;
    if (path.startsWith('/_next/') || path.startsWith('/api/') || path.startsWith('/socket.io')) {
      next();
      return;
    }



    let injected = false;

    // Patch the underlying http.ServerResponse methods — Next.js uses these
    // directly, bypassing Express's res.write/res.end wrappers.
    const rawRes = res as unknown as http.ServerResponse;
    const originalWrite = rawRes.write.bind(rawRes);
    const originalEnd = rawRes.end.bind(rawRes);

    function processChunk(chunk: unknown): unknown {
      if (injected || !chunk) return chunk;

      // Convert any buffer-like or string chunk to a string for injection
      let str: string;
      const isString = typeof chunk === 'string';
      if (isString) {
        str = chunk;
      } else if (Buffer.isBuffer(chunk)) {
        str = chunk.toString('utf8');
      } else if (chunk instanceof Uint8Array) {
        str = Buffer.from(chunk).toString('utf8');
      } else {
        return chunk;
      }

      // Look for <head> or <head ...> tag
      const match = str.match(/<head[^>]*>/);
      if (match && match.index !== undefined) {
        const insertIdx = match.index + match[0].length;
        injected = true;
        const result = str.slice(0, insertIdx) + CRAZYGAMES_SCRIPTS + str.slice(insertIdx);
        return isString ? result : Buffer.from(result, 'utf8');
      }

      return chunk;
    }

    rawRes.write = function (chunk: unknown, ...args: unknown[]): boolean {
      const modified = processChunk(chunk);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (originalWrite as any)(modified, ...args);
    } as typeof rawRes.write;

    rawRes.end = function (chunk?: unknown, ...args: unknown[]): http.ServerResponse {
      const modified = processChunk(chunk);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (originalEnd as any)(modified, ...args);
    } as typeof rawRes.end;

    next();
  };
}
