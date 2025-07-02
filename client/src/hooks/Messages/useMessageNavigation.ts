import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type { TMessage } from 'librechat-data-provider';
import { useChatContext } from '~/Providers';

const debounceRate = 150;

export default function useMessageNavigation(
  messagesTree?: TMessage[] | null,
  isAtBottom?: boolean
) {
  const { getMessages } = useChatContext();
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [showNavigation, setShowNavigation] = useState(false);
  const timeoutIdRef = useRef<NodeJS.Timeout>();

  // Get all messages in chronological order
  const allMessages = useMemo(() => {
    const messages = getMessages();
    if (!messages || messages.length === 0) {
      return [];
    }
    
    // Sort messages by creation time to get chronological order
    return [...messages].sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeA - timeB;
    });
  }, [getMessages]);

  const debouncedSetShowNavigation = useCallback((value: boolean) => {
    clearTimeout(timeoutIdRef.current);
    timeoutIdRef.current = setTimeout(() => {
      setShowNavigation(value);
    }, debounceRate);
  }, []);

  // Show navigation if there are more than 1 message
  useEffect(() => {
    const shouldShow = allMessages.length > 1;
    debouncedSetShowNavigation(shouldShow);
  }, [allMessages.length, debouncedSetShowNavigation]);

  // Navigation capabilities
  const canGoPrevious = currentMessageIndex > 0;
  // canGoNext should be true unless we're at the last message AND at the bottom of the scroll
  const canGoNext = currentMessageIndex < allMessages.length - 1 || (currentMessageIndex === allMessages.length - 1 && isAtBottom === false);

  // Scroll to message function
  const scrollToMessage = useCallback((messageId: string) => {
    const messageElement = document.getElementById(messageId);
    if (messageElement) {
      messageElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start',
        inline: 'nearest'
      });
    }
  }, []);

  // Navigation handlers
  const handlePrevious = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (canGoPrevious) {
      const newIndex = currentMessageIndex - 1;
      setCurrentMessageIndex(newIndex);
      const targetMessage = allMessages[newIndex];
      if (targetMessage?.messageId) {
        scrollToMessage(targetMessage.messageId);
      }
    }
  }, [canGoPrevious, currentMessageIndex, allMessages, scrollToMessage]);

  const handleNext = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (currentMessageIndex < allMessages.length - 1) {
      // Navigate to next message
      const newIndex = currentMessageIndex + 1;
      setCurrentMessageIndex(newIndex);
      const targetMessage = allMessages[newIndex];
      if (targetMessage?.messageId) {
        scrollToMessage(targetMessage.messageId);
      }
    } else if (currentMessageIndex === allMessages.length - 1 && isAtBottom === false) {
      // Scroll to bottom of current (last) message
      const messagesEnd = document.getElementById('messages-end');
      if (messagesEnd) {
        messagesEnd.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'end',
          inline: 'nearest'
        });
      }
    }
  }, [currentMessageIndex, allMessages, scrollToMessage, isAtBottom]);

  // Reset current index when messages change
  useEffect(() => {
    if (allMessages.length === 0) {
      setCurrentMessageIndex(0);
    } else if (currentMessageIndex >= allMessages.length) {
      setCurrentMessageIndex(allMessages.length - 1);
    }
  }, [allMessages.length, currentMessageIndex]);

  return {
    showNavigation,
    canGoPrevious,
    canGoNext,
    handlePrevious,
    handleNext,
    currentMessageIndex,
    totalMessages: allMessages.length,
  };
}