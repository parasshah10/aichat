import { v4 } from 'uuid';
import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { dataService, QueryKeys } from 'librechat-data-provider';
import { useChatContext } from '~/Providers';
import { useAuthContext } from '~/hooks/AuthContext';
import type { TMessage } from 'librechat-data-provider';

export default function useAddMessagePair() {
  const { user } = useAuthContext();
  const { conversation, getMessages, setMessages } = useChatContext();
  const queryClient = useQueryClient();

  const createMessageMutation = useMutation({
    mutationFn: (message: TMessage) => dataService.createMessage(message),
    onSuccess: (savedMessage, variables) => {
      // Update the local cache with the saved message
      const conversationId = variables.conversationId;
      if (conversationId) {
        queryClient.setQueryData<TMessage[]>([QueryKeys.messages, conversationId], (prev) => {
          if (!prev) return [savedMessage];
          // Replace the temporary message with the saved one
          return prev.map(msg => 
            msg.messageId === variables.messageId ? savedMessage : msg
          );
        });
      }
    },
  });

  const addMessagePair = useCallback(
    async (userText: string) => {
      if (!userText.trim() || !conversation?.conversationId) {
        return;
      }

      const currentMessages = getMessages() || [];
      
      // Generate unique IDs for both messages
      const userMessageId = v4();
      const aiMessageId = v4();
      
      // Create user message (without timestamps - let the database handle them)
      const userMessage: TMessage = {
        messageId: userMessageId,
        conversationId: conversation.conversationId,
        parentMessageId: currentMessages.length > 0 ? currentMessages[currentMessages.length - 1].messageId : null,
        isCreatedByUser: true,
        sender: user?.name || 'User',
        text: userText,
        endpoint: conversation.endpoint || 'openAI',
        model: conversation.model || 'gpt-3.5-turbo',
        iconURL: user?.avatar || '',
      };

      // Create AI placeholder message with just the ID (without timestamps)
      const aiMessage: TMessage = {
        messageId: aiMessageId,
        conversationId: conversation.conversationId,
        parentMessageId: userMessageId,
        isCreatedByUser: false,
        sender: conversation.title || 'AI',
        text: aiMessageId, // Just the message ID as requested
        endpoint: conversation.endpoint || 'openAI',
        model: conversation.model || 'gpt-3.5-turbo',
        iconURL: '',
      };

      // Optimistically update UI
      const updatedMessages = [...currentMessages, userMessage, aiMessage];
      setMessages(updatedMessages);

      try {
        // Save both messages to database
        await createMessageMutation.mutateAsync(userMessage);
        await createMessageMutation.mutateAsync(aiMessage);
      } catch (error) {
        console.error('Failed to save message pair:', error);
        // Revert optimistic update on error
        setMessages(currentMessages);
      }
    },
    [conversation, getMessages, setMessages, user, createMessageMutation]
  );

  return { addMessagePair };
}