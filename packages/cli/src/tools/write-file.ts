import { dirname } from 'path';
import { createPatch } from 'diff';
import { writeFile, ensureDir, exists } from 'fs-extra';
import { RunnableToolFunction } from 'openai/lib/RunnableFunction';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { confirmWorkingDirectory } from '../lib/current-working-directory';
import { toolLogger } from '../lib/loggers';
import wrap from '../lib/wrap-tool-function';
import { zodParseJSON } from '../lib/zod';

export const params = z.object({
  filePath: z.string().describe('The absolute path of the file to write'),
  content: z.string().describe('The content to write')
});

export async function func({ filePath, content }: z.infer<typeof params>) {
  await confirmWorkingDirectory(filePath);
  if (await exists(filePath)) {
    return `File with path "${filePath}" already exists`;
  }
  await ensureDir(dirname(filePath));
  toolLogger(createPatch(filePath, '', content));
  await writeFile(filePath, content, 'utf-8');
  return `File with path "${filePath}" has been modified`;
}

export default {
  type: 'function',
  function: {
    name: 'writeFile',
    description: 'Writes data to a file using UTF-8 encoding. Does not overwrite existing files.',
    parameters: zodToJsonSchema(params),
    parse: zodParseJSON(params),
    function: wrap(func)
  }
} as RunnableToolFunction<z.infer<typeof params>>;
