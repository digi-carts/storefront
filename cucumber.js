module.exports = {
  default: {
    requireModule: ['ts-node/register'],
    require: ['features/component/steps/**/*.ts'],
    paths: ['features/component/**/*.feature'],
  },
};
