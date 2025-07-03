import { useRef, useEffect, useCallback, useMemo } from 'react';
import { useRecoilState } from 'recoil';
import { Constants, LocalStorageKeys, EModelEndpoint } from 'librechat-data-provider';
import type { TPlugin } from 'librechat-data-provider';
import { useAvailableToolsQuery } from '~/data-provider';
import useLocalStorage from '~/hooks/useLocalStorageAlt';
import { ephemeralAgentByConvoId } from '~/store';

const storageCondition = (value: unknown, rawCurrentValue?: string | null) => {
  if (rawCurrentValue) {
    try {
      const currentValue = rawCurrentValue?.trim() ?? '';
      if (currentValue.length > 2) {
        return true;
      }
    } catch (e) {
      console.error(e);
    }
  }
  return Array.isArray(value) && value.length > 0;
};

interface UseMCPSelectOptions {
  conversationId?: string | null;
}

export function useMCPSelect({ conversationId }: UseMCPSelectOptions) {
  const key = conversationId ?? Constants.NEW_CONVO;
  const hasSetFetched = useRef<string | null>(null);
  const [ephemeralAgent, setEphemeralAgent] = useRecoilState(ephemeralAgentByConvoId(key));
  const { data: mcpToolDetails, isFetched } = useAvailableToolsQuery(EModelEndpoint.agents, {
    select: (data: TPlugin[]) => {
      // Return ALL MCP tools, not just one per server
      return data.filter((tool) => {
        const isMCP = tool.pluginKey.includes(Constants.mcp_delimiter);
        return isMCP && tool.chatMenu !== false;
      });
    },
  });

  const mcpState = useMemo(() => {
    return ephemeralAgent?.mcp ?? [];
  }, [ephemeralAgent?.mcp]);

  const setSelectedValues = useCallback(
    (values: string[] | null | undefined) => {
      if (!values) {
        return;
      }
      if (!Array.isArray(values)) {
        return;
      }
      setEphemeralAgent((prev) => ({
        ...prev,
        mcp: values,
      }));
    },
    [setEphemeralAgent],
  );

  const [mcpValues, setMCPValues] = useLocalStorage<string[]>(
    `${LocalStorageKeys.LAST_MCP_}${key}`,
    mcpState,
    setSelectedValues,
    storageCondition,
  );

  const [isPinned, setIsPinned] = useLocalStorage<boolean>(
    `${LocalStorageKeys.PIN_MCP_}${key}`,
    true,
  );

  useEffect(() => {
    if (hasSetFetched.current === key) {
      return;
    }
    if (!isFetched) {
      return;
    }
    hasSetFetched.current = key;
    if ((mcpToolDetails?.length ?? 0) > 0) {
      setMCPValues(mcpValues.filter((mcp) => {
        return mcpToolDetails?.some((tool) => {
          const parts = tool.pluginKey.split(Constants.mcp_delimiter);
          const serverName = parts[parts.length - 1];
          return serverName === mcp;
        });
      }));
      return;
    }
    setMCPValues([]);
  }, [isFetched, setMCPValues, mcpToolDetails, key, mcpValues]);

  const mcpServerNames = useMemo(() => {
    // Extract unique server names from all tools
    const serverNamesSet = new Set<string>();
    (mcpToolDetails ?? []).forEach((tool) => {
      const parts = tool.pluginKey.split(Constants.mcp_delimiter);
      const serverName = parts[parts.length - 1];
      serverNamesSet.add(serverName);
    });
    return Array.from(serverNamesSet);
  }, [mcpToolDetails]);

  return {
    isPinned,
    mcpValues,
    setIsPinned,
    setMCPValues,
    mcpServerNames,
    ephemeralAgent,
    mcpToolDetails,
    setEphemeralAgent,
  };
}
