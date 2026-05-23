import { prisma } from './prisma';

export function hashRequestBody(body: unknown) {
  return JSON.stringify(body);
}

export async function findIdempotentResponse(key: string) {
  return prisma.idempotencyRecord.findUnique({ where: { key } });
}

export async function storeIdempotentResponse(key: string, method: string, path: string, requestHash: string, status: number, body: unknown) {
  return prisma.idempotencyRecord.create({
    data: {
      key,
      method,
      path,
      requestHash,
      responseStatus: status,
      responseBody: JSON.stringify(body)
    }
  });
}
