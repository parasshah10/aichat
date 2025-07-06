import { useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { getConfigDefaults, PermissionTypes, Permissions, QueryKeys, Constants } from 'librechat-data-provider';
import type { ContextType } from '~/common';
import type { TMessage } from 'librechat-data-provider';
import ModelSelector from './Menus/Endpoints/ModelSelector';
import { PresetsMenu, HeaderNewChat, OpenSidebar } from './Menus';
import { useGetStartupConfig } from '~/data-provider';
import ExportAndShareMenu from './ExportAndShareMenu';
import { useMediaQuery, useHasAccess } from '~/hooks';
import { useChatContext } from '~/Providers';
import { Button } from '~/components/ui';
import BookmarkMenu from './Menus/BookmarkMenu';
import { TemporaryChat } from './TemporaryChat';
import AddMultiConvo from './AddMultiConvo';

const defaultInterface = getConfigDefaults().interface;

export default function Header() {
  const { data: startupConfig } = useGetStartupConfig();
  const { navVisible, setNavVisible } = useOutletContext<ContextType>();
  const queryClient = useQueryClient();
  const { conversation, newConversation } = useChatContext();
  const interfaceConfig = useMemo(
    () => startupConfig?.interface ?? defaultInterface,
    [startupConfig],
  );

  const hasAccessToBookmarks = useHasAccess({
    permissionType: PermissionTypes.BOOKMARKS,
    permission: Permissions.USE,
  });

  const hasAccessToMultiConvo = useHasAccess({
    permissionType: PermissionTypes.MULTI_CONVO,
    permission: Permissions.USE,
  });

  const isSmallScreen = useMediaQuery('(max-width: 768px)');

  if (isSmallScreen) {
    // Mobile layout: hamburger (left) + model selector + action buttons + new chat (right)
    return (
      <div className="sticky top-0 z-10 flex h-12 w-full items-center bg-white px-2 py-1 text-text-primary dark:bg-gray-800">
        {/* Left: Hamburger menu */}
        <div className="flex items-center">
          <Button
            size="icon"
            variant="ghost"
            data-testid="mobile-open-sidebar-button"
            aria-label="Open sidebar"
            className="h-10 w-10 rounded-lg p-0.5 hover:bg-surface-hover"
            onClick={() =>
              setNavVisible((prev) => {
                localStorage.setItem('navVisible', JSON.stringify(!prev));
                return !prev;
              })
            }
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M3 8C3 7.44772 3.44772 7 4 7H20C20.5523 7 21 7.44772 21 8C21 8.55228 20.5523 9 20 9H4C3.44772 9 3 8.55228 3 8ZM3 16C3 15.4477 3.44772 15 4 15H14C14.5523 15 15 15.4477 15 16C15 16.5523 14.5523 17 14 17H4C3.44772 17 3 16.5523 3 16Z"
                fill="currentColor"
              />
            </svg>
          </Button>
        </div>
        
        {/* Model Selector - positioned after hamburger */}
        <div className="ml-0.5 flex-shrink-0 min-w-0">
          <ModelSelector startupConfig={startupConfig} />
        </div>
        
        {/* Center: Action buttons */}
        <div className="hide-scrollbar ml-2 flex flex-1 items-center justify-center gap-1 overflow-x-auto">
          <div className="flex items-center gap-1">
            {interfaceConfig.presets === true && interfaceConfig.modelSelect && <PresetsMenu />}
            {hasAccessToMultiConvo === true && <AddMultiConvo />}
            <ExportAndShareMenu
              isSharedButtonEnabled={startupConfig?.sharedLinksEnabled ?? false}
            />
            <TemporaryChat />
          </div>
        </div>
        
        {/* Right: New chat button */}
        <div className="ml-2 flex items-center flex-shrink-0">
          <Button
            size="icon"
            variant="ghost"
            data-testid="mobile-new-chat-button"
            aria-label="New chat"
            className="h-10 w-10 rounded-lg p-2 hover:bg-surface-hover"
            onClick={(e) => {
              if (e.button === 0 && (e.ctrlKey || e.metaKey)) {
                window.open('/c/new', '_blank');
                return;
              }
              queryClient.setQueryData<TMessage[]>(
                [QueryKeys.messages, conversation?.conversationId ?? Constants.NEW_CONVO],
                [],
              );
              queryClient.invalidateQueries([QueryKeys.messages]);
              newConversation();
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M16.7929 2.79289C18.0118 1.57394 19.9882 1.57394 21.2071 2.79289C22.4261 4.01184 22.4261 5.98815 21.2071 7.20711L12.7071 15.7071C12.5196 15.8946 12.2652 16 12 16H9C8.44772 16 8 15.5523 8 15V12C8 11.7348 8.10536 11.4804 8.29289 11.2929L16.7929 2.79289ZM19.7929 4.20711C19.355 3.7692 18.645 3.7692 18.2071 4.2071L10 12.4142V14H11.5858L19.7929 5.79289C20.2308 5.35499 20.2308 4.64501 19.7929 4.20711ZM6 5C5.44772 5 5 5.44771 5 6V18C5 18.5523 5.44772 19 6 19H18C18.5523 19 19 18.5523 19 18V14C19 13.4477 18.5523 13 18 13C17.4477 13 17 13.4477 17 14V17H7V7H14C14.5523 7 15 6.55228 15 6C15 5.44772 14.5523 5 14 5H6Z"
                fill="currentColor"
              />
            </svg>
          </Button>
        </div>
      </div>
    );
  }

  // Desktop layout (unchanged)
  return (
    <div className="sticky top-0 z-10 flex h-14 w-full items-center justify-between bg-white p-2 font-semibold text-text-primary dark:bg-gray-800">
      <div className="hide-scrollbar flex w-full items-center justify-between gap-2 overflow-x-auto">
        <div className="mx-1 flex items-center gap-2">
          <div
            className={`flex items-center gap-2 transition-all duration-200 ease-in-out ${
              !navVisible
                ? 'translate-x-0 opacity-100'
                : 'pointer-events-none translate-x-[-100px] opacity-0'
            }`}
          >
            <OpenSidebar setNavVisible={setNavVisible} />
            <HeaderNewChat />
          </div>
          <div
            className={`flex items-center gap-2 transition-all duration-200 ease-in-out ${
              !navVisible ? 'translate-x-0' : 'translate-x-[-100px]'
            }`}
          >
            <ModelSelector startupConfig={startupConfig} />
            {interfaceConfig.presets === true && interfaceConfig.modelSelect && <PresetsMenu />}
            {hasAccessToBookmarks === true && <BookmarkMenu />}
            {hasAccessToMultiConvo === true && <AddMultiConvo />}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ExportAndShareMenu
            isSharedButtonEnabled={startupConfig?.sharedLinksEnabled ?? false}
          />
          <TemporaryChat />
        </div>
      </div>
      {/* Empty div for spacing */}
      <div />
    </div>
  );
}