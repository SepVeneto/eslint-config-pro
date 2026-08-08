import type { OptionsConfig } from './types'

// @keep-sorted
export const CONFIG_PRESET_FULL_ON: OptionsConfig = {
  formatters: true,
  gitignore: true,
  imports: true,
  jsdoc: true,
  jsonc: true,
  jsx: {
    a11y: true,
  },
  markdown: true,
  node: true,
  perfectionist: true,
  pnpm: true,
  regexp: true,
  stylistic: {
    experimental: true,
  },
  test: true,
  toml: true,
  typescript: {
    erasableOnly: true,
    tsconfigPath: 'tsconfig.json',
  },
  unicorn: true,
  vue: {
    a11y: true,
  },
  yaml: true,
}

export const CONFIG_PRESET_FULL_OFF: OptionsConfig = {
  formatters: false,
  gitignore: false,
  imports: false,
  jsdoc: false,
  jsonc: false,
  jsx: false,
  markdown: false,
  node: false,
  perfectionist: false,
  pnpm: false,
  regexp: false,
  stylistic: false,
  test: false,
  toml: false,
  typescript: false,
  unicorn: false,
  vue: false,
  yaml: false,
}
