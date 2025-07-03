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

  // Find topmost and bottommost visible messages for navigation
  const findNavigationTargets = useCallback(() => {
    const visibleMessages: { index: number; messageId: string; rect: DOMRect }[] = [];
    
    allMessages.forEach((message, index) => {
      const element = document.getElementById(message.messageId);
      if (element) {
        const rect = element.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        
        // Check if message is at least partially visible
        const isVisible = rect.bottom > 0 && rect.top < viewportHeight;
        
        if (isVisible) {
          visibleMessages.push({ index, messageId: message.messageId, rect });
        }
      }
    });

    // Sort by position (top to bottom)
    visibleMessages.sort((a, b) => a.rect.top - b.rect.top);

    const topmost = visibleMessages[0];
    const bottommost = visibleMessages[visibleMessages.length - 1];
    
    // Check if bottommost is partially visible (cut off at bottom)
    const isBottommostPartial = bottommost && bottommost.rect.bottom > window.innerHeight;
    
    // Check if bottommost message is too long to fit in viewport (taller than viewport)
    const isBottommostTooLong = bottommost && bottommost.rect.height > window.innerHeight;

    console.log('[useMessageNavigation] Navigation targets:', {
      visibleCount: visibleMessages.length,
      topmost: topmost ? { index: topmost.index, id: topmost.messageId, rect: topmost.rect } : null,
      bottommost: bottommost ? { index: bottommost.index, id: bottommost.messageId, rect: bottommost.rect } : null,
      isBottommostPartial,
      isBottommostTooLong,
      allVisibleMessages: visibleMessages.map(m => ({ index: m.index, id: m.messageId, top: m.rect.top }))
    });

    return { topmost, bottommost, isBottommostPartial, isBottommostTooLong };
  }, [allMessages]);

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

  // Navigation capabilities - always available if there are messages
  const canGoPrevious = allMessages.length > 0;
  const canGoNext = allMessages.length > 0;


  // Navigation handlers
  const handlePrevious = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    
    const { topmost } = findNavigationTargets();
    
    if (topmost) {
      console.log('[useMessageNavigation] Up arrow clicked - scrolling topmost visible message to top:', {
        messageId: topmost.messageId,
        index: topmost.index
      });
      
      // Scroll the topmost visible message to the top of viewport
      const element = document.getElementById(topmost.messageId);
      if (element) {
        element.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        });
        
        // Highlight the message
        if (highlightTimeoutRef.current) {
          clearTimeout(highlightTimeoutRef.current);
        }
        
        const previouslyHighlighted = document.querySelector('.message-navigation-highlight');
        if (previouslyHighlighted) {
          previouslyHighlighted.classList.remove('message-navigation-highlight');
        }
        
        element.classList.add('message-navigation-highlight');
        
        highlightTimeoutRef.current = setTimeout(() => {
          element.classList.remove('message-navigation-highlight');
        }, 1000);
      }
    } else {
      console.log('[useMessageNavigation] No visible messages found for up navigation');
    }
  }, [findNavigationTargets]);

  const handleNext = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();

      const { bottommost } = findNavigationTargets();

      if (bottommost) {
        // If we are at the last message and it's already aligned to the bottom,
        // scroll to the absolute end of the page to reveal things below the message list.
        const isAtLastMessage = bottommost.index === allMessages.length - 1;
        const isScrolledToBottom = Math.abs(bottommost.rect.bottom - window.innerHeight) < 5;

        if (isAtLastMessage && isScrolledToBottom) {
          console.log('[useMessageNavigation] At end of last message, scrolling to page bottom');
          const messagesEnd = document.getElementById('messages-end');
          if (messagesEnd) {
            messagesEnd.scrollIntoView({
              behavior: 'smooth',
              block: 'end',
              inline: 'nearest',
            });
          }
          return;
        }

        console.log(
          '[useMessageNavigation] Down arrow clicked - scrolling bottommost visible message to end:',
          {
            messageId: bottommost.messageId,
            index: bottommost.index,
          },
        );

        const element = document.getElementById(bottommost.messageId);
        if (element) {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'end',
            inline: 'nearest',
          });

          // Highlight the message
          if (highlightTimeoutRef.current) {
            clearTimeout(highlightTimeoutRef.current);
          }

          const previouslyHighlighted = document.querySelector('.message-navigation-highlight');
          if (previouslyHighlighted) {
            previouslyHighlighted.classList.remove('message-navigation-highlight');
          }

          element.classList.add('message-navigation-highlight');

          highlightTimeoutRef.current = setTimeout(() => {
            element.classList.remove('message-navigation-highlight');
          }, 1000);
        }
      } else {
        // No visible messages, scroll to bottom
        console.log('[useMessageNavigation] No visible messages - scrolling to bottom');
        const messagesEnd = document.getElementById('messages-end');
        if (messagesEnd) {
          messagesEnd.scrollIntoView({
            behavior: 'smooth',
            block: 'end',
            inline: 'nearest',
          });
        }
      }
    },
    [findNavigationTargets, allMessages],
  );

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