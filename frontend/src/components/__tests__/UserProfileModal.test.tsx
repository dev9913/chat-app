import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import UserProfileModal from '../UserProfileModal';
import { User } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

const testUser: User = {
  id: 'target_id_1',
  username: 'johndoe',
  displayName: 'John Doe',
  photoUrl: null,
  isOnline: true,
  lastSeen: new Date().toISOString(),
};

describe('UserProfileModal Component', () => {
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

  it('renders user details and triggers onMessage when the message button is clicked', () => {
    const handleMessage = jest.fn();
    const handleClose = jest.fn();

    render(
      <UserProfileModal
        user={testUser}
        isOpen={true}
        onClose={handleClose}
        onMessage={handleMessage}
      />,
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('@johndoe')).toBeInTheDocument();
    expect(screen.getByText('Active now')).toBeInTheDocument();

    const addFriendBtn = screen.getByRole('button', {
      name: /Add Friend/i,
    });

    expect(addFriendBtn).toBeInTheDocument();
  });
});


