import { applyPatch } from 'diff';
import { writeFile, readFile } from 'fs-extra';
import { RunnableToolFunction } from 'openai/lib/RunnableFunction';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { confirmWorkingDirectory } from '../lib/current-working-directory';
import { toolLogger } from '../lib/loggers';
import wrap from '../lib/wrap-tool-function';
import { zodParseJSON } from '../lib/zod';

export const params = z.object({
  filePath: z.string().describe('The relative or absolute file path'),
  patch: z.string().describe('A unified diff patch')
});

export async function func({ filePath, patch }: z.infer<typeof params>) {
  await confirmWorkingDirectory(filePath);
  const oldContent = await readFile(filePath, 'utf-8');
  const newContent = applyPatch(oldContent, patch);
  if (newContent === false) {
    throw new Error(`Unable to patch ${filePath}`);
  }
  await writeFile(filePath, newContent, 'utf-8');
  toolLogger(`Patched ${filePath}: \n${patch}`);
}

export default {
  type: 'function',
  function: {
    name: 'applyPatch',
    description: 'Apply a unified diff patch to a file',
    parameters: zodToJsonSchema(params),
    parse: zodParseJSON(params),
    function: wrap(func)
  }
} as RunnableToolFunction<z.infer<typeof params>>;
