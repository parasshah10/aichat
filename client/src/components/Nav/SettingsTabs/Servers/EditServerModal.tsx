import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useLocalize } from '~/hooks';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui';
import { ServerForm } from './ServerForm';
import { useUpdateMCPServer } from '~/data-provider';
import type { IMCPServer, UpdateMCPServerParams } from 'librechat-data-provider';

interface EditServerModalProps {
  isOpen: boolean;
  server: IMCPServer;
  onClose: () => void;
  onServerUpdated: () => void;
}

export function EditServerModal({ isOpen, server, onClose, onServerUpdated }: EditServerModalProps) {
  const localize = useLocalize();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateMutation = useUpdateMCPServer();

  const handleSubmit = async (data: Omit<UpdateMCPServerParams, 'userId'>) => {
    setIsSubmitting(true);
    try {
      await updateMutation.mutateAsync({
        serverId: server._id,
        ...data
      });
      onServerUpdated();
    } catch (error) {
      console.error('Failed to update server:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            {localize('com_ui_edit_server')}: {server.name}
            <button
              onClick={onClose}
              className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          <ServerForm
            initialData={server}
            onSubmit={handleSubmit}
            onCancel={onClose}
            isSubmitting={isSubmitting}
            submitLabel={localize('com_ui_update')}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}