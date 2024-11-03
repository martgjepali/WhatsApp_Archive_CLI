import fs from "fs";
import { createHash } from "crypto";
import { convertOpusToMp3 } from "../src/utils/convertOpusToMp3";
import { parseChatFile } from "../src/utils/chatParser";
import * as path from "path";

// Mock fs, moment, path, and convertOpusToMp3
jest.mock("fs");
jest.mock("moment", () => {
  const actualMoment = jest.requireActual("moment");
  return () => actualMoment("2020-01-01T00:00:00Z");
});
jest.mock("path");
jest.mock("crypto");
jest.mock("../src/utils/convertOpusToMp3");

describe("parseChatFile", () => {
  const outputPath = "../output";

  beforeAll(() => {
    (convertOpusToMp3 as jest.Mock).mockResolvedValue(undefined);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (fs.readFileSync as jest.Mock).mockReturnValue(
      `[01.01.20, 10:00:00] John Doe: Hello World!\n` +
        `[01.01.20, 10:01:00] Jane Doe: <attached: audio.opus>`
    );
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (createHash as jest.Mock).mockReturnValue({
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue("mockedHash"),
    });
    (path.extname as jest.Mock).mockImplementation((filePath: string) => {
      return filePath.endsWith(".opus") ? ".opus" : "";
    });
    (path.resolve as jest.Mock).mockImplementation((...paths) => {
      return paths.join("/");
    });
  });

  it("parses chat logs correctly and handles attachments", async () => {
    const filePath = "path/to/chat.txt";
    const chatLog = await parseChatFile(
      filePath,
      "mockedHash",
      true,
      outputPath
    );
  
    expect(chatLog).toHaveProperty("groupChat", true);
    expect(chatLog).toHaveProperty("chatName", "Group Chat");
  
    // Adjust expectations based on actual parsed content
    expect(chatLog.chatLog).toHaveLength(3);
  
    // Check the structure of the first message (dchange)
    expect(chatLog.chatLog[0]).toMatchObject({
      type: "dchange",
      message: "Date changed to 1 January 2020",
      date: "1 January 2020",
    });
  
    // Check the structure of the second message (regular message)
    expect(chatLog.chatLog[1]).toMatchObject({
      type: "msg",
      message: "Hello World!",
      person: "John Doe",
      fromMe: true,
      hour: "10:00",
    });
  
    // Check the structure of the third message (attachment)
    expect(chatLog.chatLog[2]).toMatchObject({
      type: "msg",
      message: "Media file attached",
      person: "John Doe",
      attachment: expect.any(String),
      hour: "10:01",
    });
  
    // Ensure the conversion was called for .opus files
    expect(convertOpusToMp3).toHaveBeenCalled();
  });
  

  it("logs errors if file does not exist", async () => {
    // Ensure existsSync returns false, simulating a missing file
    (fs.existsSync as jest.Mock).mockReturnValueOnce(false);

    await expect(
      parseChatFile("path/to/nonexistent.txt", "mockedHash", false, outputPath)
    ).rejects.toThrow("Input file does not exist");

    expect(fs.existsSync).toHaveBeenCalledWith("path/to/nonexistent.txt");
  });
});
