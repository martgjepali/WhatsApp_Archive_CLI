import { program } from 'commander';
import { registerParseCommand } from '../src/commands/parseCommand';

program.version('1.0.0').description('CLI tool to transform WhatsApp chat transcripts into JSON');
registerParseCommand(program);

describe('CLI Entry Point', () => {
  it('should correctly setup CLI version and description', () => {
    expect(program.version()).toBe('1.0.0');
    expect(program.description()).toMatch(/CLI tool to transform WhatsApp chat transcripts into JSON/);
  });

  it('should register the parse command', () => {
    expect(program.commands.some(cmd => cmd.name() === 'parse')).toBe(true);
  });
});
