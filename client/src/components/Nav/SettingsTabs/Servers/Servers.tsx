import React, { useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { useLocalize } from '~/hooks';
import { Button } from '~/components/ui';
import { ServerList } from './ServerList';
import { AddServerModal } from './AddServerModal';
import { EditServerModal } from './EditServerModal';
import { useGetMCPServers, useGetMCPServerStats } from '~/data-provider';
import type { IMCPServer } from 'librechat-data-provider';

export default function Servers() {
  const localize = useLocalize();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<IMCPServer | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: servers = [], isLoading, refetch } = useGetMCPServers();
  const { data: stats } = useGetMCPServerStats();

  const handleRefresh = () => {
    refetch();
    setRefreshKey(prev => prev + 1);
  };

  const handleServerAdded = () => {
    setIsAddModalOpen(false);
    refetch();
  };

  const handleServerUpdated = () => {
    setEditingServer(null);
    refetch();
  };

  const handleEditServer = (server: IMCPServer) => {
    setEditingServer(server);
  };

  return (
    <div className="flex h-auto max-h-[75vh] w-full flex-col overflow-hidden px-4 pb-4">
      {/* Header */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-text-primary">
              {localize('com_nav_setting_servers')}
            </h3>
            <p className="text-sm text-text-secondary">
              {localize('com_nav_setting_servers_description')}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
              {localize('com_ui_refresh')}
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2"
            >
              <Plus size={16} />
              {localize('com_ui_add_server')}
            </Button>
          </div>
        </div>

        {/* Stats Summary */}
        {stats && (
          <div className="flex gap-4 rounded-lg bg-surface-secondary p-3 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-500"></div>
              <span className="text-text-secondary">
                {localize('com_ui_total')}: {stats.total}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <span className="text-text-secondary">
                {localize('com_ui_online')}: {stats.online}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
              <span className="text-text-secondary">
                {localize('com_ui_offline')}: {stats.offline}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-red-500"></div>
              <span className="text-text-secondary">
                {localize('com_ui_error')}: {stats.error}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-purple-500"></div>
              <span className="text-text-secondary">
                {localize('com_ui_tools')}: {stats.totalTools}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Server List */}
      <div className="flex-1 overflow-hidden">
        <ServerList
          servers={servers}
          isLoading={isLoading}
          onEditServer={handleEditServer}
          onRefresh={handleRefresh}
          refreshKey={refreshKey}
        />
      </div>

      {/* Modals */}
      <AddServerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onServerAdded={handleServerAdded}
      />

      {editingServer && (
        <EditServerModal
          isOpen={!!editingServer}
          server={editingServer}
          onClose={() => setEditingServer(null)}
          onServerUpdated={handleServerUpdated}
        />
      )}
    </div>
  );
}