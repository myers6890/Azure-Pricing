import { NextResponse } from "next/server";

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    { error: message, details },
    { status },
  );
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
