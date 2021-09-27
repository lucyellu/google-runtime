// eslint-disable-next-line import/prefer-default-export,optimize-regex/optimize-regex
export const generateResponseText = (output: string) => output.replace(/<[^><]+\/?>/g, '').trim() || '🔊';
