
export const handleError = (error: any, context?: string) => {
  console.error(`[${context || 'Error'}]`, error);
  // In a real app, we could send this to Sentry or show a toast
  return error?.message || 'Ocorreu um erro inesperado.';
};

export const showSuccess = (message: string) => {
  alert(message);
};
