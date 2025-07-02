import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useRecoilCallback } from 'recoil';
import type { TMessage } from 'librechat-data-provider';
import { Constants } from 'librechat-data-provider';
import { useChatContext } from '~/Providers';
import store from '~/store';

const debounceRate = 150;

/**
 * Build a message tree following the currently selected siblings to get the current viewing branch
 * This is similar to useBuildMessageTree but specifically for navigation purposes
 */
async function buildCurrentViewingBranch(
  allMessages: TMessage[], 
  getSiblingIdx: (messageId: string | null | undefined) => Promise<number>
): Promise<TMessage[]> {
  if (!allMessages || allMessages.length === 0) {
    return [];
  }

  // Group messages by parent
  const messagesByParent = new Map<string, TMessage[]>();
  const rootMessages: TMessage[] = [];

  for (const message of allMessages) {
    const parentId = message.parentMessageId === Constants.NO_PARENT ? 'ROOT' : message.parentMessageId;
    if (parentId === 'ROOT') {
      rootMessages.push(message);
    } else {
      if (!messagesByParent.has(parentId)) {
        messagesByParent.set(parentId, []);
      }
      messagesByParent.get(parentId)!.push(message);
    }
  }

  // Sort siblings by creation time
  for (const siblings of messagesByParent.values()) {
    siblings.sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeA - timeB;
    });
  }
  
  rootMessages.sort((a, b) => {
    const timeA = new Date(a.createdAt || 0).getTime();
    const timeB = new Date(b.createdAt || 0).getTime();
    return timeA - timeB;
  });

  // Build the current branch by following selected siblings
  const currentBranch: TMessage[] = [];
  
  // Start with root message (should be only one in most cases)
  if (rootMessages.length === 0) {
    return [];
  }
  
  let currentMessage = rootMessages[0]; // Assume single root for now
  currentBranch.push(currentMessage);

  // Follow the chain using sibling indices
  while (true) {
    const children = messagesByParent.get(currentMessage.messageId);
    if (!children || children.length === 0) {
      break;
    }

    // Get the currently selected sibling
    let selectedChild: TMessage;
    if (children.length === 1) {
      selectedChild = children[0];
    } else {
      // Multiple siblings - use siblingIdx to determine which one is selected
      const siblingIdx = await getSiblingIdx(currentMessage.messageId);
      const selectedIndex = Math.max(0, Math.min(siblingIdx, children.length - 1));
      selectedChild = children[children.length - selectedIndex - 1]; // Reverse index as per MultiMessage logic
    }

    currentBranch.push(selectedChild);
    currentMessage = selectedChild;
  }

  // Debug logging
  console.log('[useMessageNavigation] Current viewing branch:', {
    totalMessages: allMessages.length,
    branchMessages: currentBranch.length,
    messageIds: currentBranch.map(m => m.messageId),
    messageContents: currentBranch.map(m => ({ 
      id: m.messageId, 
      content: m.text?.substring(0, 50) + '...',
      sender: m.sender,
      parentId: m.parentMessageId
    }))
  });

  return currentBranch;
}

