import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PrintOrderService } from './print-order.service';
import { Order } from '../../../database/entities/order.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('PrintOrderService', () => {
  let service: PrintOrderService;
  let orderRepo: any;

  beforeEach(async () => {
    orderRepo = {
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrintOrderService,
        { provide: getRepositoryToken(Order), useValue: orderRepo },
      ],
    }).compile();
    service = module.get<PrintOrderService>(PrintOrderService);
  });

  // ═════════════════════════════════════════════════
  describe('forward transitions', () => {
    it('null → printing', async () => {
      orderRepo.findOne.mockResolvedValue({ id: 'o1', type: 'print', printStatus: null });
      await service.updatePrintStatus('o1', 'printing');
      expect(orderRepo.update).toHaveBeenCalledWith('o1', { printStatus: 'printing' });
    });

    it('printing → shipped', async () => {
      orderRepo.findOne.mockResolvedValue({ id: 'o1', type: 'print', printStatus: 'printing' });
      await service.updatePrintStatus('o1', 'shipped');
      expect(orderRepo.update).toHaveBeenCalledWith('o1', { printStatus: 'shipped' });
    });

    it('shipped → delivered', async () => {
      orderRepo.findOne.mockResolvedValue({ id: 'o1', type: 'print', printStatus: 'shipped' });
      await service.updatePrintStatus('o1', 'delivered');
      expect(orderRepo.update).toHaveBeenCalledWith('o1', { printStatus: 'delivered' });
    });
  });

  // ═════════════════════════════════════════════════
  describe('rollback transitions', () => {
    it('printing → null (回退到待处理)', async () => {
      orderRepo.findOne.mockResolvedValue({ id: 'o1', type: 'print', printStatus: 'printing' });
      await service.updatePrintStatus('o1', null);
      expect(orderRepo.update).toHaveBeenCalledWith('o1', { printStatus: null });
    });

    it('shipped → printing (退回打印中)', async () => {
      orderRepo.findOne.mockResolvedValue({ id: 'o1', type: 'print', printStatus: 'shipped' });
      await service.updatePrintStatus('o1', 'printing');
      expect(orderRepo.update).toHaveBeenCalledWith('o1', { printStatus: 'printing' });
    });

    it('delivered → shipped (退回已发货)', async () => {
      orderRepo.findOne.mockResolvedValue({ id: 'o1', type: 'print', printStatus: 'delivered' });
      await service.updatePrintStatus('o1', 'shipped');
      expect(orderRepo.update).toHaveBeenCalledWith('o1', { printStatus: 'shipped' });
    });
  });

  // ═════════════════════════════════════════════════
  describe('invalid transitions', () => {
    it('null → shipped (skip)', async () => {
      orderRepo.findOne.mockResolvedValue({ id: 'o1', type: 'print', printStatus: null });
      await expect(service.updatePrintStatus('o1', 'shipped')).rejects.toThrow(BadRequestException);
    });

    it('null → delivered (skip)', async () => {
      orderRepo.findOne.mockResolvedValue({ id: 'o1', type: 'print', printStatus: null });
      await expect(service.updatePrintStatus('o1', 'delivered')).rejects.toThrow(BadRequestException);
    });

    it('printing → delivered (skip)', async () => {
      orderRepo.findOne.mockResolvedValue({ id: 'o1', type: 'print', printStatus: 'printing' });
      await expect(service.updatePrintStatus('o1', 'delivered')).rejects.toThrow(BadRequestException);
    });

    it('reject non-print order', async () => {
      orderRepo.findOne.mockResolvedValue({ id: 'o1', type: 'download', printStatus: null });
      await expect(service.updatePrintStatus('o1', 'printing')).rejects.toThrow(BadRequestException);
    });

    it('reject non-existent order', async () => {
      orderRepo.findOne.mockResolvedValue(null);
      await expect(service.updatePrintStatus('bad', 'printing')).rejects.toThrow(NotFoundException);
    });
  });
});
