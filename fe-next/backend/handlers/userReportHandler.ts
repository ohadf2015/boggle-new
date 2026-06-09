/**
 * User Report Handler
 * Socket events for reporting abusive users / messages (Google Play
 * "Social Apps & Features" policy requirement).
 */

import type { Server, Socket } from 'socket.io';
import { checkRateLimit } from '../utils/rateLimiter';
import { emitError, ErrorCodes } from '../utils/errorHandler';
import logger from '../utils/logger';
import * as reportManager from '../modules/reportManager';
import { getAuthUserId } from '../utils/socialHelpers';

const RATE_WEIGHTS = {
  REPORT_USER: 2,
  REPORT_MESSAGE: 1,
};

export function registerUserReportHandlers(_io: Server, socket: Socket): void {
  // ==================== Report User ====================
  socket.on('users:report', async (data: { targetUserId: string; reason: string; context?: string }) => {
    const authUserId = getAuthUserId(socket);
    if (!checkRateLimit(authUserId || socket.id, RATE_WEIGHTS.REPORT_USER)) {
      socket.emit('rateLimited');
      return;
    }

    if (!authUserId) {
      emitError(socket, ErrorCodes.AUTH_REQUIRED);
      return;
    }

    if (!data?.targetUserId || !data?.reason) {
      socket.emit('friends:error', { code: 'VALIDATION_FAILED', message: 'Target user and reason are required' });
      return;
    }

    try {
      const result = await reportManager.reportUser(authUserId, data.targetUserId, data.reason, data.context);
      if (!result.success) {
        socket.emit('friends:error', { code: result.errorCode || 'SERVER_ERROR', message: 'Failed to submit report' });
        return;
      }
      socket.emit('report:submitted', { success: true, timestamp: Date.now() });
      logger.info('REPORT', `User ${authUserId} reported ${data.targetUserId} (${data.reason})`);
    } catch (error) {
      logger.error('USER_REPORT_HANDLER', `Error reporting user: ${(error as Error).message}`);
      socket.emit('friends:error', { code: 'SERVER_ERROR', message: 'Failed to submit report' });
    }
  });

  // ==================== Report Message ====================
  socket.on(
    'messages:report',
    async (data: {
      surface: 'direct_message' | 'room_chat';
      reason: string;
      context?: string;
      messageId?: string;
      targetUserId?: string;
      gameCode?: string;
      messageSnapshot?: { senderId?: string; senderName: string; message: string; timestamp: number };
    }) => {
      const authUserId = getAuthUserId(socket);
      if (!checkRateLimit(authUserId || socket.id, RATE_WEIGHTS.REPORT_MESSAGE)) {
        socket.emit('rateLimited');
        return;
      }

      if (!authUserId) {
        emitError(socket, ErrorCodes.AUTH_REQUIRED);
        return;
      }

      if (!data?.surface || !data?.reason) {
        socket.emit('friends:error', { code: 'VALIDATION_FAILED', message: 'Surface and reason are required' });
        return;
      }

      try {
        const result = await reportManager.reportMessage(authUserId, {
          surface: data.surface,
          reason: data.reason as reportManager.ReportReason,
          context: data.context,
          messageId: data.messageId,
          targetUserId: data.targetUserId,
          gameCode: data.gameCode,
          messageSnapshot: data.messageSnapshot,
        });
        if (!result.success) {
          socket.emit('friends:error', { code: result.errorCode || 'SERVER_ERROR', message: 'Failed to submit report' });
          return;
        }
        socket.emit('report:submitted', { success: true, timestamp: Date.now() });
        logger.info('REPORT', `User ${authUserId} reported a ${data.surface} message (${data.reason})`);
      } catch (error) {
        logger.error('USER_REPORT_HANDLER', `Error reporting message: ${(error as Error).message}`);
        socket.emit('friends:error', { code: 'SERVER_ERROR', message: 'Failed to submit report' });
      }
    }
  );
}
