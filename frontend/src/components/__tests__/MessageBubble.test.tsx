import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MessageBubble from '../MessageBubble';
import { Message, MessageStatus } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

const mockMessage: Message = {
  id: 'msg_1',
  conversationId: 'conv_1',
  senderId: 'user_self',
  receiverId: 'user_target',
  text: 'Hello, testing real-time chatly!',
  status: 'SENT' as MessageStatus,
  isEdited: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('MessageBubble Component', () => {
  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: 'user_self', username: 'self' },
      userId: 'user_self',
      isAuthenticated: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders sent message text accurately', () => {
    render(<MessageBubble message={mockMessage} isOwn={true} />);

    expect(
      screen.getByText('Hello, testing real-time chatly!'),
    ).toBeInTheDocument();
  });

  it('triggers onDelete callback when Unsend is clicked', () => {
    const handleDelete = jest.fn();

    render(
      <MessageBubble
        message={mockMessage}
        isOwn={true}
        onDelete={handleDelete}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: /more options/i }),
    );

    fireEvent.click(screen.getByText('Unsend'));

    expect(handleDelete).toHaveBeenCalledTimes(1);
    expect(handleDelete).toHaveBeenCalledWith('msg_1');
  });

  it('displays read receipts correctly when status is READ', () => {
    const readMessage: Message = {
      ...mockMessage,
      status: 'READ' as MessageStatus,
    };

    render(<MessageBubble message={readMessage} isOwn={true} />);

    expect(screen.getByText('Seen')).toBeInTheDocument();
  });
});

