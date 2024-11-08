import fs from "fs";
import { createHash } from "crypto";
import path from "path";
import { convertOpusToMp3 } from "./convertOpusToMp3";
import { validateMediaFile } from "./validateMediaFile";
import { checkFFmpegAvailability } from "./checkFFmpegAvailability";
import moment from "moment";

export type ChatMessage = {
  type: "msg" | "dchange" | "notification";
  index: number;
  tstamp: number;
  hour?: string;
  person?: string;
  message: string;
  date?: string;
  fromMe?: boolean;
  attachment?: string; // Optional field for attachments
};

export type ChatLog = {
  groupChat: boolean;
  chatName: string;
  me: string;
  hash: string;
  chatLog: ChatMessage[];
};

export async function parseChatFile(
  filePath: string,
  meHash: string,
  isGroupChat: boolean,
  outputPath: string,
  convertOpus: boolean,
  excludeMedia: boolean
): Promise<ChatLog> {
  if (!fs.existsSync(filePath)) {
    throw new Error("Input file does not exist");
  }

  const content = fs.readFileSync(filePath, "utf8");
  return parseChatContent(
    content,
    meHash,
    isGroupChat,
    outputPath,
    convertOpus,
    excludeMedia
  );
}

async function parseChatContent(
  content: string,
  meHash: string,
  isGroupChat: boolean,
  outputPath: string,
  convertOpus: boolean,
  excludeMedia: boolean
): Promise<ChatLog> {
  if (convertOpus) {
    const ffmpegAvailable = await checkFFmpegAvailability();
    if (!ffmpegAvailable) {
      throw new Error(
        "The --convert-opus option is enabled, but ffmpeg is not available. Please install ffmpeg or disable the --convert-opus option."
      );
    }
  }

  const lines = content.split("\n");
  const chatMessages: ChatMessage[] = [];
  let dayCache: string | null = null;
  let msgIndex = 0;
  let lastPerson = "Unknown"; // Default to 'Unknown'
  let lastHour = "";
  let inferredChatName = isGroupChat ? "Group Chat" : "Personal Chat";
  let lastTimestamp = Math.floor(Date.now() / 1000); // Default to the current timestamp

  const timestampFormat = "MM/DD/YY, HH:mm:ss"; // Adjust based on expected chat log format

  for (const line of lines) {
    console.log(`Processing line: ${line}`); // Diagnostic log

    // Use moment to attempt parsing the timestamp
    const timestampMatch = line.match(/^\[(.+?)\]/);
    if (timestampMatch) {
      const dateString = timestampMatch[1];
      const parsedDate = moment(dateString, timestampFormat);

      if (!parsedDate.isValid()) {
        console.warn(`Warning: Invalid date in line, skipping: ${line}`);
        continue;
      }

      const timestamp = Math.floor(parsedDate.toDate().getTime() / 1000);
      const normalizedLine = line.replace(/^\[.+?\]/, "").trim();

      lastTimestamp = timestamp;
      lastHour = parsedDate.format("HH:mm");

      const attachmentMatch = normalizedLine.match(/<attached: (.+)>/);
      if (attachmentMatch) {
        if (excludeMedia) {
          console.log(
            `Skipping attachment as excludeMedia is true: ${normalizedLine}`
          );
          continue; // Skip to the next line if media should be excluded
        }

        const attachment = attachmentMatch[1];
        const originalAttachmentPath = path.resolve(
          outputPath,
          attachment.trim()
        );

        const isValid = await validateMediaFile(originalAttachmentPath);
        if (!isValid) {
          console.warn(
            `Invalid or unsupported media file: ${originalAttachmentPath}`
          );
          continue; // Skip to the next line if the file is not valid
        }

        if (
          path.extname(originalAttachmentPath).toLowerCase() === ".opus" &&
          convertOpus
        ) {
          // Define the path for the converted MP3 file
          const finalAttachmentPath = originalAttachmentPath.replace(
            /\.opus$/i,
            ".mp3"
          );

          try {
            console.log(`Converting ${originalAttachmentPath} to MP3...`);
            await convertOpusToMp3(originalAttachmentPath, finalAttachmentPath);
          } catch (error) {
            console.error(
              `Conversion failed for ${originalAttachmentPath}: ${error}`
            );
            chatMessages.push({
              type: "msg",
              index: msgIndex++,
              tstamp: lastTimestamp,
              message: "Media file attached (conversion failed)",
              attachment: originalAttachmentPath,
            });
            continue;
          }

          if (fs.existsSync(finalAttachmentPath)) {
            chatMessages.push({
              type: "msg",
              index: msgIndex++,
              tstamp: timestamp,
              hour: lastHour,
              person: lastPerson, // Use the last known sender
              message: "Media file attached",
              attachment: finalAttachmentPath,
            });
            console.log(
              `Added message with attachment: ${finalAttachmentPath}`
            );
          } else {
            console.warn(
              `Warning: Attachment file not found at ${finalAttachmentPath}`
            );
          }
        } else if (fs.existsSync(originalAttachmentPath)) {
          chatMessages.push({
            type: "msg",
            index: msgIndex++,
            tstamp: timestamp,
            hour: lastHour,
            person: lastPerson, // Use the last known sender
            message: "Media file attached",
            attachment: originalAttachmentPath,
          });
          console.log(
            `Added message with attachment: ${originalAttachmentPath}`
          );
        } else {
          console.warn(
            `Warning: Attachment file not found at ${originalAttachmentPath}`
          );
          chatMessages.push({
            type: "msg",
            index: msgIndex++,
            tstamp: timestamp,
            hour: lastHour,
            person: lastPerson,
            message: "Media file attached (file missing)",
            attachment: originalAttachmentPath,
          });
        }
      } else {
        const messageRegex = /^([^:]+): (.*)$/;
        const messageMatch = normalizedLine.match(messageRegex);

        if (messageMatch) {
          const [__, person, message] = messageMatch;
          const fromMe =
            createHash("md5").update(person).digest("hex") === meHash;
          lastPerson = person; // Update last known sender

          if (!isGroupChat && !fromMe) inferredChatName = person;

          if (dayCache !== parsedDate.toISOString().split("T")[0]) {
            dayCache = parsedDate.toISOString().split("T")[0];
            chatMessages.push({
              type: "dchange",
              index: msgIndex++,
              tstamp: timestamp,
              date: parsedDate.format("MMMM D, YYYY"),
              message: `Date changed to ${parsedDate.format("MMMM D, YYYY")}`,
            });
          }

          chatMessages.push({
            type: "msg",
            index: msgIndex++,
            tstamp: timestamp,
            hour: lastHour,
            person: person,
            message: message,
            fromMe: fromMe,
          });
          console.log(`Added message from ${person}: ${message}`);
        } else {
          chatMessages.push({
            type: "notification",
            index: msgIndex++,
            tstamp: timestamp,
            message: normalizedLine,
          });
          console.log(`Added notification: ${normalizedLine}`);
        }
      }
    } else {
      const attachmentMatch = line.match(/<attached: (.+)>/);
      if (attachmentMatch) {
        if (excludeMedia) {
          console.log(`Skipping attachment as excludeMedia is true: ${line}`);
          continue;
        }

        const attachment = attachmentMatch[1];
        const originalAttachmentPath = path.resolve(
          outputPath,
          attachment.trim()
        );

        const isValid = await validateMediaFile(originalAttachmentPath);
        if (!isValid) {
          console.warn(
            `Invalid or unsupported media file: ${originalAttachmentPath}`
          );
          continue;
        }

        if (
          path.extname(originalAttachmentPath).toLowerCase() === ".opus" &&
          convertOpus
        ) {
          const finalAttachmentPath = originalAttachmentPath.replace(
            /\.opus$/i,
            ".mp3"
          );

          try {
            console.log(`Converting ${originalAttachmentPath} to MP3...`);
            await convertOpusToMp3(originalAttachmentPath, finalAttachmentPath);
          } catch (conversionError) {
            console.error(`Conversion failed: ${conversionError}`);
            chatMessages.push({
              type: "msg",
              index: msgIndex++,
              tstamp: lastTimestamp,
              hour: lastHour,
              person: lastPerson,
              message: "Media file attached (conversion failed)",
              attachment: originalAttachmentPath,
            });
            continue;
          }

          if (fs.existsSync(finalAttachmentPath)) {
            chatMessages.push({
              type: "msg",
              index: msgIndex++,
              tstamp: lastTimestamp,
              hour: lastHour,
              person: lastPerson,
              message: "Media file attached",
              attachment: finalAttachmentPath,
            });
            console.log(
              `Added message with attachment: ${finalAttachmentPath}`
            );
          } else {
            console.warn(
              `Warning: Attachment file not found at ${finalAttachmentPath}`
            );
          }
        } else if (fs.existsSync(originalAttachmentPath)) {
          chatMessages.push({
            type: "msg",
            index: msgIndex++,
            tstamp: lastTimestamp,
            hour: lastHour,
            person: lastPerson,
            message: "Media file attached",
            attachment: originalAttachmentPath,
          });
          console.log(
            `Added message with attachment: ${originalAttachmentPath}`
          );
        } else {
          console.warn(
            `Warning: Attachment file not found at ${originalAttachmentPath}`
          );
          chatMessages.push({
            type: "msg",
            index: msgIndex++,
            tstamp: lastTimestamp,
            hour: lastHour,
            person: lastPerson,
            message: "Media file attached (file missing)",
            attachment: originalAttachmentPath,
          });
        }
      } else if (line.trim()) {
        chatMessages.push({
          type: "notification",
          index: msgIndex++,
          tstamp: lastTimestamp,
          message: line.trim(),
        });
        console.log(`Added notification: ${line.trim()}`);
      }
    }
  }

  const hash = createHash("md5")
    .update(JSON.stringify(chatMessages))
    .digest("hex");

  return {
    groupChat: isGroupChat,
    chatName: inferredChatName,
    me: meHash,
    hash: hash,
    chatLog: chatMessages,
  };
}
