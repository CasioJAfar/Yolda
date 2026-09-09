import React from 'react';
import { User } from '../types';
import { AdminFullPanel } from './admin/AdminFullPanel';

interface AdminPanelViewProps {
  currentUser: User;
  onExitAdmin?: () => void;
  onRefreshAll?: () => void;
}

export const AdminPanelView: React.FC<AdminPanelViewProps> = ({
  currentUser,
  onExitAdmin = () => {},
  onRefreshAll = () => {},
}) => {
  return (
    <AdminFullPanel
      currentUser={currentUser}
      onExitAdmin={onExitAdmin}
      onRefreshAll={onRefreshAll}
    />
  );
};
