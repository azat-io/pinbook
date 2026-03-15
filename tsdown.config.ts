import { defineConfig } from 'tsdown'

export default defineConfig({
  inputOptions: {
    experimental: {
      attachDebugInfo: 'none',
    },
  },
  entry: {
    'cli/index': 'cli/index.ts',
    index: 'core/index.ts',
  },
  outExtensions: () => ({
    dts: '.d.ts',
    js: '.js',
  }),
  outputOptions: {
    comments: false,
  },
  unbundle: true,
  dts: true,
})
