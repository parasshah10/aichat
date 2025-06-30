import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  QueryKeys,
  ContentTypes,
  ToolCallTypes,
  imageGenTools,
  isImageVisionTool,
} from 'librechat-data-provider';
import type {
  TMessage,
  TPreset,
  TConversation,
  TMessageContentParts,
} from 'librechat-data-provider';
import useBuildMessageTree from '~/hooks/Messages/useBuildMessageTree';
import { cleanupPreset, buildTree } from '~/utils';
import { useParams } from 'react-router-dom';

export default function useCopyConversation({
  conversation,
  type,
  includeOptions,
  exportBranches,
  recursive,
}: {
  conversation: TConversation | null;
  type: string;
  includeOptions: boolean | 'indeterminate';
  exportBranches: boolean | 'indeterminate';
  recursive: boolean | 'indeterminate';
}) {
  const queryClient = useQueryClient();
  const buildMessageTree = useBuildMessageTree();

  const { conversationId: paramId } = useParams();

  const getMessageTree = useCallback(() => {
    const queryParam = paramId === 'new' ? paramId : conversation?.conversationId ?? paramId ?? '';
    const messages = queryClient.getQueryData<TMessage[]>([QueryKeys.messages, queryParam]) ?? [];
    const dataTree = buildTree({ messages });
    return dataTree?.length === 0 ? null : dataTree ?? null;
  }, [paramId, conversation?.conversationId, queryClient]);

  const getMessageText = (message: TMessage | undefined, format = 'text') => {
    if (!message) {
      return '';
    }

    const formatText = (sender: string, text: string) => {
      if (format === 'text') {
        return `>> ${sender}:\n${text}`;
      }
      return `**${sender}**\n${text}`;
    };

    if (!message.content) {
      return formatText(message.sender || '', message.text);
    }

    return message.content
      .map((content) => getMessageContent(message.sender || '', content))
      .map((text) => {
        return formatText(text[0], text[1]);
      })
      .join('\n\n\n');
  };

  /**
   * Format and return message texts according to the type of content.
   * Currently, content whose type is `TOOL_CALL` basically returns JSON as is.
   * In the future, different formatted text may be returned for each type.
   */
  const getMessageContent = (sender: string, content?: TMessageContentParts): string[] => {
    if (!content) {
      return [];
    }

    if (content.type === ContentTypes.ERROR) {
      // ERROR
      return [sender, content[ContentTypes.TEXT].value];
    }

    if (content.type === ContentTypes.TEXT) {
      // TEXT
      const textPart = content[ContentTypes.TEXT];
      const text = typeof textPart === 'string' ? textPart : textPart.value;
      return [sender, text];
    }

    if (content.type === ContentTypes.TOOL_CALL) {
      const type = content[ContentTypes.TOOL_CALL].type;

      if (type === ToolCallTypes.CODE_INTERPRETER) {
        // CODE_INTERPRETER
        const toolCall = content[ContentTypes.TOOL_CALL];
        const code_interpreter = toolCall[ToolCallTypes.CODE_INTERPRETER];
        return ['Code Interpreter', JSON.stringify(code_interpreter)];
      }

      if (type === ToolCallTypes.RETRIEVAL) {
        // RETRIEVAL
        const toolCall = content[ContentTypes.TOOL_CALL];
        return ['Retrieval', JSON.stringify(toolCall)];
      }

      if (
        type === ToolCallTypes.FUNCTION &&
        imageGenTools.has(content[ContentTypes.TOOL_CALL].function.name)
      ) {
        // IMAGE_GENERATION
        const toolCall = content[ContentTypes.TOOL_CALL];
        return ['Tool', JSON.stringify(toolCall)];
      }

      if (type === ToolCallTypes.FUNCTION) {
        // IMAGE_VISION
        const toolCall = content[ContentTypes.TOOL_CALL];
        if (isImageVisionTool(toolCall)) {
          return ['Tool', JSON.stringify(toolCall)];
        }
        return ['Tool', JSON.stringify(toolCall)];
      }
    }

    if (content.type === ContentTypes.IMAGE_FILE) {
      // IMAGE
      const imageFile = content[ContentTypes.IMAGE_FILE];
      return ['Image', JSON.stringify(imageFile)];
    }

    return [sender, JSON.stringify(content)];
  };

  const copyText = async () => {
    let data =
      'Conversation\n' +
      '########################\n' +
      `conversationId: ${conversation?.conversationId}\n` +
      `endpoint: ${conversation?.endpoint}\n` +
      `title: ${conversation?.title}\n` +
      `exportAt: ${new Date().toTimeString()}\n`;

    if (includeOptions === true) {
      data += '\nOptions\n########################\n';
      const options = cleanupPreset({ preset: conversation as TPreset });

      for (const key of Object.keys(options)) {
        data += `${key}: ${options[key]}\n`;
      }
    }

    const messages = await buildMessageTree({
      messageId: conversation?.conversationId,
      message: null,
      messages: getMessageTree(),
      branches: false,
      recursive: false,
    });

    data += '\nHistory\n########################\n';
    if (Array.isArray(messages)) {
      for (const message of messages) {
        data += `${getMessageText(message)}\n`;
        if (message.error) {
          data += '(This is an error message)\n';
        }
        if (message.unfinished === true) {
          data += '(This is an unfinished message)\n';
        }
        data += '\n\n';
      }
    } else {
      data += `${getMessageText(messages)}\n`;
      if (messages.error) {
        data += '(This is an error message)\n';
      }
      if (messages.unfinished === true) {
        data += '(This is an unfinished message)\n';
      }
    }

    return data;
  };

  const copyMarkdown = async () => {
    let chatText = '';

    // Add system message if it exists (from conversation preset/instructions)
    if (includeOptions === true && conversation) {
      // Check multiple possible locations for system prompt
      const systemContent = 
        conversation.system || 
        conversation.instructions || 
        conversation.promptPrefix;
      
      if (systemContent) {
        chatText += `<system_message>\n${systemContent}\n</system_message>\n\n`;
      }
    }

    const messages = await buildMessageTree({
      messageId: conversation?.conversationId,
      message: null,
      messages: getMessageTree(),
      branches: false,
      recursive: false,
    });

    // Convert to flat array if needed
    const messageArray = Array.isArray(messages) ? messages : [messages];
    
    // Find the most recent user message
    let latestUserMessageIndex = -1;
    for (let i = messageArray.length - 1; i >= 0; i--) {
      if (messageArray[i].isCreatedByUser) {
        latestUserMessageIndex = i;
        break;
      }
    }

    // Store the latest user message
    const latestUserMessage = latestUserMessageIndex >= 0 ? messageArray[latestUserMessageIndex] : null;

    // Find the most recent assistant message (to be removed)
    let latestAssistantMessageIndex = -1;
    for (let i = messageArray.length - 1; i >= 0; i--) {
      if (!messageArray[i].isCreatedByUser) {
        latestAssistantMessageIndex = i;
        break;
      }
    }

    // Create filtered list without the latest assistant and latest user messages
    const filteredMessages = messageArray.filter((message, index) => {
      return index !== latestAssistantMessageIndex && index !== latestUserMessageIndex;
    });

    // Only create conversation history section if there are at least 2 messages left
    if (filteredMessages.length >= 2) {
      chatText += '<conversation_history>\n';
      
      // Format the filtered messages
      for (const message of filteredMessages) {
        const role = message.isCreatedByUser ? 'USER' : 'ASSISTANT';
        const content = getMessageTextContent(message);
        chatText += `### ${role}\n${content}\n\n`;
      }
      
      chatText += '</conversation_history>\n\n';
    }

    // Add the latest user message at the end (outside of conversation history)
    if (latestUserMessage) {
      const content = getMessageTextContent(latestUserMessage);
      chatText += content;
    }

    return chatText.trim();
  };

  // Helper function to extract just the text content from a message
  const getMessageTextContent = (message: TMessage) => {
    if (!message.content) {
      return message.text || '';
    }

    return message.content
      .map((content) => {
        if (content.type === ContentTypes.TEXT) {
          const textPart = content[ContentTypes.TEXT];
          return typeof textPart === 'string' ? textPart : textPart.value;
        }
        // For non-text content, you might want to include a description or skip
        return '';
      })
      .filter(text => text.length > 0)
      .join('\n');
  };

  const copyJSON = async () => {
    const data = {
      conversationId: conversation?.conversationId,
      endpoint: conversation?.endpoint,
      title: conversation?.title,
      exportAt: new Date().toTimeString(),
      branches: exportBranches,
      recursive: recursive,
    };

    if (includeOptions === true) {
      data['options'] = cleanupPreset({ preset: conversation as TPreset });
    }

    const messages = await buildMessageTree({
      messageId: conversation?.conversationId,
      message: null,
      messages: getMessageTree(),
      branches: Boolean(exportBranches),
      recursive: Boolean(recursive),
    });

    if (recursive === true && !Array.isArray(messages)) {
      data['messagesTree'] = messages.children;
    } else {
      data['messages'] = messages;
    }

    return JSON.stringify(data, null, 2);
  };

  const copyCSV = async () => {
    const data: TMessage[] = [];

    const messages = await buildMessageTree({
      messageId: conversation?.conversationId,
      message: null,
      messages: getMessageTree(),
      branches: Boolean(exportBranches),
      recursive: false,
    });

    if (Array.isArray(messages)) {
      for (const message of messages) {
        data.push(message);
      }
    } else {
      data.push(messages);
    }

    // Convert to CSV format manually
    const headers = ['sender', 'text', 'isCreatedByUser', 'error', 'unfinished', 'messageId', 'parentMessageId', 'createdAt'];
    let csvContent = headers.join(',') + '\n';
    
    data.forEach(message => {
      const row = [
        `"${(message.sender || '').replace(/"/g, '""')}"`,
        `"${(message.text || '').replace(/"/g, '""')}"`,
        message.isCreatedByUser || false,
        message.error || false,
        message.unfinished || false,
        `"${(message.messageId || '').replace(/"/g, '""')}"`,
        `"${(message.parentMessageId || '').replace(/"/g, '""')}"`,
        `"${(message.createdAt || '').replace(/"/g, '""')}"`,
      ];
      csvContent += row.join(',') + '\n';
    });

    return csvContent;
  };

  const copyConversation = async () => {
    try {
      let content = '';
      
      if (type === 'json') {
        content = await copyJSON();
      } else if (type === 'text') {
        content = await copyText();
      } else if (type === 'markdown') {
        content = await copyMarkdown();
      } else if (type === 'csv') {
        content = await copyCSV();
      } else if (type === 'screenshot') {
        // Screenshots are handled in the component since they need image data
        throw new Error('Screenshots should be handled by the component, not this hook');
      }

      await navigator.clipboard.writeText(content);
      return true;
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      throw error;
    }
  };

  return { copyConversation };
}