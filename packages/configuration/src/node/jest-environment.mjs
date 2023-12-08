import { TestEnvironment } from 'jest-environment-node';
import { Script, runInContext } from 'vm';

const script = new Script(`
  process.emit('JEST_TEARDOWN');
`);

class kevinTestEnvironment extends TestEnvironment {
  constructor(config, context) {
    super(config, context);
  }

  async setup() {
    await super.setup();
  }

  async teardown() {
    script.runInContext(this.context);
    await super.teardown();
  }

  getVmContext() {
    return super.getVmContext();
  }
}

export default kevinTestEnvironment;
