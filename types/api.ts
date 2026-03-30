export interface ApiError {
  code: string;
  message: string;
  status: number;
  details?: Array<{ field: string; message: string }>;
  retryAfter?: number;
}

export type ApiResponse<T> =
  | { data: T; error?: never }
  | { data?: never; error: ApiError };

export interface CreateDashboardRequest {
  name?: string;
}

export interface UpdateDashboardRequest {
  name?: string;
  theme?: 'light' | 'dark';
  background?: string;
  backgroundType?: 'color' | 'gradient' | 'image' | 'unsplash';
  addBlocks?: Array<{ type: string; title?: string }>;
  removeBlocks?: string[];
  updateBlocks?: Array<{
    id: string;
    content?: Record<string, unknown>;
    layout_x?: number;
    layout_y?: number;
    layout_w?: number;
    layout_h?: number;
  }>;
}
