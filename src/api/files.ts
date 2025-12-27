
// src/api/files.ts

/**
 * Uploads a file to Supabase storage or a target CDN.
 * This is currently a stub that returns a placeholder image.
 */
export const uploadFile = async (file: any): Promise<string> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // NOTE: In production, use supabase.storage.from('bucket').upload()
  // For now, we return a reliable placeholder service
  const randomId = Math.floor(Math.random() * 1000);
  return `https://images.unsplash.com/photo-${randomId}?auto=format&fit=crop&w=800&q=80`;
};
