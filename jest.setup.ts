// Native modules are not available under Jest. Pure logic is tested directly; native wrappers
// get minimal mocks here.

jest.mock('react-native-nitro-modules', () => ({
  NitroModules: {
    createHybridObject: jest.fn(() => {
      throw new Error('Nitro HybridObjects are not available in Jest');
    }),
  },
}));
