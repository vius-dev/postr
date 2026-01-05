import { supabase } from '@/lib/supabase';
import { File } from 'expo-file-system';

/**
 * Uploads a file to Supabase storage.
 * @param uri Local file URI
 * @param bucket Storage bucket name (default: 'media')
 * @returns Public URL of the uploaded file
 */
export const uploadFile = async (uri: string, bucket: string = 'media'): Promise<string> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // 1. Read file using new FileSystem API
    // 'file://' prefix is handled by the URL class or the File class in the new API usually.
    // However, if the uri comes from image picker it has 'file://'.
    const file = new File(uri);
    const bytes = await file.bytes();

    // 2. Generate unique path
    const ext = uri.split('.').pop() || 'jpg';
    const filename = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;

    // 3. Upload
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filename, bytes, {
        contentType: `image/${ext}`,
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // 4. Get Public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filename);

    return publicUrl;
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
};
