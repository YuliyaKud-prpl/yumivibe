import { NextRequest } from 'next/server';
import { Readable } from 'stream';
import { IncomingMessage } from 'http';
import formidable from 'formidable';
import { success, fromCatch } from '@/lib/utils/apiResponse';
import { AppError } from '@/lib/utils/AppError';
import { authenticateRequest } from '@/lib/middleware/auth';
import { dashboardIdSchema } from '@/lib/validators/dashboardSchemas';
import { uploadBackgroundSchema } from '@/lib/validators/backgroundSchemas';
import { saveUploadedImage } from '@/lib/services/backgroundService';

interface RouteContext {
  params: Promise<{ id: string }>;
}

function toNodeRequest(request: NextRequest): IncomingMessage {
  const readable = new Readable();
  const reader = request.body?.getReader();

  readable._read = async () => {
    if (!reader) {
      readable.push(null);
      return;
    }
    const { done, value } = await reader.read();
    if (done) {
      readable.push(null);
    } else {
      readable.push(Buffer.from(value));
    }
  };

  const nodeReq = Object.assign(readable, {
    headers: Object.fromEntries(request.headers.entries()),
    method: request.method,
    url: request.url,
  }) as IncomingMessage;

  return nodeReq;
}

function parseForm(
  req: IncomingMessage
): Promise<{ fields: formidable.Fields; files: formidable.Files }> {
  const form = formidable({
    maxFileSize: 5 * 1024 * 1024,
    filter: ({ mimetype }) => {
      return (
        mimetype === 'image/jpeg' ||
        mimetype === 'image/png' ||
        mimetype === 'image/webp'
      );
    },
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) {
        reject(err);
      } else {
        resolve({ fields, files });
      }
    });
  });
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const auth = await authenticateRequest(request);
    void auth;

    const { id } = await context.params;
    const idParsed = dashboardIdSchema.safeParse({ id });
    if (!idParsed.success) {
      throw AppError.validation('Invalid dashboard ID', {
        issues: idParsed.error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      });
    }
    const validId = idParsed.data.id;

    const nodeReq = toNodeRequest(request);
    const { files } = await parseForm(nodeReq);

    const imageFiles = files['image'];
    if (!imageFiles || imageFiles.length === 0) {
      throw AppError.validation('Missing image file');
    }

    const file = imageFiles[0];
    if (!file) {
      throw AppError.validation('Missing image file');
    }

    const fileValidation = uploadBackgroundSchema.safeParse({
      mimetype: file.mimetype,
      size: file.size,
    });
    if (!fileValidation.success) {
      const issues = fileValidation.error.issues;
      const hasTypeIssue = issues.some((i) =>
        i.path.includes('mimetype')
      );
      const hasSizeIssue = issues.some((i) =>
        i.path.includes('size')
      );

      if (hasTypeIssue) {
        throw AppError.invalidFileType(file.mimetype ?? 'unknown');
      }
      if (hasSizeIssue) {
        throw AppError.fileTooLarge(file.size);
      }
      throw AppError.validation('Invalid file', {
        issues: issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      });
    }

    const backgroundPath = await saveUploadedImage(file, validId);

    return success({
      background: backgroundPath,
      backgroundType: 'image' as const,
    });
  } catch (err) {
    return fromCatch(err);
  }
}
