import { currentWorkingDirectory } from '../../src/lib/current-working-directory';
import { v4 as uuidv4 } from 'uuid';
import { ensureDir, remove, realpath } from 'fs-extra';
import { resolve } from 'path';
import { tmpdir } from 'os';

export class TempDirectoryFactory {
  tempDirectories: Set<string>;
  originalWorkingDirectory: string;

  constructor() {
    this.tempDirectories = new Set<string>();
    this.originalWorkingDirectory = currentWorkingDirectory();
  }

  async cleanupTempDirectories() {
    process.chdir(this.originalWorkingDirectory);
    for (const tempDirectory of this.tempDirectories) {
      await remove(tempDirectory);
    }
  }

  async makeTempDirectory() {
    const tempDirectory = resolve(tmpdir(), uuidv4());
    this.tempDirectories.add(tempDirectory);
    await ensureDir(tempDirectory);
    return realpath(tempDirectory);
  }
}
