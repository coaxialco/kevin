import { resolve } from 'node:path';
import { writeFile, ensureDir, exists } from 'fs-extra';
import { v4 as uuidv4 } from 'uuid';
import { TempDirectoryFactory } from './lib/filesystem';
import { func as resolveModule } from '../src/tools/resolve-module';

describe('Codebase functions', () => {
  const factory = new TempDirectoryFactory();

  beforeEach(async () => {
    const originalWorkingDirectory = await factory.originalWorkingDirectory;
    process.chdir(originalWorkingDirectory);
  });
  afterAll(async () => {
    await factory.cleanupTempDirectories();
  });
  test('Should resolve a temp file', async () => {
    const baseFilePath = resolve('../src/cli.ts');
    const resolved = await resolveModule({ moduleSpecifier: 'fs', filePath: baseFilePath });
    expect(resolved).toEqual('node:fs');
  });
  test('Should resolve a temp file', async () => {
    const tempDirectory = await factory.makeTempDirectory();
    process.chdir(tempDirectory);
    const moduleDirectoryName = uuidv4();
    const moduleDirectoryPath = resolve(tempDirectory, moduleDirectoryName);
    const baseFilePath = resolve(tempDirectory, 'foo.ts');
    const moduleFilePath = resolve(moduleDirectoryPath, 'bar.ts');
    const baseFileContent = `import { bar } from './${moduleDirectoryName}/bar';`;
    const moduleFileContent = `export const bar = 'bar';`;
    await ensureDir(moduleDirectoryPath);
    await writeFile(baseFilePath, baseFileContent, 'utf-8');
    await writeFile(moduleFilePath, moduleFileContent, 'utf-8');
    const resolved = await resolveModule({ moduleSpecifier: `./${moduleDirectoryName}/bar`, filePath: baseFilePath });
    expect(resolved).toEqual(resolve(moduleFilePath));
  });
});
