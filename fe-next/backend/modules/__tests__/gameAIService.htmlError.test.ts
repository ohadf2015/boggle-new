/**
 * Test HTML error responses from Vertex AI
 * Tests the fix for: "Unexpected token '<', "<!DOCTYPE "... is not valid JSON"
 */

import { GameAIService } from '../gameAIService';

describe('GameAIService - HTML Error Responses', () => {
  let service: GameAIService;

  beforeEach(() => {
    service = new GameAIService();
  });

  describe('parseValidationResponse', () => {
    it('should detect and throw error for HTML error pages starting with DOCTYPE', () => {
      const htmlError = `<!DOCTYPE html>
<html>
<head><title>404 Not Found</title></head>
<body>
<h1>Not Found</h1>
<p>The requested resource was not found.</p>
</body>
</html>`;

      expect(() => {
        service.parseValidationResponse(htmlError, 'test');
      }).toThrow(/HTML error page received/i);
    });

    it('should detect and throw error for HTML starting with <html> tag', () => {
      const htmlError = '<html><body>Error 503: Service Unavailable</body></html>';

      expect(() => {
        service.parseValidationResponse(htmlError, 'test');
      }).toThrow(/HTML error page received/i);
    });

    it('should handle JSON responses normally', () => {
      const jsonResponse = '{"isValid": true, "reason": "Valid word", "confidence": 95}';

      const result = service.parseValidationResponse(jsonResponse, 'test');

      expect(result.isValid).toBe(true);
      expect(result.reason).toBe('Valid word');
      expect(result.confidence).toBe(95);
    });

    it('should handle markdown-wrapped JSON normally', () => {
      const markdownJson = '```json\n{"isValid": true, "reason": "Valid word", "confidence": 90}\n```';

      const result = service.parseValidationResponse(markdownJson, 'test');

      expect(result.isValid).toBe(true);
      expect(result.reason).toBe('Valid word');
      expect(result.confidence).toBe(90);
    });

    it('should provide helpful error message when HTML is detected', () => {
      const htmlError = `<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01//EN">
<html><body><h1>502 Bad Gateway</h1></body></html>`;

      expect(() => {
        service.parseValidationResponse(htmlError, 'word');
      }).toThrow(/HTML error page.*Vertex AI.*network.*authentication.*service/i);
    });

    it('should throw HTMLResponseError for retryability detection', () => {
      const htmlError = '<!DOCTYPE html><html><body>Error</body></html>';

      try {
        service.parseValidationResponse(htmlError, 'test');
        fail('Expected parseValidationResponse to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).name).toBe('HTMLResponseError');
        expect((error as Error).message).toContain('HTML error page');
      }
    });
  });

  describe('batch validation HTML errors', () => {
    it('should detect HTML in batch responses', () => {
      const htmlError = '<!DOCTYPE html>\n<html><body>Service Temporarily Unavailable</body></html>';

      // Test the extractPartialJsonResults method with HTML
      const result = service.extractPartialJsonResults(htmlError, ['word1', 'word2']);

      // Should return empty array since no valid JSON found
      expect(result).toEqual([]);
    });
  });
});
