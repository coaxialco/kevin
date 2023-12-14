import { resolve, dirname } from 'path';
import { realpath, exists } from 'fs-extra';

export class OutsideWorkingDirectoryError extends Error {
  constructor(path: string) {
    super(`Path ${path} is outside of the current working directory ${currentWorkingDirectory()}`);
    this.name = 'OutsideWorkingDirectoryError';
  }
}

export function currentWorkingDirectory() {
  return resolve(process.cwd());
}

export async function confirmWorkingDirectory(name: string, isDirectory = false): Promise<void> {
  const resolved = isDirectory ? resolve(name) : dirname(resolve(name));
  if (!(await exists(resolved))) {
    if (resolved.length > 1) {
      return confirmWorkingDirectory(dirname(resolved), true);
    }
    throw new OutsideWorkingDirectoryError(name);
  }
  const realName = await realpath(resolved);
  const cwd = await realpath(currentWorkingDirectory());
  if (!realName.startsWith(cwd)) {
    throw new OutsideWorkingDirectoryError(name);
  }
}
