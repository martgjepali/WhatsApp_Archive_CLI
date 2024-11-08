import { Command } from "commander";
import fs from "fs";
import path from "path";
import { parseChatFile } from "../utils/chatParser";
import { saveChatLog } from "../utils/formatChat";
import { extractZipArchive } from "../utils/extractZip";
import { findChatTranscript } from "../utils/findChatTranscript";
import { validateMd5 } from "../utils/validateMdHash";
import crypto from "crypto";

export function createMd5Hash(value: string): string {
  return crypto.createHash("md5").update(value).digest("hex");
}

export function registerParseCommand(program: Command): void {
  program
    .command("parse")
    .description("Extract chat transcript and media files from a ZIP archive")
    .requiredOption(
      "--input <path>",
      "Path to the ZIP archive containing chat transcript and media files"
    )
    .requiredOption(
      "--output <path>",
      "Path to the output folder where the results will be saved"
    )
    .option("-m, --me <hash>", "Specify your unique hash identifier")
    .option("-n, --name <name>", "Specify your name to generate the hash")
    .option("-g, --group", "Indicate if the chat is a group chat", false)
    .option(
      "--convert-to <format>",
      "Output format: json, txt, or html",
      "json"
    )
    .option("--convert-opus", "Convert OPUS files to MP3", false)
    .option(
      "--exclude-media",
      "Exclude media files from the saved output",
      false
    ) // Renamed Option
    .option("--verbose", "Enable verbose logging for debugging", false)
    .addHelpText(
      "after",
      `
Examples:
  $ cli-tool parse --input ./chat.zip --output ./output --me <hash> --group --convert-opus --convert-to html --exclude-media
  $ cli-tool parse --input /path/to/chat.zip --output /path/to/output --convert-to txt
  $ cli-tool parse --input ./chat.zip --output ./output --test-flag // NEW EXAMPLE FOR TEST FLAG
    `
    )
    .action(async (options) => {
      try {
        const verboseLog = (message: string) => {
          if (options.verbose) {
            console.log(message);
          }
        };

        if (options.name) {
          verboseLog(`Generating hash for name: ${options.name}`);
          options.meHash = createMd5Hash(options.name);
        } else {
          // If no name is provided, use a default identifier
          console.warn("No name provided, using a default identifier.");
          options.meHash = createMd5Hash("default_user");
        }

        verboseLog("Received options: " + JSON.stringify(options));

        const inputPath = path.resolve(options.input);
        const outputPath = path.resolve(options.output);

        // Debugging: Log paths to verify they are correct
        verboseLog("Resolved input path: " + inputPath);
        verboseLog("Resolved output path: " + outputPath);

        // Debugging: Log the new flag to see if it is interpreted correctly
        verboseLog("Resolved testFlag: " + options.testFlag);
        verboseLog("Resolved excludeMedia: " + options.excludeMedia); // NEW DEBUGGING LINE

        if (!fs.existsSync(inputPath)) {
          console.error(
            `Error: The input file at "${inputPath}" does not exist.`
          );
          process.exit(1);
        }

        if (!fs.existsSync(outputPath)) {
          console.log(`Output path does not exist. Creating: ${outputPath}`);
          fs.mkdirSync(outputPath, { recursive: true });
        }

        extractZipArchive(inputPath, outputPath);

        const chatFile = findChatTranscript(outputPath);
        if (!chatFile) {
          console.error("Error: No chat transcript found in the ZIP archive.");
          process.exit(1);
        }

        verboseLog(`Found chat transcript: ${chatFile}`);

        if (options.meHash && !validateMd5(options.meHash)) {
          console.error("Error: The generated meHash is not a valid MD5 hash.");
          process.exit(1);
        }

        // Debugging: Log values before calling parseChatFile
        verboseLog("Calling parseChatFile with the following parameters:");
        verboseLog("chatFile: " + chatFile);
        verboseLog("meHash: " + options.meHash);
        verboseLog("outputPath: " + outputPath);
        verboseLog("convertOpus: " + options.convertOpus);
        verboseLog("excludeMedia: " + options.excludeMedia);

        // Parse the chat file with the selected options
        const chatLog = await parseChatFile(
          chatFile,
          options.meHash,
          true, // Assuming the new setup assumes group chats by default
          outputPath,
          options.convertOpus,
          options.excludeMedia
        );

        // Debugging: Log the parsed chatLog before saving
        verboseLog("Parsed chatLog: " + JSON.stringify(chatLog, null, 2));

        // Save the parsed output in the specified format
        saveChatLog(
          chatLog,
          outputPath,
          options.convertTo,
          options.excludeMedia
        );
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.error("Error processing the chat file:", error.message);
        } else {
          console.error(
            "An unknown error occurred while processing the chat file."
          );
        }
        process.exit(1);
      }
    });
}
