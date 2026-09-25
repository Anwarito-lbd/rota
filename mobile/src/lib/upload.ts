import type { MediaItem } from '../state/types';
import { supabase } from './supabase';

const EXTENSIONS: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
};

function describe(uri: string, kind: MediaItem['kind']) {
  const extension = (uri.split('?')[0].split('.').pop() ?? '').toLowerCase();
  const known = EXTENSIONS[extension];
  if (known) return { extension, contentType: known };
  return kind === 'video'
    ? { extension: 'mp4', contentType: 'video/mp4' }
    : { extension: 'jpg', contentType: 'image/jpeg' };
}

/**
 * Sends a picked file to Supabase Storage and returns its path. Files always
 * live under the owner's user id, which is what the storage policies allow.
 */
export async function uploadMedia(
  bucket: 'listing-media' | 'avatars' | 'private-docs' | 'rental-evidence',
  userId: string,
  item: MediaItem,
  /** Second path segment, e.g. the rental id for condition evidence. */
  subfolder?: string,
): Promise<string> {
  if (!supabase) throw new Error('Le serveur n’est pas configuré.');

  const { extension, contentType } = describe(item.uri, item.kind);
  const prefix = subfolder ? `${userId}/${subfolder}` : userId;
  const path = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;

  // React Native has no File API: fetch the local file and send the bytes.
  const response = await fetch(item.uri);
  const bytes = await response.arrayBuffer();

  const { error } = await supabase.storage.from(bucket).upload(path, bytes, {
    contentType,
    upsert: false,
  });
  if (error) throw new Error(error.message);

  return path;
}
