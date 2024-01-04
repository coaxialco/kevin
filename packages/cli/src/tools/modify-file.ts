import { createPatch } from 'diff';
import { fuzzy } from 'fast-fuzzy';
import { readFile, writeFile } from 'fs-extra';
import { RunnableToolFunction } from 'openai/lib/RunnableFunction';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { confirmWorkingDirectory } from '../lib/current-working-directory';
import { toolLogger } from '../lib/loggers';
import wrap from '../lib/wrap-tool-function';
import { zodParseJSON } from '../lib/zod';

export const params = z.object({
  filePath: z.string().describe('The relative or absolute file path'),
  modifications: z
    .object({
      pattern: z.string().describe('The substring pattern to find'),
      replacement: z.string().describe('The substring replacement')
    })
    .array()
});

function fuzzyReplace(content: string, pattern: string, replacement: string) {
  const contentLines = content.split('\n');
  const patternLength = pattern.split('\n').length;
  for (let lineIndex = 0; lineIndex <= contentLines.length - patternLength; lineIndex += 1) {
    const subContent = contentLines.slice(lineIndex, lineIndex + patternLength).join('\n');
    const score = fuzzy(subContent, pattern);
    if (score > 0.95) {
      return content.replace(subContent, replacement);
    }
  }
  throw new Error('Unable to replace, no matches found');
}

export async function func({ filePath, modifications }: z.infer<typeof params>) {
  await confirmWorkingDirectory(filePath);
  if (modifications.length === 0) {
    throw new Error('No modifications provided');
  }
  const originalContent = (await readFile(filePath, 'utf-8')).replace(/\r\n|\r|\n/, '\n');
  let newContent = originalContent;
  for (const { pattern, replacement } of modifications) {
    newContent = fuzzyReplace(newContent, pattern, replacement);
  }
  toolLogger(createPatch(filePath, originalContent, newContent));
  await writeFile(filePath, newContent, 'utf-8');
}

export default {
  type: 'function',
  function: {
    name: 'modifyFile',
    description:
      'Makes one or more modifications to a file by replacing the first instance of a pattern with a replacement',
    parameters: zodToJsonSchema(params),
    parse: zodParseJSON(params),
    function: wrap(func)
  }
} as RunnableToolFunction<z.infer<typeof params>>;
