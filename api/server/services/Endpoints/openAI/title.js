const { CacheKeys } = require('librechat-data-provider');
const getLogStores = require('~/cache/getLogStores');
const { isEnabled } = require('~/server/utils');
const { saveConvo } = require('~/models');


const addTitle = async (req, { text, response, client }) => {
  const { TITLE_CONVO = 'true' } = process.env ?? {};
  if (!isEnabled(TITLE_CONVO)) {
    return;
  }

  if (client.options.titleConvo === false) {
    return;
  }

  const titleCache = getLogStores(CacheKeys.GEN_TITLE);
  const key = `${req.user.id}-${response.conversationId}`;

  // Get full conversation history for better title generation
  const { getMessages } = require('~/models');
  const messages = await getMessages({ conversationId: response.conversationId });
  

  const title = await client.titleConvo({
    text,
    responseText: response?.text ?? '',
    conversationId: response.conversationId,
    messages, // Pass full conversation history
  });
  await titleCache.set(key, title, 120000);
  await saveConvo(
    req,
    {
      conversationId: response.conversationId,
      title,
    },
    { context: 'api/server/services/Endpoints/openAI/addTitle.js' },
  );
};

module.exports = addTitle;
