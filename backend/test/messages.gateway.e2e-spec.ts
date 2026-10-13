import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { io, Socket } from 'socket.io-client';
import { AppModule } from '../src/app.module';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../src/prisma/prisma.service';

describe('MessagesGateway (E2E)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let configService: ConfigService;
  let prisma: PrismaService;
  let clientSocketUserA: Socket;
  let clientSocketUserB: Socket;

  const userAId = 'e2e_test_user_a_id';
  const userBId = 'e2e_test_user_b_id';
  const convId = `${userAId}_${userBId}`;
  const testMessageId = 'e2e_test_msg_id_1';

  let userAToken: string;
  let userBToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    jwtService = moduleRef.get<JwtService>(JwtService);
    configService = moduleRef.get<ConfigService>(ConfigService);
    prisma = moduleRef.get<PrismaService>(PrismaService);

    await app.listen(0);

    const address = app.getHttpServer().address();
    const port = typeof address === 'string' ? 4000 : address.port;
    const uri = `http://localhost:${port}`;

    const secret =
      configService.get<string>('JWT_ACCESS_SECRET') ||
      process.env.JWT_ACCESS_SECRET ||
      'test_secret_for_e2e_jwt_signing_key_12345';

    // 1. Seed users
    await prisma.user.upsert({
      where: { id: userAId },
      update: { isOnline: false },
      create: {
        id: userAId,
        email: 'e2e_usera@example.com',
        username: 'e2e_usera',
        usernameLowercase: 'e2e_usera',
        displayName: 'E2E User A',
        passwordHash: 'dummy_hash',
      },
    });

    await prisma.user.upsert({
      where: { id: userBId },
      update: { isOnline: false },
      create: {
        id: userBId,
        email: 'e2e_userb@example.com',
        username: 'e2e_userb',
        usernameLowercase: 'e2e_userb',
        displayName: 'E2E User B',
        passwordHash: 'dummy_hash',
      },
    });

    // 2. Seed conversation & members
    await prisma.conversation.upsert({
      where: { id: convId },
      update: {},
      create: {
        id: convId,
        members: {
          create: [{ userId: userAId }, { userId: userBId }],
        },
      },
    });

    // 3. Seed an actual message from User A to delete
    await prisma.message.upsert({
      where: { id: testMessageId },
      update: { deletedAt: null },
      create: {
        id: testMessageId,
        conversationId: convId,
        senderId: userAId,
        receiverId: userBId,
        text: 'E2E Test Message to be un-sent',
      },
    });

    userAToken = jwtService.sign(
      { sub: userAId, username: 'e2e_usera' },
      { secret },
    );
    userBToken = jwtService.sign(
      { sub: userBId, username: 'e2e_userb' },
      { secret },
    );

    clientSocketUserA = io(uri, { auth: { token: userAToken }, autoConnect: false });
    clientSocketUserB = io(uri, { auth: { token: userBToken }, autoConnect: false });
  });

  afterAll(async () => {
    if (clientSocketUserA && clientSocketUserA.connected) {
      clientSocketUserA.disconnect();
    }
    if (clientSocketUserB && clientSocketUserB.connected) {
      clientSocketUserB.disconnect();
    }

    try {
      await prisma.message.deleteMany({ where: { conversationId: convId } });
      await prisma.conversationMember.deleteMany({ where: { conversationId: convId } });
      await prisma.conversation.deleteMany({ where: { id: convId } });
      await prisma.user.deleteMany({ where: { id: { in: [userAId, userBId] } } });
    } catch (_) {}

    if (app) {
      await app.close();
    }
  });

  it('should authenticate and connect successfully', (done) => {
    clientSocketUserA.connect();
    clientSocketUserA.on('connect', () => {
      expect(clientSocketUserA.connected).toBeTruthy();
      done();
    });
  });

  it('should broadcast message_deleted to participants in real time', (done) => {
    clientSocketUserB.connect();

    clientSocketUserB.on('connect', () => {
      // Both clients join the conversation room
      clientSocketUserA.emit('join_conversation', { conversationId: convId });
      clientSocketUserB.emit('join_conversation', { conversationId: convId });

      // Receiver listens for real-time deletion
      clientSocketUserB.on('message_deleted', (data) => {
        expect(data.conversationId).toBe(convId);
        expect(data.messageId).toBe(testMessageId);
        done();
      });

      // Small delay allowing room join to complete on the socket server
      setTimeout(() => {
        clientSocketUserA.emit('delete_message', {
          conversationId: convId,
          messageId: testMessageId,
        });
      }, 200);
    });
  }, 10000);
});
