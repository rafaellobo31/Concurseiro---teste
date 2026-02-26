
export const hashPassword = async (password: string): Promise<string> => {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

export const normalizeAnswer = (val: string | null): string => {
  if (!val) return '';
  let cleaned = val.trim().toUpperCase();
  cleaned = cleaned.replace(/[\.\)\-\s]/g, '');
  if (cleaned === 'V' || cleaned === 'VERDADEIRA' || cleaned === 'TRUE' || cleaned === 'VERDADEIRO') return 'VERDADEIRO';
  if (cleaned === 'F' || cleaned === 'FALSA' || cleaned === 'FALSE' || cleaned === 'FALSO') return 'FALSO';
  return cleaned;
};

export const resolveToCanonical = (answer: string, options?: string[]): string => {
  const normAnswer = normalizeAnswer(answer);
  if (options && options.length > 0) {
    const letterIndex = normAnswer.charCodeAt(0) - 65;
    if (normAnswer.length === 1 && letterIndex >= 0 && letterIndex < options.length) {
      return normAnswer;
    }
    const foundIdx = options.findIndex(opt => normalizeAnswer(opt) === normAnswer);
    if (foundIdx !== -1) return String.fromCharCode(65 + foundIdx);
    if (normAnswer === 'VERDADEIRO') {
        const vIdx = options.findIndex(opt => normalizeAnswer(opt) === 'VERDADEIRO');
        if (vIdx !== -1) return String.fromCharCode(65 + vIdx);
    }
    if (normAnswer === 'FALSO') {
        const fIdx = options.findIndex(opt => normalizeAnswer(opt) === 'FALSO');
        if (fIdx !== -1) return String.fromCharCode(65 + fIdx);
    }
  }
  return normAnswer;
};
