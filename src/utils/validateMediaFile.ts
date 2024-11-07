import { exec } from 'child_process';
import util from 'util';
import fs from 'fs';

const execAsync = util.promisify(exec);

export async function validateMediaFile(filePath: string): Promise<boolean> {
  try {
    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      console.warn(`File does not exist: ${filePath}`);
      return false;
    }

    // Run ExifTool command to validate the file
    const { stdout, stderr } = await execAsync(`exiftool "${filePath}"`);
    if (stderr) {
      console.error(`ExifTool error for file ${filePath}: ${stderr}`);
      return false;
    }

    // Check if meaningful metadata was found
    if (stdout && stdout.trim().length > 0) {
      console.log(`Valid media file: ${filePath}`);
      return true;
    }

    console.warn(`No metadata found for file: ${filePath}`);
    return false;
  } catch (error) {
    console.error(`Failed to validate media file with ExifTool: ${filePath}, Error: ${error}`);
    return false;
  }
}
