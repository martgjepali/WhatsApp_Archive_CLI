import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import { convertOpusToMp3 } from "../src/utils/convertOpusToMp3";

jest.mock("fs");
jest.mock("fluent-ffmpeg");

describe("convertOpusToMp3", () => {
  const inputPath = "../files";
  const outputPath = "../output";

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    (fs.existsSync as jest.Mock).mockReturnValue(true);

    const ffmpegMock = {
      toFormat: jest.fn().mockReturnThis(),
      on: jest.fn().mockImplementation(function (
        this: any,
        event: string,
        handler: (...args: any[]) => void
      ) {
        if (event === "error" && this.errorTrigger) {
          handler(new Error("Conversion failed"));
        } else if (event === "end") {
          handler();
        }
        return this;
      }),
      save: jest.fn().mockReturnThis(),
      errorTrigger: false, // Custom property to simulate error triggering
    };

    // Casting to unknown first to avoid TypeScript casting issues
    (ffmpeg as unknown as jest.Mock).mockImplementation(() => ffmpegMock);
  });

  it("should convert an opus file to mp3 successfully", async () => {
    await expect(
      convertOpusToMp3(inputPath, outputPath)
    ).resolves.toBeUndefined();
  });

  it("should throw an error if the input file does not exist", async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    await expect(convertOpusToMp3(inputPath, outputPath)).rejects.toThrow(
      "Input file does not exist"
    );
  });

  it("should handle errors during the conversion process", async () => {
    const mockFfmpeg = ffmpeg() as any;
    mockFfmpeg.errorTrigger = true; // Trigger an error during conversion
    await expect(convertOpusToMp3(inputPath, outputPath)).rejects.toThrow(
      "Conversion failed"
    );
  });
});
