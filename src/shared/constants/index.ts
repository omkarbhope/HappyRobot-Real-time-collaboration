// Rate limits
export const API_RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
export const API_RATE_LIMIT_MAX_REQUESTS = 60;
export const WS_RATE_LIMIT_WINDOW_MS = 1_000; // 1 second
export const WS_RATE_LIMIT_MAX_MESSAGES = 30;

// Validation
export const MAX_TITLE_LENGTH = 500;
export const MAX_DESCRIPTION_LENGTH = 10_000;
export const MAX_COMMENT_LENGTH = 5_000;
export const MAX_CONTENT_HTML_LENGTH = 50_000;
export const INVITE_CODE_LENGTH = 8;

// Cache
export const BOARD_CACHE_TTL_MS = 60_000; // 1 minute
