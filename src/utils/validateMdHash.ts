export function validateMd5(hash: string): boolean {
  return /^[a-f0-9]{32}$/i.test(hash);
}
