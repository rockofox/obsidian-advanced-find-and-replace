#!/bin/bash

# Build the plugin
echo "Building plugin..."
npm run build

# Create plugin directory in Obsidian vault (if it exists)
# TODO: Make this dynamic
VAULT_DIR="$HOME/Documents/Testing Vault"
OBSIDIAN_PLUGIN_DIR="$VAULT_DIR/.obsidian/plugins/advanced-find-and-replace"

if [ -d "$VAULT_DIR" ]; then
    echo "Installing to $OBSIDIAN_PLUGIN_DIR"
    mkdir -p "$OBSIDIAN_PLUGIN_DIR"
    cp dist/main.js "$OBSIDIAN_PLUGIN_DIR/"
    cp manifest.json "$OBSIDIAN_PLUGIN_DIR/"
    cp dist/styles.css "$OBSIDIAN_PLUGIN_DIR/"
    echo "Plugin installed successfully!"
    echo "Please restart Obsidian and enable the plugin in Community Plugins settings."
else
    echo "Obsidian vault not found at $VAULT_DIR/.obsidian"
    echo "Please manually copy the built files to your vault's .obsidian/plugins/fancy-fr/ directory"
fi
