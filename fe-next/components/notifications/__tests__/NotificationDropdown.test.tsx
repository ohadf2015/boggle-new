/**
 * NotificationDropdown Tests
 * Locks current open/close/list/action behavior before migrating the
 * hand-rolled click-outside+escape logic onto shadcn Popover.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationDropdown } from '../NotificationDropdown';
import type { NotificationData } from '../types';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

function makeNotification(overrides: Partial<NotificationData> = {}): NotificationData {
  return {
    id: 'n1',
    title: 'Title',
    body: 'Body',
    notification_type: 'system',
    image_url: null,
    action_url: null,
    related_entity_type: null,
    related_entity_id: null,
    read: false,
    read_at: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function baseProps(overrides: Partial<React.ComponentProps<typeof NotificationDropdown>> = {}) {
  return {
    isOpen: true,
    onClose: vi.fn(),
    notifications: [makeNotification()],
    unreadCount: 1,
    onMarkAsRead: vi.fn(),
    onMarkAllAsRead: vi.fn(),
    onNotificationClick: vi.fn(),
    onDismiss: vi.fn(),
    onClearAll: vi.fn(async () => {}),
    onFetchPrevious: vi.fn(async () => []),
    previousNotifications: [],
    isLoadingPrevious: false,
    ...overrides,
  };
}

describe('NotificationDropdown', () => {
  it('renders nothing when closed', () => {
    render(<NotificationDropdown {...baseProps({ isOpen: false })} />);
    expect(screen.queryByText('Title')).not.toBeInTheDocument();
  });

  it('renders notifications list when open', () => {
    render(<NotificationDropdown {...baseProps()} />);
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
  });

  it('shows empty state with no notifications', () => {
    render(<NotificationDropdown {...baseProps({ notifications: [], unreadCount: 0 })} />);
    expect(screen.getByText('notifications.empty')).toBeInTheDocument();
  });

  it('calls onClose on outside click', () => {
    const onClose = vi.fn();
    render(<NotificationDropdown {...baseProps({ onClose })} />);
    fireEvent.mouseDown(document.body);
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose on Escape', () => {
    const onClose = vi.fn();
    render(<NotificationDropdown {...baseProps({ onClose })} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('marks as read and fires click on notification click when unread', () => {
    const onMarkAsRead = vi.fn();
    const onNotificationClick = vi.fn();
    render(<NotificationDropdown {...baseProps({ onMarkAsRead, onNotificationClick })} />);
    fireEvent.click(screen.getByText('Title'));
    expect(onMarkAsRead).toHaveBeenCalledWith('n1');
    expect(onNotificationClick).toHaveBeenCalled();
  });

  it('calls onMarkAllAsRead from header action', () => {
    const onMarkAllAsRead = vi.fn();
    render(<NotificationDropdown {...baseProps({ onMarkAllAsRead })} />);
    fireEvent.click(screen.getByText('notifications.markAllRead'));
    expect(onMarkAllAsRead).toHaveBeenCalled();
  });

  it('calls onClearAll from header action', () => {
    const onClearAll = vi.fn(async () => {});
    render(<NotificationDropdown {...baseProps({ onClearAll })} />);
    fireEvent.click(screen.getByText('Clear'));
    expect(onClearAll).toHaveBeenCalled();
  });

  it('fetches previous notifications on toggle', () => {
    const onFetchPrevious = vi.fn(async () => []);
    render(<NotificationDropdown {...baseProps({ onFetchPrevious })} />);
    fireEvent.click(screen.getByText('Previous notifications'));
    expect(onFetchPrevious).toHaveBeenCalled();
  });
});
