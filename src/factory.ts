import type { Linter } from 'eslint'
import type { RuleOptions } from './typegen'
import type { Awaitable, ConfigNames, OptionsConfig, TypedFlatConfigItem } from './types'

import { FlatConfigComposer } from 'eslint-flat-config-utils'
import { findUpSync } from 'find-up-simple'
import { isPackageExists } from 'local-pkg'
import {
  command,
  comments,
  disables,
  ignores,
  imports,
  javascript,
  jsdoc,
  jsonc,
  jsx,
  markdown,
  node,
  perfectionist,
  pnpm,
  sortPackageJson,
  sortTsconfig,
  stylistic,
  test,
  toml,
  typescript,
  unicorn,
  vue,
  yaml,
} from './configs'
import { e18e } from './configs/e18e'
import { formatters } from './configs/formatters'
import { regexp } from './configs/regexp'
import { GLOB_MARKDOWN } from './globs'
import { interopDefault, isInEditorEnv } from './utils'

const flatConfigProps = [
  'name',
  'languageOptions',
  'linterOptions',
  'processor',
  'plugins',
  'rules',
  'settings',
] satisfies (keyof TypedFlatConfigItem)[]

const VuePackages = [
  'vue',
  'nuxt',
  'vitepress',
  '@slidev/cli',
]

export const defaultPluginRenaming = {
  '@stylistic': 'style',
  '@typescript-eslint': 'ts',
  'import-lite': 'import',
  'n': 'node',
  'vitest': 'test',

  'yml': 'yaml',
}

/**
 * Construct an array of ESLint flat config items.
 *
 * @param {OptionsConfig & TypedFlatConfigItem} options
 *  The options for generating the ESLint configurations.
 * @param {Awaitable<TypedFlatConfigItem | TypedFlatConfigItem[]>[]} userConfigs
 *  The user configurations to be merged with the generated configurations.
 * @returns {Promise<TypedFlatConfigItem[]>}
 *  The merged ESLint configurations.
 */
