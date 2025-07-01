import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useLocalize } from '~/hooks';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui';
import { ServerForm } from './ServerForm';
import { useCreateMCPServer } from '~/data-provider';
import type { CreateMCPServerParams } from 'librechat-data-provider';

interface AddServerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onServerAdded: () => void;
}

export function AddServerModal({ isOpen, onClose, onServerAdded }: AddServerModalProps) {
  const localize = useLocalize();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createMutation = useCreateMCPServer();

  const handleSubmit = async (data: Omit<CreateMCPServerParams, 'userId'>) => {
    setIsSubmitting(true);
    try {
      await createMutation.mutateAsync(data);
      onServerAdded();
    } catch (error) {
      console.error('Failed to create server:', error);
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
            {localize('com_ui_add_server')}
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
            onSubmit={handleSubmit}
            onCancel={onClose}
            isSubmitting={isSubmitting}
            submitLabel={localize('com_ui_create')}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}