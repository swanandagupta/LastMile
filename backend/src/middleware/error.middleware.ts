import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err.statusCode || err.status || 500;
  const code = err.code || (statusCode === 500 ? 'INTERNAL_SERVER_ERROR' : 'BAD_REQUEST');
  const message = err.message || 'An unexpected error occurred';

  if (statusCode === 500) {
    console.error('[UNHANDLED_ERROR]', err);
  }

  res.status(statusCode).json({
    error: {
      code,
      message,
      ...(err.pincode ? { pincode: err.pincode } : {}),
    },
  });
};
