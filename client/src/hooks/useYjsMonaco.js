import { useEffect, useState, useRef } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';

export function useYjsMonaco({
  workspaceId,
  activeFileId,
  editor,
  user,
  userRole = 'editor',
  onRemoteUsersChange,
}) {
  const [synced, setSynced] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const ydocRef = useRef(null);
  const providerRef = useRef(null);
  const bindingRef = useRef(null);

  useEffect(() => {
    if (!workspaceId || !activeFileId || !editor) {
      return;
    }

    setConnecting(true);
    setSynced(false);

    // 1. Create fresh Y.Doc
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    // 2. Determine WebSocket URL
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    let wsUrl;
    if (backendUrl) {
      const wsProtocol = backendUrl.startsWith('https') ? 'wss:' : 'ws:';
      const cleanHost = backendUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
      wsUrl = `${wsProtocol}//${cleanHost}/yjs`;
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${protocol}//${window.location.host}/yjs`;
    }
    const roomName = `${workspaceId}:${activeFileId}`;

    // 3. Connect WebsocketProvider
    const provider = new WebsocketProvider(wsUrl, roomName, ydoc, {
      connect: true,
      maxBackoffTime: 5000,
    });
    providerRef.current = provider;

    // 4. Set Awareness user presence (remote cursor, name, color)
    const userColor = user?.avatarColor || '#6366F1';
    provider.awareness.setLocalStateField('user', {
      name: user?.name || 'Developer',
      color: userColor,
      colorLight: `${userColor}33`,
      role: userRole,
    });

    // Awareness change listener
    const handleAwarenessChange = () => {
      const states = provider.awareness.getStates();
      const activeCollaborators = [];

      states.forEach((state, clientID) => {
        if (state.user) {
          activeCollaborators.push({
            clientId: clientID,
            ...state.user,
          });
        }
      });

      if (onRemoteUsersChange) {
        onRemoteUsersChange(activeCollaborators);
      }
    };

    provider.awareness.on('change', handleAwarenessChange);

    // Sync status listeners
    provider.on('status', (event) => {
      if (event.status === 'connected') {
        setConnecting(false);
        setSynced(true);
      } else {
        setSynced(false);
      }
    });

    provider.on('sync', (isSynced) => {
      setSynced(isSynced);
      setConnecting(false);
    });

    // 5. Bind Monaco Editor to Y.Text
    const yText = ydoc.getText('monaco');
    const model = editor.getModel();

    if (model) {
      const binding = new MonacoBinding(
        yText,
        model,
        new Set([editor]),
        provider.awareness
      );
      bindingRef.current = binding;
    }

    // Cleanup on file switch or unmount
    return () => {
      provider.awareness.off('change', handleAwarenessChange);
      if (bindingRef.current) {
        bindingRef.current.destroy();
        bindingRef.current = null;
      }
      if (providerRef.current) {
        providerRef.current.destroy();
        providerRef.current = null;
      }
      if (ydocRef.current) {
        ydocRef.current.destroy();
        ydocRef.current = null;
      }
    };
  }, [workspaceId, activeFileId, editor, user, userRole, onRemoteUsersChange]);

  return {
    synced,
    connecting,
    ydoc: ydocRef.current,
    provider: providerRef.current,
  };
}
