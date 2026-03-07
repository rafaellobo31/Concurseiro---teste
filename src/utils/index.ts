
export const normalizeAnswer = (answer: string | null): string => {
  if (!answer) return '';
  return answer.trim().toUpperCase();
};

export const resolveToCanonical = (correctAnswer: string, options?: string[]): string => {
  if (!correctAnswer) return '';
  
  // Se for uma letra (A, B, C, D, E)
  if (/^[A-E]$/i.test(correctAnswer)) {
    return correctAnswer.toUpperCase();
  }

  // Se for o texto da opção, tenta encontrar a letra correspondente
  if (options) {
    const index = options.findIndex(opt => opt === correctAnswer);
    if (index !== -1) {
      return String.fromCharCode(65 + index);
    }
  }

  return correctAnswer.toUpperCase();
};

export const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};
