import { createPatch } from 'diff';
import { fuzzy } from 'fast-fuzzy';
import { readFile, writeFile, exists } from 'fs-extra';
import { RunnableToolFunction } from 'openai/lib/RunnableFunction';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { confirmWorkingDirectory } from '../lib/current-working-directory';
import { toolLogger } from '../lib/loggers';
import wrap from '../lib/wrap-tool-function';
import { zodParseJSON } from '../lib/zod';

export const params = z.object({
  filePath: z.string().describe('The absolute path of the file to modify'),
  linesToReplace: z.string().describe('One ore more lines to replace, including prefixed tabs and spaces'),
  replacement: z.string().describe('Replacement content, including prefixed tabs and spaces')
});

function fuzzyReplace(content: string, linesToReplace: string, replacement: string) {
  const contentLines = content.split('\n');
  const linesToReplaceLength = linesToReplace.split('\n').length;
  for (let lineIndex = 0; lineIndex <= contentLines.length - linesToReplaceLength; lineIndex += 1) {
    const subContent = contentLines.slice(lineIndex, lineIndex + linesToReplaceLength).join('\n');
    const score = fuzzy(linesToReplace, subContent);
    if (score > 0.95) {
      toolLogger(JSON.stringify({ score, subContent, linesToReplace, replacement }, null, 2));
      return content.replace(subContent, replacement);
    }
  }
  throw new Error('Unable to replace, no matches found');
}

export async function func({ filePath, linesToReplace, replacement }: z.infer<typeof params>) {
  toolLogger(JSON.stringify({ filePath, linesToReplace, replacement }, null, 2));
  await confirmWorkingDirectory(filePath);
  if (!(await exists(filePath))) {
    return `File with path "${filePath}" does not exist`;
  }
  const originalContent = (await readFile(filePath, 'utf-8')).replace(/\r\n|\r|\n/, '\n');
  const newContent = fuzzyReplace(originalContent, linesToReplace, replacement);
  toolLogger(createPatch(filePath, originalContent, newContent));
  await writeFile(filePath, newContent, 'utf-8');
  return `File with path "${filePath}" has been modified`;
}

const description = `Modify a file by replacing lines that match a linesToReplace.

For a file ./example.js with the following content:

function oldExample() {
	console.log("foo");
}

Running the following command:

modifyFile({
  filePath: "/User/example/example.js", 
  linesToReplace: "function oldExample() {\n	console.log("foo")", 
  replacement: "function newExample() {\n	console.log("bar")"
});

Modifies ./example.js to the following content:

function newExample() {
  console.log("bar");
}

`;

export default {
  type: 'function',
  function: {
    name: 'modifyFile',
    description,
    parameters: zodToJsonSchema(params),
    parse: zodParseJSON(params),
    function: wrap(func)
  }
} as RunnableToolFunction<z.infer<typeof params>>;
