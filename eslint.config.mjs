import js from '@eslint/js'
import globals from 'globals'
import pluginN from 'eslint-plugin-n'

export default [
    { ignores: ['eslint.config.*', 'node_modules/**', 'dist/**', 'build/**', 'data/lessons.json'] },

    js.configs.recommended,

    {
        plugins: { n: pluginN },
        rules: { ...pluginN.configs['flat/recommended-script'].rules },
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'commonjs',
            globals: { ...globals.node },
        },
    },

    { rules: { camelcase: 'off', 'no-console': 'off' } },
]
