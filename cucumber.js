process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({
  module: 'commonjs',
  moduleResolution: 'node',
  esModuleInterop: true,
});

module.exports = {
  default: {
    requireModule: ['ts-node/register'],
    require: ['features/component/steps/**/*.ts'],
    paths: ['features/component/**/*.feature'],
  },
};
