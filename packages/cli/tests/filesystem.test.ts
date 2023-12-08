import { currentWorkingDirectory, OutsideWorkingDirectoryError } from '../src/lib/current-working-directory';
import { v4 as uuidv4 } from 'uuid';
import { resolve } from 'path';
import { TempDirectoryFactory } from './lib/filesystem';
import { func as applyPatch } from '../src/tools/apply-patch';
import { func as readFile } from '../src/tools/read-file';
import { func as writeFile } from '../src/tools/write-file';
import { func as readDirectory } from '../src/tools/read-directory';
import { createPatch } from 'diff';

describe('Filesystem functions', () => {
  const factory = new TempDirectoryFactory();

  beforeEach(async () => {
    const originalWorkingDirectory = await factory.originalWorkingDirectory;
    process.chdir(originalWorkingDirectory);
  });
  afterAll(async () => {
    await factory.cleanupTempDirectories();
  });
  test('Should get the current working directory', async () => {
    const tempDirectory = await factory.makeTempDirectory();
    process.chdir(tempDirectory);
    expect(currentWorkingDirectory()).toEqual(tempDirectory);
  });
  test('Should read the current directory', async () => {
    const tempDirectory = await factory.makeTempDirectory();
    process.chdir(tempDirectory);
    const name = await currentWorkingDirectory();
    await readDirectory({ name, recursive: true });
  });
  test('Should read and write files', async () => {
    const tempDirectory = await factory.makeTempDirectory();
    process.chdir(tempDirectory);
    const content = uuidv4();
    const name = `${uuidv4()}.txt`;
    await writeFile({ name, content });
    await expect(readFile({ name })).resolves.toEqual(content);
  });
  test('Should not read files outside of the current working directory', async () => {
    const tempDirectory1 = await factory.makeTempDirectory();
    const tempDirectory2 = await factory.makeTempDirectory();
    process.chdir(tempDirectory1);
    const name = resolve(tempDirectory2, `${uuidv4()}.txt`);
    await expect(readFile({ name })).rejects.toBeInstanceOf(OutsideWorkingDirectoryError);
  });
  test('Should not write files outside of the current working directory', async () => {
    const tempDirectory1 = await factory.makeTempDirectory();
    const tempDirectory2 = await factory.makeTempDirectory();
    process.chdir(tempDirectory1);
    const name = resolve(tempDirectory2, `${uuidv4()}.txt`);
    await expect(writeFile({ name, content: uuidv4() })).rejects.toBeInstanceOf(OutsideWorkingDirectoryError);
  });
  test('Should apply a patch', async () => {
    const tempDirectory = await factory.makeTempDirectory();
    process.chdir(tempDirectory);
    const name = `${uuidv4()}.txt`;
    const lines1 = [];
    for (let i = 0; i < 10; i++) {
      lines1.push(uuidv4());
    }
    const lines2 = lines1.slice();
    lines2[5] = uuidv4();
    const content1 = lines1.join('\n');
    const content2 = lines2.join('\n');
    const patch = createPatch(name, content1, content2);
    await writeFile({ name, content: content1 });
    await applyPatch({ name, patch });
    await expect(readFile({ name })).resolves.toEqual(content2);
  });
});
