import { defineConfig } from 'vitest/config';

// Unit tests for the pure calculator modules. No DOM, no browser, no database.
export default defineConfig({
    test: {
        environment: 'node',
        include: ['tests/js/**/*.test.js'],
    },
});
