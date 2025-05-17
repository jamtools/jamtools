import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  "./vite.config.ts",
  "./configs/vite.config.ts",
  "./packages/springboard/core/vite.config.ts",
  "./packages/jamtools/core/vite.config.ts",
  "./packages/springboard/platforms/react-native/vite.config.ts"
])
