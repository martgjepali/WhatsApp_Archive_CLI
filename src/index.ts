import { program } from "commander";
import { registerParseCommand } from './commands/parseCommand';

program
  .version("1.0.0")
  .description("CLI tool to transform WhatsApp chat transcripts into JSON");

registerParseCommand(program);

program.parse(process.argv);
