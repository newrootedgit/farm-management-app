import { vi } from 'vitest';

// Set environment variables for testing
process.env.SKIP_AUTH = 'true';
process.env.NODE_ENV = 'test';

// Global mock for crypto.randomUUID
vi.stubGlobal('crypto', {
  randomUUID: () => 'test-uuid-1234-5678-9abc-def012345678',
});
