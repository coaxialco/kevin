import * as fs from 'fs-extra';

const credentialsFilePath = `${process.env.HOME}/.openai/credentials`;

export async function getOpenAIKey() {
  const key = process.env.OPENAI_API_KEY;
  if (typeof key === 'string' && key.length > 0) {
    return key;
  }
  if (await fs.pathExists(credentialsFilePath)) {
    const content = await fs.readFile(credentialsFilePath, 'utf-8');
    const lines = content.split('\n');
    for (const line of lines) {
      if (line.startsWith('OPENAI_API_KEY=')) {
        return line.substring(15);
      }
    }
  }
  throw new Error('Key does not exist');
}
