export const generateTranId = (): string => {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 8); // 6 random alphanumeric characters
  return `TRN-${timestamp}-${random}`;
};
