
// src/api/files.ts

// This file will contain a stub for the files API.
// It will be extended with API calls for file uploads and downloads.

export const uploadFile = async (file: File): Promise<string> => {
  // TODO: Implement actual file upload
  console.log('Uploading file:', file.name);
  return `https://example.com/uploads/${file.name}`;
};
