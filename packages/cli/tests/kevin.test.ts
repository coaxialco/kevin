import { TempDirectoryFactory } from './lib/filesystem';
import { getOpenAIKey } from '../src/lib/api-key';
import { ChatRunner } from '../src/lib/chat-runner';

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
    const chatRunner = new ChatRunner({ apiKey });
    await chatRunner.sendMessage(
      `Create a new JavasScript file named 'example.js' containing a default export function that logs the text "foo"`
    );
    await chatRunner.sendMessage(`Modify 'example.js' to log the text "bar"`);
  });
});
