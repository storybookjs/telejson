// babel-preset-env: `false` means ESM modules, `undefined` means CJS modules
const modules = process.env.BABEL_ESM === 'true' ? false : undefined;

module.exports = {
  presets: [
    ['@babel/preset-env', {
      modules
    }],
    '@babel/preset-typescript',
  ],
};
