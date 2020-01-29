export function EscapeAnsi(msg: string): string {
  const arr = [...msg];
  return arr.map(c => {
    const code = c.charCodeAt(0);
    if (code >= 0x20 || code === 0x0a || code === 0x0d) {
      return c;
    } else if (code < 0x10) {
      return `\\x0${code}`;
    } else {
      return `\\x1${code % 16}`;
    }
  }).join('');
};

