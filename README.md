# Obsidian MCP Module

This module provides an MCP server for reading Obsidian vaults.

Currently both MCP tools and resources exist for accessing notes since some clients only support one or the other (VS Code only support tools).

## Features
- `search-notes`: Search notes by topic
- `get-note`: Retrieve note contents

## Installation

### VS Code

You'll need to add a `.vscode/mcp.json` file to your workspace. Or you can set it up so all workspaces have access: https://code.visualstudio.com/docs/copilot/chat/mcp-servers.

```json
{
    "servers": {
        "obsidian-mcp": {
            "type": "stdio",
            "command": "deno",
            "args": [
                "run",
                "--allow-read",
                "${workspaceFolder}/main.ts",
                "--vaultPath=/path/to/vault"
            ]
        }
    }
}
```

### Claude Desktop

```json
{
    "mcpServers": {
      "filesystem": {
        "command": "/path/to/deno",
        "args": [
            "run",
            "--allow-read",
            "/path/to/main.ts",
            "--vaultPath=/path/to/vault"
        ]
      }
    }
  }
```

## License

This project is licensed under the MIT License. See the LICENSE file for details.