export function antfu(
  options: OptionsConfig & Omit<TypedFlatConfigItem, 'files' | 'ignores'> = {},
  ...userConfigs: Awaitable<TypedFlatConfigItem | TypedFlatConfigItem[] | FlatConfigComposer<any, any> | Linter.Config[]>[]
): FlatConfigComposer<TypedFlatConfigItem, ConfigNames> {
  const {
    autoRenamePlugins = true,
    componentExts = [],
    e18e: enableE18e = true,
    gitignore: enableGitignore = true,
    ignores: userIgnores = [],
    imports: enableImports = true,
    jsdoc: enableJsdoc = true,
    jsx: enableJsx = true,
    node: enableNode = true,
    perfectionist: enablePerfectionist = true,
    pnpm: enableCatalogs = !!findUpSync('pnpm-workspace.yaml'),
    regexp: enableRegexp = true,
    type: appType = 'app',
    typescript: enableTypeScript = isPackageExists('typescript') || isPackageExists('@typescript/native-preview'),
    unicorn: enableUnicorn = true,
    vue: enableVue = VuePackages.some(i => isPackageExists(i)),
  } = options

  let isInEditor = options.isInEditor
  if (isInEditor == null) {
    isInEditor = isInEditorEnv()
    if (isInEditor)
      // eslint-disable-next-line no-console
      console.log('[@sepveneto/eslint-config] Detected running in editor, some rules are disabled.')
  }

  const stylisticOptions = options.stylistic === false
    ? false
    : typeof options.stylistic === 'object'
      ? options.stylistic
      : {}

  if (stylisticOptions && !('jsx' in stylisticOptions))
    stylisticOptions.jsx = typeof enableJsx === 'object' ? true : enableJsx

  const configs: Awaitable<TypedFlatConfigItem[]>[] = []

  if (enableGitignore) {
    if (typeof enableGitignore !== 'boolean') {
      configs.push(
        interopDefault(import('eslint-config-flat-gitignore')).then(r => [r({
          name: 'antfu/gitignore',
          ...enableGitignore,
        })]),
      )
    }
    else {
      configs.push(
        interopDefault(import('eslint-config-flat-gitignore')).then(r => [r({
          name: 'antfu/gitignore',
          strict: false,
        })]),
      )
    }
  }

  const typescriptOptions = resolveSubOptions(options, 'typescript')

  // Base configs
  configs.push(
    ignores(userIgnores, !enableTypeScript),
    javascript({
      isInEditor,
      overrides: getOverrides(options, 'javascript'),
    }),
    comments(),
    command(),
  )

  if (enablePerfectionist) {
    configs.push(
      perfectionist({
        overrides: getOverrides(options, 'perfectionist'),
      }),
    )
  }

  if (enableNode) {
    configs.push(
      node(),
    )
  }

  if (enableJsdoc) {
    configs.push(
      jsdoc({
        stylistic: stylisticOptions,
      }),
    )
  }

  if (enableImports) {
    configs.push(
      imports({
        stylistic: stylisticOptions,
        ...resolveSubOptions(options, 'imports'),
      }),
    )
  }

  if (enableE18e) {
    configs.push(
      e18e({
        isInEditor,
        ...enableE18e === true ? {} : enableE18e,
      }),
    )
  }

  if (enableUnicorn) {
    configs.push(
      unicorn(enableUnicorn === true ? {} : enableUnicorn),
    )
  }

  if (enableVue) {
    componentExts.push('vue')
  }

  if (enableJsx) {
    configs.push(
      jsx(enableJsx === true ? {} : enableJsx),
    )
  }

  if (enableTypeScript) {
    configs.push(
      typescript({
        ...typescriptOptions,
        componentExts,
        overrides: getOverrides(options, 'typescript'),
        type: appType,
      }),
    )
  }

  if (stylisticOptions) {
    configs.push(
      stylistic({
        ...stylisticOptions,
        lessOpinionated: options.lessOpinionated,
        overrides: getOverrides(options, 'stylistic'),
      }),
    )
  }

  if (enableRegexp) {
    configs.push(
      regexp(typeof enableRegexp === 'boolean' ? {} : enableRegexp),
    )
  }

  if (options.test ?? true) {
    configs.push(
      test({
        isInEditor,
        overrides: getOverrides(options, 'test'),
      }),
    )
  }

  if (enableVue) {
    configs.push(
      vue({
        ...resolveSubOptions(options, 'vue'),
        overrides: getOverrides(options, 'vue'),
        stylistic: stylisticOptions,
        typescript: !!enableTypeScript,
      }),
    )
  }

  if (options.jsonc ?? true) {
    configs.push(
      jsonc({
        overrides: getOverrides(options, 'jsonc'),
        stylistic: stylisticOptions,
      }),
      sortPackageJson(),
      sortTsconfig(),
    )
  }

  if (enableCatalogs) {
    const optionsPnpm = resolveSubOptions(options, 'pnpm')
    configs.push(
      pnpm({
        isInEditor,
        json: options.jsonc !== false,
        yaml: options.yaml !== false,
        ...optionsPnpm,
      }),
    )
  }

  if (options.yaml ?? true) {
    configs.push(
      yaml({
        overrides: getOverrides(options, 'yaml'),
        stylistic: stylisticOptions,
      }),
    )
  }

  if (options.toml ?? true) {
    configs.push(
      toml({
        overrides: getOverrides(options, 'toml'),
        stylistic: stylisticOptions,
      }),
    )
  }

  if (options.markdown ?? true) {
    configs.push(
      markdown({
        componentExts,
        overrides: getOverrides(options, 'markdown'),
      }),
    )
  }

  if (options.formatters) {
    configs.push(
      formatters(
        options.formatters,
        typeof stylisticOptions === 'boolean' ? {} : stylisticOptions,
      ),
    )
  }

  configs.push(
    disables(),
  )

  if ('files' in options) {
    throw new Error('[@sepveneto/eslint-config] The first argument should not contain the "files" property as the options are supposed to be global. Place it in the second or later config instead.')
  }

  // User can optionally pass a flat config item to the first argument
  // We pick the known keys as ESLint would do schema validation
  const fusedConfig = flatConfigProps.reduce((acc, key) => {
    if (key in options)
      acc[key] = options[key] as any
    return acc
  }, {} as TypedFlatConfigItem)
  if (Object.keys(fusedConfig).length)
    configs.push([fusedConfig])

  let composer = new FlatConfigComposer<TypedFlatConfigItem, ConfigNames>()

  composer = composer
    .append(
      ...configs,
      ...userConfigs as any,
    )

  // Markdown uses the `markdown/gfm` language, whose `SourceCode` lacks JS-only
  // methods like `getAllComments`. Without this, any rule override registered
  // without a `files` constraint would apply globally and crash on `.md` files.
  // See https://github.com/antfu/eslint-config/issues/837.
  if (options.markdown ?? true) {
    composer = composer.setDefaultIgnores(prev => [...prev, GLOB_MARKDOWN])
  }

  if (autoRenamePlugins) {
    composer = composer
      .renamePlugins(defaultPluginRenaming)
  }

  if (isInEditor) {
    composer = composer
      .disableRulesFix([
        'unused-imports/no-unused-imports',
        'test/no-only-tests',
        'prefer-const',
      ], {
        builtinRules: () => import(['eslint', 'use-at-your-own-risk'].join('/')).then(r => r.builtinRules),
      })
  }

  return composer
}

export type ResolvedOptions<T> = T extends boolean
  ? never
  : NonNullable<T>

export function resolveSubOptions<K extends keyof OptionsConfig>(
  options: OptionsConfig,
  key: K,
): ResolvedOptions<OptionsConfig[K]> {
  return typeof options[key] === 'boolean'
    ? {} as any
    : options[key] || {} as any
}

export function getOverrides<K extends keyof OptionsConfig>(
  options: OptionsConfig,
  key: K,
): Partial<Linter.RulesRecord & RuleOptions> {
  const sub = resolveSubOptions(options, key)
  return {
    ...(options.overrides as any)?.[key],
    ...'overrides' in sub
      ? sub.overrides
      : {},
  }
}
