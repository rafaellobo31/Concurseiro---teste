
export const normalizeAnswer = (val: string | null): string => {
  if (!val) return '';
  
  // Tratamento inicial: trim e uppercase
  let cleaned = val.trim().toUpperCase();
  
  // 1. Se for APENAS uma letra (A, B, C, D, E), retorna a letra
  if (/^[A-E]$/.test(cleaned)) return cleaned;

  // 2. Se for uma letra com decoração isolada tipo "A)", "(A)", "A.", "A -"
  const singleLetterMatch = cleaned.match(/^[\(\[]?([A-E])[\)\]\.]?$/);
  if (singleLetterMatch) return singleLetterMatch[1];

  // 3. Tratamento de Verdadeiro/Falso
  if (cleaned === 'V' || cleaned === 'VERDADEIRA' || cleaned === 'TRUE' || cleaned === 'VERDADEIRO') return 'VERDADEIRO';
  if (cleaned === 'F' || cleaned === 'FALSA' || cleaned === 'FALSE' || cleaned === 'FALSO') return 'FALSO';

  // 4. Comparação Semântica: Remover prefixos de alternativas do texto
  // Remove "A) ", "B. ", "C - ", "(D) " no início do texto
  cleaned = cleaned.replace(/^[A-E][\)\.\-\s]+/, '');
  cleaned = cleaned.replace(/^\([A-E]\)\s*/, '');
  
  // 5. Limpeza de caracteres especiais para comparação pura de texto
  cleaned = cleaned.replace(/[\.\)\-\(\[\]]/g, '').trim();
  
  return cleaned;
};

export const resolveToCanonical = (answer: string, options?: string[]): string => {
  if (!answer) return '';
  
  const normAnswer = normalizeAnswer(answer); // e.g., "A" ou "TEXTO DA RESPOSTA"
  
  if (options && options.length > 0) {
    // Tenta encontrar por letra direta (A-E)
    if (normAnswer.length === 1 && normAnswer >= 'A' && normAnswer <= 'E') {
      const letterIndex = normAnswer.charCodeAt(0) - 65;
      if (letterIndex >= 0 && letterIndex < options.length) {
        return normAnswer;
      }
    }

    // Tenta encontrar por correspondência de texto normalizado entre as opções
    const foundIdx = options.findIndex(opt => normalizeAnswer(opt) === normAnswer);
    if (foundIdx !== -1) return String.fromCharCode(65 + foundIdx);
    
    // Tratamento especial para mapeamento de V/F em opções que podem conter o texto
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
