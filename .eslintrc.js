module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  extends: [
    "standard"
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module"
  },
  plugins: [
    "@typescript-eslint"
  ],
  rules: {
    "comma-dangle": ["error", "only-multiline"],
    "space-before-function-paren": 0,
    quotes: [2, "double", { avoidEscape: true }]
  }
}
