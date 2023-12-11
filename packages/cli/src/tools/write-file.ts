import { writeFile } from 'fs-extra';
import { RunnableToolFunction } from 'openai/lib/RunnableFunction';
import { toolLogger } from '../lib/loggers';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { confirmWorkingDirectory } from '../lib/current-working-directory';
import wrap from '../lib/wrap-tool-function';
import { zodParseJSON } from '../lib/zod';

export const params = z.object({
  filePath: z.string().describe('The relative or absolute file path'),
  content: z.string().describe('The content to write')
});

export async function func({ filePath, content }: z.infer<typeof params>) {
  await confirmWorkingDirectory(filePath);
  toolLogger(`Wrote file: ${filePath}`);
  return await writeFile(filePath, content, 'utf-8');
}

export default {
  type: 'function',
  function: {
    name: 'writeFile',
    description: 'Writes data to a file using UTF-8 encoding, replacing the file if it already exists',
    parameters: zodToJsonSchema(params),
    parse: zodParseJSON(params),
    function: wrap(func)
  }
} as RunnableToolFunction<z.infer<typeof params>>;
