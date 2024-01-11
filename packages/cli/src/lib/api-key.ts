import * as fs from 'fs-extra';

const credentialsFilePath = `${process.env.HOME}/.openai/credentials`;

const { OPENAI_API_KEY } = process.env;

export async function getOpenAIKey() {
  if (typeof OPENAI_API_KEY === 'string' && OPENAI_API_KEY.length > 0) {
    return OPENAI_API_KEY;
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
  throw new Error('OPENAI_API_KEY key does not exist. Add to the command line or to ~/.openai/credentials');
}
