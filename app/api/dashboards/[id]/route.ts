import { NextRequest } from 'next/server';
import { success, fromCatch } from '@/lib/utils/apiResponse';
import { AppError } from '@/lib/utils/AppError';
import { authenticateRequest } from '@/lib/middleware/auth';
import {
  dashboardIdSchema,
  updateDashboardSchema,
} from '@/lib/validators/dashboardSchemas';
import {
  getDashboard,
  updateDashboard,
  deleteDashboard,
} from '@/lib/services/dashboardService';

interface RouteContext {
  params: Promise<{ id: string }>;
}

function validateId(id: string): string {
  const parsed = dashboardIdSchema.safeParse({ id });
  if (!parsed.success) {
    throw AppError.validation('Invalid dashboard ID', {
      issues: parsed.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      })),
    });
  }
  return parsed.data.id;
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const auth = await authenticateRequest(request);
    const { id } = await context.params;
    const validId = validateId(id);
    const dashboard = await getDashboard(validId, auth.userId);

    return success({ dashboard });
  } catch (err) {
    return fromCatch(err);
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const auth = await authenticateRequest(request);
    const { id } = await context.params;
    const validId = validateId(id);
    const body: unknown = await request.json();

    const parsed = updateDashboardSchema.safeParse(body);
    if (!parsed.success) {
      throw AppError.validation('Invalid update data', {
        issues: parsed.error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      });
    }

    const dashboard = await updateDashboard(validId, auth.userId, parsed.data);

    return success({ dashboard });
  } catch (err) {
    return fromCatch(err);
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const auth = await authenticateRequest(request);
    const { id } = await context.params;
    const validId = validateId(id);
    await deleteDashboard(validId, auth.userId);

    return new Response(null, { status: 204 });
  } catch (err) {
    return fromCatch(err);
  }
}
