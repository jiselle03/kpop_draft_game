/** @type {import('prettier').Config & import('prettier-plugin-tailwindcss').PluginOptions} */
export default {
  singleQuote: true,
  trailingComma: 'all',
  semi: false,
  arrowParens: 'always',
  plugins: ['prettier-plugin-tailwindcss'],
}
