module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: '14',
          browsers: ['> 1%', 'last 2 versions', 'not dead'],
        },
        modules: false,
      },
    ],
  ],
  env: {
    test: {
      presets: [
        [
          '@babel/preset-env',
          {
            targets: {
              node: 'current',
            },
          },
        ],
      ],
    },
  },
};
