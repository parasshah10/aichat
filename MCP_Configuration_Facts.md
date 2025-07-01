# MCP Configuration Facts

This document outlines the current implementation of MCPs and the desired functionality for customizing MCP server configurations.

## Current Implementation

*   **Configuration:** MCP servers are currently configured in the `librechat.yaml` file. The configuration is validated against a Zod schema defined in `packages/data-provider/src/mcp.ts`.
*   **Server Types:** There are four types of MCP servers: "stdio", "websocket", "sse", and "streamable-http".
*   **Initialization:** MCP servers are initialized on server startup by the `initializeMCP` function in `api/server/services/initializeMCP.js`.
*   **Tool Association:** MCP servers are associated with agents, and tools are identified by a delimited string that includes the MCP server name.

## Desired Functionality

### General

*   **User-defined MCP Servers:** Users should be able to define their own MCP servers from the UI.
*   **Database Storage:** User-defined MCP server configurations should be stored in the database.
*   **Override Mechanism:** An override mechanism should be implemented to allow administrators to force the application to use the MCP server configurations from the `librechat.yaml` file, in case of any issues with the database.

### UI

*   **Servers Management Page:**
    *   A new "Servers Management" page should be created in the settings section of the application.
    *   The page should have a title of "Servers Management".
    *   There should be buttons for "Add" and "Refresh".

*   **Server List:**
    *   This page should display a list of all configured MCP servers, including both the default servers from `librechat.yaml` and the user-defined servers from the database.
    *   Each server in the list should be displayed in a card format.
    *   Each card should display the server's name, status (e.g., "Online", "Offline"), and the number of tools it provides (e.g., "19 Tools").
    *   Each card should have "Edit", "Disable", and "Delete" buttons.

*   **Add/Edit Server Modal:**
    *   A modal should be used to add a new server or edit an existing one.
    *   The modal should have a title of "Add Server" or "Edit Server: [Server Name]".
    *   The modal should have the following fields:
        *   **Server Name:** A text input for the server's name.
        *   **Server Type:** A set of radio buttons for selecting the server type: "STDIO", "SSE", or "Streamable HTTP".
        *   **Server URL:** A text input for the server's URL (for SSE and Streamable HTTP types).
        *   **Command:** A text input for the command to execute for STDIO servers.
        *   **Arguments:** A text input for the arguments to pass to the command for STDIO servers.
        *   **Environment Variables:** A section for adding key-value pairs for environment variables.
        *   **HTTP Headers:** A section for adding key-value pairs for HTTP headers.
        *   **Configuration:** A collapsible section with the following fields:
            *   **Request Timeout:** A text input for the timeout for requests to the MCP server.
            *   **Maximum Total Timeout:** A text input for the maximum total timeout for requests sent to the MCP server.
            *   **Reset Timeout on Progress:** A checkbox to reset the timeout on progress notifications.
    *   The modal should have "Cancel" and "Add" (or "Save") buttons.

*   **Tools View:**
    *   When a server in the list is expanded, it should display a list of the tools that it provides.
    *   Each tool should be displayed in a card format.
    *   Each tool card should display the tool's name and a description of what it does.
    *   Each tool card should have a "Run" button and a toggle switch to enable or disable the tool.
    *   Each tool card should be expandable to show its input schema in a code block.

### Behavior

*   **Merging Configurations:** The application should merge the MCP server configurations from the `librechat.yaml` file and the database. If a server is defined in both places, the database configuration should take precedence, unless the override mechanism is enabled.
*   **User-specific Configurations:** User-defined MCP server configurations should be associated with a specific user and should only be visible to that user.
*   **Default Servers:** The default MCP servers from `librechat.yaml` should be visible to all users, but should not be editable or deletable from the UI.
