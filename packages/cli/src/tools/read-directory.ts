import { resolve } from 'path';
import walk from 'ignore-walk';
import { RunnableToolFunction } from 'openai/lib/RunnableFunction';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { toolLogger } from '../lib/loggers';
import wrap from '../lib/wrap-tool-function';
import { zodParseJSON } from '../lib/zod';

export const params = z.object({
  directoryPath: z.string().describe('The relative or absolute directory path')
});

export async function func({ directoryPath }: z.infer<typeof params>) {
  toolLogger(`Reading directory '${directoryPath}'`);
  const entries: string[] = await walk({
    path: directoryPath,
    ignoreFiles: ['.gitignore'],
    follow: true
  });
  return entries.map((entry: string) => {
    return resolve(directoryPath, entry);
  });
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
