import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, extname } from 'path';
import { randomUUID } from 'crypto';
import { AppError } from '@/lib/utils/AppError';
import { checkUnsplashLimit } from '@/lib/utils/rateLimiter';
import * as cache from '@/lib/utils/cache';

const UNSPLASH_API_URL = 'https://api.unsplash.com/search/photos';
const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'backgrounds');
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

interface UnsplashImage {
  id: string;
  url: string;
  thumbUrl: string;
  author: string;
}

interface UnsplashSearchResult {
  images: UnsplashImage[];
}

interface UnsplashApiPhoto {
  id: string;
  urls: { regular: string; small: string };
  user: { name: string };
}

interface UnsplashApiResponse {
  results: UnsplashApiPhoto[];
}

export const searchUnsplash = async (
  searchQuery: string,
  page = 1
): Promise<UnsplashSearchResult> => {
  const cacheKey = `unsplash:${searchQuery.toLowerCase()}:${page}`;
  const cached = cache.get<UnsplashSearchResult>(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const rateCheck = checkUnsplashLimit();
  if (!rateCheck.allowed) {
    throw AppError.rateLimitUnsplash();
  }

  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    throw AppError.internal('Unsplash API key is not configured');
  }

  try {
    const params = new URLSearchParams({
      query: searchQuery,
      page: String(page),
      per_page: '12',
      orientation: 'landscape',
    });

    const response = await fetch(
      `${UNSPLASH_API_URL}?${params.toString()}`,
      {
        headers: {
          Authorization: `Client-ID ${accessKey}`,
        },
        signal: AbortSignal.timeout(10_000),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        throw AppError.rateLimitUnsplash();
      }
      throw AppError.externalApiError(
        'Unsplash',
        `HTTP ${response.status}`
      );
    }

    const data = (await response.json()) as UnsplashApiResponse;
    const result: UnsplashSearchResult = {
      images: data.results.map((photo) => ({
        id: photo.id,
        url: photo.urls.regular,
        thumbUrl: photo.urls.small,
        author: photo.user.name,
      })),
    };

    cache.set(cacheKey, result, cache.UNSPLASH_TTL_MS);
    return result;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw AppError.externalApiError(
      'Unsplash',
      err instanceof Error ? err.message : 'Unknown error'
    );
  }
};

interface UploadedFile {
  filepath: string;
  mimetype: string | null;
  size: number;
}

export const saveUploadedImage = async (
  file: UploadedFile,
  dashboardId: string
): Promise<string> => {
  const mimeType = file.mimetype ?? '';

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw AppError.invalidFileType(mimeType);
  }

  if (file.size > MAX_FILE_SIZE) {
    throw AppError.fileTooLarge(file.size);
  }

  const ext = MIME_TO_EXT[mimeType] ?? extname(file.filepath);
  const filename = `${dashboardId}-${randomUUID()}${ext}`;

  try {
    await mkdir(UPLOAD_DIR, { recursive: true });

    const fileBuffer = await readFile(file.filepath);
    const destPath = join(UPLOAD_DIR, filename);
    await writeFile(destPath, fileBuffer);

    return `/uploads/backgrounds/${filename}`;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw AppError.internal('Failed to save uploaded image');
  }
};