export default function useMessageNavigation(
  messagesTree?: TMessage[] | null,
  isAtBottom?: boolean
) {
  const { getMessages } = useChatContext();
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [showNavigation, setShowNavigation] = useState(false);
  const [allMessages, setAllMessages] = useState<TMessage[]>([]);
  const timeoutIdRef = useRef<NodeJS.Timeout>();
  const highlightTimeoutRef = useRef<NodeJS.Timeout>();

  // Get sibling index for a message
  const getSiblingIdx = useRecoilCallback(
    ({ snapshot }) =>
      async (messageId: string | null | undefined) =>
        await snapshot.getPromise(store.messagesSiblingIdxFamily(messageId)),
    [],
  );

  // Build the current viewing branch
  useEffect(() => {
    const buildBranch = async () => {
      const messages = getMessages();
      if (!messages || messages.length === 0) {
        setAllMessages([]);
        return;
      }
      
      try {
        const branchMessages = await buildCurrentViewingBranch(messages, getSiblingIdx);
        
        console.log('[useMessageNavigation] All messages vs current viewing branch:', {
          allCount: messages.length,
          branchCount: branchMessages.length
        });
        
        setAllMessages(branchMessages);
      } catch (error) {
        console.error('[useMessageNavigation] Error building current viewing branch:', error);
        // Fallback to all messages sorted by time
        const sortedMessages = [...messages].sort((a, b) => {
          const timeA = new Date(a.createdAt || 0).getTime();
          const timeB = new Date(b.createdAt || 0).getTime();
          return timeA - timeB;
        });
        setAllMessages(sortedMessages);
      }
    };

    buildBranch();
  }, [getMessages, getSiblingIdx]);

  // Expose a way to trigger rebuild when sibling indices change
  const triggerRebuild = useCallback(() => {
    // Force rebuild by calling the effect again
    const buildBranch = async () => {
      const messages = getMessages();
      if (!messages || messages.length === 0) {
        setAllMessages([]);
        return;
      }
      
      try {
        const branchMessages = await buildCurrentViewingBranch(messages, getSiblingIdx);
        setAllMessages(branchMessages);
      } catch (error) {
        console.error('[useMessageNavigation] Error rebuilding current viewing branch:', error);
      }
    };
    buildBranch();
  }, [getMessages, getSiblingIdx]);

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

  // Scroll to message and highlight it temporarily
  const scrollToMessage = useCallback((messageId: string) => {
    const messageElement = document.getElementById(messageId);
    console.log('[useMessageNavigation] Scrolling to message:', {
      messageId,
      elementFound: !!messageElement,
      elementId: messageElement?.id,
      elementClass: messageElement?.className
    });
    if (messageElement) {
      // Clear any existing highlight timeout
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
      
      // Remove highlight from any previously highlighted message
      const previouslyHighlighted = document.querySelector('.message-navigation-highlight');
      if (previouslyHighlighted) {
        previouslyHighlighted.classList.remove('message-navigation-highlight');
      }
      
      messageElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start',
        inline: 'nearest'
      });
      
      // Add highlight class immediately
      messageElement.classList.add('message-navigation-highlight');
      console.log('[useMessageNavigation] Added highlight to message:', messageId);
      
      // Remove highlight after 1 second
      highlightTimeoutRef.current = setTimeout(() => {
        messageElement.classList.remove('message-navigation-highlight');
        console.log('[useMessageNavigation] Removed highlight from message:', messageId);
      }, 1000);
    } else {
      console.warn('[useMessageNavigation] Message element not found in DOM:', messageId);
      // Log all message elements in DOM for debugging
      const allMessageElements = document.querySelectorAll('[id^="message-"]');
      console.log('[useMessageNavigation] Available message elements in DOM:', 
        Array.from(allMessageElements).map(el => el.id)
      );
    }
  }, []);

  // Navigation handlers
  const handlePrevious = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    console.log('[useMessageNavigation] Previous button clicked:', {
      canGoPrevious,
      currentMessageIndex,
      totalMessages: allMessages.length,
      currentMessage: allMessages[currentMessageIndex]?.messageId
    });
    if (canGoPrevious) {
      const newIndex = currentMessageIndex - 1;
      setCurrentMessageIndex(newIndex);
      const targetMessage = allMessages[newIndex];
      console.log('[useMessageNavigation] Navigating to previous message:', {
        newIndex,
        targetMessageId: targetMessage?.messageId,
        targetMessageContent: targetMessage?.text?.substring(0, 50) + '...'
      });
      if (targetMessage?.messageId) {
        scrollToMessage(targetMessage.messageId);
      }
    }
  }, [canGoPrevious, currentMessageIndex, allMessages, scrollToMessage]);

  const handleNext = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    console.log('[useMessageNavigation] Next button clicked:', {
      canGoNext,
      currentMessageIndex,
      totalMessages: allMessages.length,
      isAtBottom,
      currentMessage: allMessages[currentMessageIndex]?.messageId
    });
    if (currentMessageIndex < allMessages.length - 1) {
      // Navigate to next message
      const newIndex = currentMessageIndex + 1;
      setCurrentMessageIndex(newIndex);
      const targetMessage = allMessages[newIndex];
      console.log('[useMessageNavigation] Navigating to next message:', {
        newIndex,
        targetMessageId: targetMessage?.messageId,
        targetMessageContent: targetMessage?.text?.substring(0, 50) + '...'
      });
      if (targetMessage?.messageId) {
        scrollToMessage(targetMessage.messageId);
      }
    } else if (currentMessageIndex === allMessages.length - 1 && isAtBottom === false) {
      // Scroll to bottom of current (last) message
      console.log('[useMessageNavigation] Scrolling to messages end');
      const messagesEnd = document.getElementById('messages-end');
      if (messagesEnd) {
        messagesEnd.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'end',
          inline: 'nearest'
        });
      }
    }
  }, [canGoNext, currentMessageIndex, allMessages, scrollToMessage, isAtBottom]);

  // Reset current index when messages change
  useEffect(() => {
    if (allMessages.length === 0) {
      setCurrentMessageIndex(0);
    } else if (currentMessageIndex >= allMessages.length) {
      setCurrentMessageIndex(allMessages.length - 1);
    }
  }, [allMessages.length, currentMessageIndex]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  return {
    showNavigation,
    canGoPrevious,
    canGoNext,
    handlePrevious,
    handleNext,
    currentMessageIndex,
    totalMessages: allMessages.length,
    triggerRebuild,
  };
}