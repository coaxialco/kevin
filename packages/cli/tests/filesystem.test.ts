import { currentWorkingDirectory, OutsideWorkingDirectoryError } from '../src/lib/current-working-directory';
import { v4 as uuidv4 } from 'uuid';
import { resolve } from 'path';
import { TempDirectoryFactory } from './lib/filesystem';
import { func as applyPatch } from '../src/tools/apply-patch';
import { func as modifyFile } from '../src/tools/modify-file';
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
    const content = uuidv4();
    const filePath = `${uuidv4()}.txt`;
    await writeFile({ filePath, content });
    const directoryPath = await currentWorkingDirectory();
    const results = await readDirectory({ directoryPath });
    console.log(results);
  });
  test('Should read and write files', async () => {
    const tempDirectory = await factory.makeTempDirectory();
    process.chdir(tempDirectory);
    const content = uuidv4();
    const filePath = `${uuidv4()}.txt`;
    await writeFile({ filePath, content });
    await expect(readFile({ filePath, includeLineNumbers: false })).resolves.toEqual(content);
  });
  test('Should create directories to write files', async () => {
    const tempDirectory = await factory.makeTempDirectory();
    process.chdir(tempDirectory);
    const content = uuidv4();
    const filePath = `${uuidv4()}/${uuidv4()}.txt`;
    await writeFile({ filePath, content });
    await expect(readFile({ filePath, includeLineNumbers: false })).resolves.toEqual(content);
  });
  test('Should read files with line numbers', async () => {
    const tempDirectory = await factory.makeTempDirectory();
    process.chdir(tempDirectory);
    const content = `${uuidv4()}\n${uuidv4()}\n${uuidv4()}\n${uuidv4()}`;
    const contentWithLineNumbers = content
      .split('\n')
      .map((line, index) => `${`${index + 1}`.padStart(6, ' ')} | ${line}`)
      .join('\n');
    const filePath = `${uuidv4()}.txt`;
    await writeFile({ filePath, content });
    await expect(readFile({ filePath, includeLineNumbers: true })).resolves.toEqual(contentWithLineNumbers);
  });
  test('Should not write files outside of the current working directory', async () => {
    const tempDirectory1 = await factory.makeTempDirectory();
    const tempDirectory2 = await factory.makeTempDirectory();
    process.chdir(tempDirectory1);
    const filePath = resolve(tempDirectory2, `${uuidv4()}.txt`);
    await expect(writeFile({ filePath, content: uuidv4() })).rejects.toBeInstanceOf(OutsideWorkingDirectoryError);
  });
  test('Should apply a patch', async () => {
    const tempDirectory = await factory.makeTempDirectory();
    process.chdir(tempDirectory);
    const filePath = `${uuidv4()}.txt`;
    const lines1 = [];
    for (let i = 0; i < 10; i++) {
      lines1.push(uuidv4());
    }
    const lines2 = lines1.slice();
    lines2[5] = uuidv4();
    const content1 = lines1.join('\n');
    const content2 = lines2.join('\n');
    const patch = createPatch(filePath, content1, content2);
    await writeFile({ filePath, content: content1 });
    await applyPatch({ filePath, patch });
    await expect(readFile({ filePath, includeLineNumbers: false })).resolves.toEqual(content2);
  });

  function createModification(content: string): [string, { pattern: string; replacement: string }] {
    const oldLines = content.split('\n');
    const newLines = oldLines.slice();
    const linesToRemove = [];
    const linesToInsert = [];
    const modificationIndex = Math.floor(Math.random() * (oldLines.length - 10));
    for (let i = modificationIndex; i < modificationIndex + 10; i++) {
      const line = uuidv4();
      newLines[i] = line;
      linesToInsert.push(line);
      linesToRemove.push(oldLines[i]);
    }
    return [
      newLines.join('\n'),
      {
        pattern: linesToRemove.join('\n'),
        replacement: linesToInsert.join('\n')
      }
    ];
  }
  test('Should modify a file', async () => {
    const tempDirectory = await factory.makeTempDirectory();
    process.chdir(tempDirectory);
    const filePath = `${uuidv4()}.txt`;
    const content = Array.from({ length: 100 }, () => uuidv4()).join('\n');
    await writeFile({ filePath, content });
    const [newContent, modification] = createModification(content);
    await modifyFile({
      filePath,
      modifications: [modification]
    });
    expect(content).not.toEqual(newContent);
    await expect(readFile({ filePath, includeLineNumbers: false })).resolves.toEqual(newContent);
  });
});
