import { Test, TestingModule } from '@nestjs/testing';
import { ConversationsService } from './conversations.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

describe('ConversationsService', () => {
  let service: ConversationsService;
  let prisma: PrismaService;

  const mockPrisma = {
    user: { findUnique: jest.fn() },
    conversation: { findUnique: jest.fn(), create: jest.fn(), findMany: jest.fn() },
    conversationMember: { findUnique: jest.fn(), update: jest.fn(), count: jest.fn() },
    message: { count: jest.fn() },
    $transaction: jest.fn((callback) => callback(mockPrisma)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ConversationsService>(ConversationsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDeterministicConversationId', () => {
    it('should generate identical compound IDs regardless of argument order', () => {
      const id1 = service.getDeterministicConversationId('user_alpha', 'user_beta');
      const id2 = service.getDeterministicConversationId('user_beta', 'user_alpha');

      expect(id1).toEqual('user_alpha_user_beta');
      expect(id1).toEqual(id2);
    });
  });

  describe('getOrCreateConversation', () => {
    it('should throw BadRequestException if messaging oneself', async () => {
      await expect(
        service.getOrCreateConversation('user_123', 'user_123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteConversation ("Delete For Me")', () => {
    it('should set clearedAt on ConversationMember without deleting the conversation record', async () => {
      mockPrisma.conversationMember.findUnique.mockResolvedValue({
        conversationId: 'user_a_user_b',
        userId: 'user_a',
      });
      mockPrisma.conversationMember.update.mockResolvedValue({
        conversationId: 'user_a_user_b',
        userId: 'user_a',
        clearedAt: new Date(),
      });

      const result = await service.deleteConversation('user_a_user_b', 'user_a');

      expect(result).toEqual({ success: true });
      expect(mockPrisma.conversationMember.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { conversationId_userId: { conversationId: 'user_a_user_b', userId: 'user_a' } },
          data: { clearedAt: expect.any(Date) },
        }),
      );
    });

    it('should throw ForbiddenException if user is not a verified member', async () => {
      mockPrisma.conversationMember.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteConversation('user_a_user_b', 'intruder_id'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
