import { TempDirectoryFactory } from './lib/filesystem';
import { getOpenAIKey } from '../src/lib/api-key';
import DeveloperRunner from '../src/runners/developer';

describe('Codebase functions', () => {
  jest.setTimeout(30000);
  const factory = new TempDirectoryFactory();
  beforeEach(async () => {
    const originalWorkingDirectory = await factory.originalWorkingDirectory;
    process.chdir(originalWorkingDirectory);
  });
  afterAll(async () => {
    //await factory.cleanupTempDirectories();
  });
  test('Should write a file then modify it', async () => {
    const tempDirectory = await factory.makeTempDirectory();
    process.chdir(tempDirectory);
    console.log({ tempDirectory });
    const apiKey = await getOpenAIKey();
    const runner = new DeveloperRunner({ apiKey });
    await runner.sendMessage(
      `Create a new JavaScript file named 'example.js' containing a default export function that logs the text "foo"`
    );
    await runner.sendMessage(`Modify 'example.js' to log the text "bar"`);
  });
});
