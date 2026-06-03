import { ResponseInterceptor } from './interceptors/response.interceptor';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { JwtAuthGuard } from './guards/jwt.guard';
import { RolesGuard } from './guards/roles.guard';
import { of, throwError } from 'rxjs';
import { HttpException, HttpStatus, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

describe('Common — Interceptors & Filters', () => {
  describe('ResponseInterceptor', () => {
    const interceptor = new ResponseInterceptor();
    const mockContext = {
      switchToHttp: () => ({
        getResponse: () => ({ statusCode: 200 }),
        getRequest: () => ({ url: '/test' }),
      }),
    } as any;

    it('should wrap successful response', (done) => {
      const next = { handle: () => of({ data: 'hello' }) };
      interceptor.intercept(mockContext, next).subscribe((result: any) => {
        expect(result.code).toBe(0);
        expect(result.message).toBe('ok');
        expect(result.data).toEqual({ data: 'hello' });
        expect(result.timestamp).toBeDefined();
        done();
      });
    });

    it('should pass through errors', (done) => {
      const error = new HttpException('bad', 400);
      const next = { handle: () => throwError(() => error) };
      interceptor.intercept(mockContext, next).subscribe({
        error: (err: any) => {
          expect(err).toBe(error);
          done();
        },
      });
    });
  });

  describe('HttpExceptionFilter', () => {
    const filter = new HttpExceptionFilter();

    it('should format HttpException response', () => {
      const exception = new HttpException({ code: 20002, message: '题库不足' }, HttpStatus.BAD_REQUEST);
      const mockResponse = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const mockContext = {
        switchToHttp: () => ({ getResponse: () => mockResponse, getRequest: () => ({ url: '/test' }) }),
      } as any;

      filter.catch(exception, mockContext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 20002, message: '题库不足' }),
      );
    });
  });

  describe('RolesGuard', () => {
    it('should allow access when no roles required', () => {
      const reflector = { getAllAndOverride: jest.fn().mockReturnValue(undefined) } as any;
      const guard = new RolesGuard(reflector);
      const context = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: () => ({ getRequest: () => ({ user: { role: 'teacher' } }) }),
      } as any;

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access with correct role', () => {
      const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['admin']) } as any;
      const guard = new RolesGuard(reflector);
      const context = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: () => ({ getRequest: () => ({ user: { role: 'admin' } }) }),
      } as any;

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should throw ForbiddenException with wrong role', () => {
      const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['admin']) } as any;
      const guard = new RolesGuard(reflector);
      const context = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: () => ({ getRequest: () => ({ user: { role: 'teacher' } }) }),
      } as any;

      expect(() => guard.canActivate(context)).toThrow();
    });
  });
});
