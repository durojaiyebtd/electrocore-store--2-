/**
 * Express-style helpers for Next.js Route Handlers:
 *  - ApiError: throw anywhere in a controller/service to return a clean JSON error
 *  - withErrorHandling: wraps a controller like Express error middleware
 *  - parseBody / parseQuery: zod validation of request input
 *
 * Every API response has the shape:
 *   { success: true,  data: ... }
 *   { success: false, error: { message, code, details? } }
 */
import { NextRequest, NextResponse } from 'next/server';
import { ZodError, type ZodType, type ZodTypeDef } from 'zod';

/** A zod schema whose parsed result is T. The input type is left open so schemas with .default() / .transform() work. */
type Schema<T> = ZodType<T, ZodTypeDef, unknown>;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, message: string, code = 'ERROR', details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function ok<T>(data: T, init?: { status?: number; headers?: HeadersInit }): NextResponse {
  return NextResponse.json({ success: true, data }, { status: init?.status ?? 200, headers: init?.headers });
}

export function errorResponse(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { success: false, error: { message: error.message, code: error.code, details: error.details } },
      { status: error.status },
    );
  }
  if (error instanceof ZodError) {
    const flat = error.flatten();
    const firstField = Object.values(flat.fieldErrors).flat()[0];
    return NextResponse.json(
      {
        success: false,
        error: {
          message: firstField ?? flat.formErrors[0] ?? 'Some details are invalid. Please check the form.',
          code: 'VALIDATION_ERROR',
          details: flat.fieldErrors,
        },
      },
      { status: 422 },
    );
  }
  console.error('[api] Unhandled error:', error);
  return NextResponse.json(
    { success: false, error: { message: 'Something went wrong on our side. Please try again.', code: 'INTERNAL_ERROR' } },
    { status: 500 },
  );
}

/** Second argument Next.js passes to handlers in dynamic routes, e.g. /api/products/[slug]. */
export interface RouteContext<P extends Record<string, string>> {
  params: Promise<P>;
}

type StaticHandler = (req: NextRequest) => Promise<Response>;
type DynamicHandler<P extends Record<string, string>> = (req: NextRequest, ctx: RouteContext<P>) => Promise<Response>;

/** Wrap a controller (static route) so thrown errors become JSON responses — like Express error middleware. */
export function withErrorHandling(handler: StaticHandler): StaticHandler {
  return async (req) => {
    try {
      return await handler(req);
    } catch (error) {
      return errorResponse(error);
    }
  };
}

/** Same as withErrorHandling, for dynamic routes that receive `params`. */
export function withParams<P extends Record<string, string>>(handler: DynamicHandler<P>): DynamicHandler<P> {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (error) {
      return errorResponse(error);
    }
  };
}

export async function parseBody<T>(req: NextRequest, schema: Schema<T>): Promise<T> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new ApiError(400, 'Request body must be valid JSON.', 'INVALID_JSON');
  }
  return schema.parse(json);
}

export function parseQuery<T>(req: NextRequest, schema: Schema<T>): T {
  const raw: Record<string, string> = {};
  req.nextUrl.searchParams.forEach((value, key) => {
    raw[key] = value;
  });
  return schema.parse(raw);
}
