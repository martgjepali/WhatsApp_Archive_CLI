import { exec } from "child_process";
import util from "util";

const execAsync = util.promisify(exec);

export async function checkFFmpegAvailability(): Promise<boolean> {
  try {
    await execAsync("ffmpeg -version");
    return true;
  } catch (error) {
    console.error("ffmpeg is not installed or not available in the PATH.");
    return false;
  }
}
