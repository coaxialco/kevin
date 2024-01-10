import developerContent from '../content/developer';
import { Runner } from '../lib/runner';
import modifyFile from '../tools/modify-file';
import readDirectory from '../tools/read-directory';
import readFile from '../tools/read-file';
import writeFile from '../tools/write-file';

export default class DeveloperRunner extends Runner {
  systemContent = developerContent;
  tools = [modifyFile, readDirectory, readFile, writeFile];
}
