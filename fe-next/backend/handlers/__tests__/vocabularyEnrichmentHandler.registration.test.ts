/**
 * Test: Vocabulary Enrichment Handler Registration
 *
 * TDD: RED phase - Verify handler is properly registered
 */

import { createServer } from 'http';
import { Server } from 'socket.io';
import { io as Client } from 'socket.io-client';
import type { Socket as ClientSocket } from 'socket.io-client';

describe('vocabularyEnrichmentHandler registration', () => {
  let io: Server;
  let clientSocket: ClientSocket;
  let httpServer: ReturnType<typeof createServer>;
  const port = 3099; // Unique port for this test

  beforeAll((done) => {
    httpServer = createServer();
    io = new Server(httpServer);

    // Import and register handlers after server setup
    import('../index.js').then(({ registerAllHandlers }) => {
      io.on('connection', (socket) => {
        registerAllHandlers(io, socket);
      });

      httpServer.listen(port, () => {
        clientSocket = Client(`http://localhost:${port}`);
        clientSocket.on('connect', done);
      });
    });
  });

  afterAll(() => {
    io.close();
    clientSocket.close();
    httpServer.close();
  });

  it('should respond to enrichVocabulary event (not timeout)', (done) => {
    const timeout = setTimeout(() => {
      done(new Error('Timeout: enrichVocabulary handler not registered - no response received'));
    }, 3000);

    // Listen for response OR error (both indicate handler is registered)
    clientSocket.on('vocabularyEnriched', () => {
      clearTimeout(timeout);
      done();
    });

    clientSocket.on('error', (error) => {
      clearTimeout(timeout);
      // Even an error response means the handler is registered
      // (e.g., validation error is fine - it means the event was received)
      done();
    });

    // Emit the event
    clientSocket.emit('enrichVocabulary', {
      words: [],
      language: 'en',
    });
  });
});
