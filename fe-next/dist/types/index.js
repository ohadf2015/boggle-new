"use strict";
/**
 * Central Type Export File
 * Re-exports all type definitions for easy importing
 *
 * CONSOLIDATED: Core game and socket types now come from shared/types/
 * Frontend-specific types (user, api) remain in this directory
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
// ==================== Shared Types (Game & Socket) ====================
// These are the canonical type definitions shared between frontend and backend
__exportStar(require("../shared/types/game"), exports);
__exportStar(require("../shared/types/socket"), exports);
