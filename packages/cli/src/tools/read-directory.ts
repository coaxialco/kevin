import { resolve, relative, isAbsolute } from 'path';
import { exists } from 'fs-extra';
import walk from 'ignore-walk';
import { RunnableToolFunction } from 'openai/lib/RunnableFunction';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { toolLogger } from '../lib/loggers';
import wrap from '../lib/wrap-tool-function';
import { zodParseJSON } from '../lib/zod';

export const params = z.object({
  directoryPath: z.string().describe('The absolute path of the directory to read')
});

export async function func({ directoryPath }: z.infer<typeof params>) {
  const relativeDirectoryPath = isAbsolute(directoryPath) ? relative(process.cwd(), directoryPath) : directoryPath;
  toolLogger(`Listing the contents of '${relativeDirectoryPath}'`);
  if (!(await exists(directoryPath))) {
    return `A directory with path "${directoryPath}" does not exist`;
  }
  const entries: string[] = await walk({
    path: directoryPath,
    ignoreFiles: ['.gitignore'],
    follow: true
  });
  return entries
    .map((entry: string) => {
      return resolve(directoryPath, entry);
    })
    .join('\n');
}

export default {
  type: 'function',
  function: {
    name: 'readDirectory',
    description:
      'Reads the contents of a directory and returns an array of strings containing the full paths of the directory contents.',
    parameters: zodToJsonSchema(params),
    parse: zodParseJSON(params),
    function: wrap(func)
  }
} as RunnableToolFunction<z.infer<typeof params>>;
