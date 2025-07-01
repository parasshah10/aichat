const { CacheKeys } = require('librechat-data-provider');
const getLogStores = require('~/cache/getLogStores');
const { isEnabled } = require('~/server/utils');
const { saveConvo } = require('~/models');
const { logger } = require('~/config');

/**
 * Add title to conversation in a way that avoids memory retention
 */
const addTitle = async (req, { text, response, client }) => {
  const { TITLE_CONVO = true } = process.env ?? {};
  if (!isEnabled(TITLE_CONVO)) {
    return;
  }

  if (client.options.titleConvo === false) {
    return;
  }

  const titleCache = getLogStores(CacheKeys.GEN_TITLE);
  const key = `${req.user.id}-${response.conversationId}`;
  /** @type {NodeJS.Timeout} */
  let timeoutId;
  try {
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('Title generation timeout')), 45000);
    }).catch((error) => {
      logger.error('Title error:', error);
    });

    // Get full conversation history for better title generation - CURRENT BRANCH ONLY
    const { getMessages } = require('~/models');
    
    // First get all messages to find the current branch
    const allMessages = await getMessages({ conversationId: response.conversationId });
    
    // Build current conversation path by following parentMessageId chain
    const messageMap = new Map();
    allMessages.forEach(msg => messageMap.set(msg.messageId, msg));
    
    // Start from the latest message (the response we just generated)
    const currentPath = [];
    let currentMessageId = response.messageId;
    
    // Follow the chain backwards to build the current conversation path
    while (currentMessageId && messageMap.has(currentMessageId)) {
      const message = messageMap.get(currentMessageId);
      currentPath.unshift(message); // Add to beginning to maintain chronological order
      currentMessageId = message.parentMessageId;
    }
    
    const messages = currentPath;

    let titlePromise;
    let abortController = new AbortController();
    if (client && typeof client.titleConvo === 'function') {
      titlePromise = Promise.race([
        client
          .titleConvo({
            text,
            abortController,
            messages, // Pass full conversation history
          })
          .catch((error) => {
            logger.error('Client title error:', error);
          }),
        timeoutPromise,
      ]);
    } else {
      return;
    }

    const title = await titlePromise;
    if (!abortController.signal.aborted) {
      abortController.abort();
    }
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    await titleCache.set(key, title, 120000);
    await saveConvo(
      req,
      {
        conversationId: response.conversationId,
        title,
      },
      { context: 'api/server/services/Endpoints/agents/title.js' },
    );
  } catch (error) {
    logger.error('Error generating title:', error);
  }
};

module.exports = addTitle;
