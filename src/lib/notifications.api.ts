import { api } from './api';

export interface Notification {
  id: string;
  type: string;
  referenceId: string | null;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
}

export const getNotifications = async (): Promise<Notification[]> => {
  const { data } = await api.get('/notifications');
  if (Array.isArray(data)) {
    return data;
  }
  if (data && Array.isArray(data.items)) {
    return data.items;
  }
  return [];
};

export const markAsRead = async (id: string): Promise<Notification> => {
  const { data } = await api.patch(`/notifications/${id}/read`);
  return data;
};

export const markAllAsRead = async (): Promise<{ count?: number; success?: boolean }> => {
  const { data } = await api.patch('/notifications/read-all');
  return data;
};
