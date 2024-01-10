import LeadDeveloperRunner from './lead-developer';
import ctoContent from '../content/cto';
import { Runner } from '../lib/runner';
import readDirectory from '../tools/read-directory';
import readFile from '../tools/read-file';

export default class PlannerRunner extends Runner {
  systemContent = ctoContent;
  tools = [readDirectory, readFile];
  runnerTools = [
    {
      name: 'assignToLeadDeveloper',
      description: `Assign a task to a lead developer. Returns the lead developer's response.`,
      taskDescription: 'A highly detailed list of steps to implement the requested task.',
      RunnerClass: LeadDeveloperRunner
    }
  ];
}
