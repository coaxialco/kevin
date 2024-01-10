import DeveloperRunner from './developer';
import ctoContent from '../content/cto';
import { Runner } from '../lib/runner';
import modifyFile from '../tools/modify-file';
import readDirectory from '../tools/read-directory';
import readFile from '../tools/read-file';
import writeFile from '../tools/write-file';

export default class LeadDeveloperRunner extends Runner {
  systemContent = ctoContent;
  tools = [modifyFile, readDirectory, readFile, writeFile];
  runnerTools = [
    {
      name: 'assignToDeveloper',
      description: `Assign a task to a developer. Returns the lead developer's response.`,
      taskDescription: 'A clear and precise description of the requested task.',
      RunnerClass: DeveloperRunner
    }
  ];
}
