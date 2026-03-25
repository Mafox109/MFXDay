// Sanitiza texto de entrada para evitar caracteres de controle.
// Para renderização, preferimos `textContent` (não `innerHTML`), reduzindo risco de XSS.
export function sanitizeText(input, { maxLength = 400 } = {}) {
  const raw = input === undefined || input === null ? '' : String(input);
  return raw
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

