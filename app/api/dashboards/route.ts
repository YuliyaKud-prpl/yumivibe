import { NextRequest } from 'next/server';
import { success, fromCatch } from '@/lib/utils/apiResponse';
import { AppError } from '@/lib/utils/AppError';
import { authenticateRequest } from '@/lib/middleware/auth';
import { createDashboardSchema } from '@/lib/validators/dashboardSchemas';
import { listDashboards, createDashboard } from '@/lib/services/dashboardService';

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    const dashboards = await listDashboards(auth.userId);

    return success({ dashboards });
  } catch (err) {
    return fromCatch(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    const body: unknown = await request.json();

    const parsed = createDashboardSchema.safeParse(body);
    if (!parsed.success) {
      throw AppError.validation('Invalid dashboard data', {
        issues: parsed.error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      });
    }

    const dashboard = await createDashboard(auth.userId, parsed.data.name);

    return success({ dashboard }, 201);
  } catch (err) {
    return fromCatch(err);
  }
}
