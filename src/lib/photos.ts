import { supabase } from "@/integrations/supabase/client";
import { PHOTO_BUCKET } from "./constants";

const cache = new Map<string, string>();

export async function signedUrls(paths: string[]): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  const missing: string[] = [];
  for (const p of paths) {
    const hit = cache.get(p);
    if (hit) result[p] = hit;
    else missing.push(p);
  }
  if (missing.length) {
    const { data } = await supabase.storage
      .from(PHOTO_BUCKET)
      .createSignedUrls(missing, 60 * 60);
    for (const item of data ?? []) {
      if (item.path && item.signedUrl) {
        cache.set(item.path, item.signedUrl);
        result[item.path] = item.signedUrl;
      }
    }
  }
  return result;
}

export async function downloadPhoto(path: string, filename: string) {
  const { data, error } = await supabase.storage.from(PHOTO_BUCKET).download(path);
  if (error || !data) throw error ?? new Error("Gagal mengunduh foto");
  const url = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
