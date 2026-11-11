import { defineConfig } from '@playwright/test';
import compatibility from './playwright.config';

// Run in addition to all 70 compatibility cases, with require-preconditions=true.
// Separate contracts prevent a default run from mixing incompatible server modes.
export default defineConfig({
  ...compatibility,
  testIgnore: [],
  testMatch: '**/phase8.spec.ts',
});
