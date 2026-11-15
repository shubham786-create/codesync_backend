import * as Y from 'yjs';
import mongoose from 'mongoose';
import { CollaborativeDocument } from '../models/CollaborativeDocument.js';
import { WorkspaceFile } from '../models/WorkspaceFile.js';

// Debounce timer map: docName -> timeout handle
const debounceTimers = new Map();

// Helper to parse workspaceId and fileId from docName
export function parseDocName(docName) {
  // Format: "workspaceId:fileId" or "workspaceId/fileId"
  const parts = docName.split(/[:/]/);
  if (parts.length >= 2) {
    return { workspaceId: parts[0], fileId: parts[1] };
  }
  return { workspaceId: null, fileId: docName };
}

export const mongoYjsPersistence = {
  /**
   * Called when a Y.Doc is initialized in memory.
   * Loads existing binary CRDT state from MongoDB, or seeds with plain-text content from WorkspaceFile.
   */
  async bindState(docName, ydoc) {
    const { workspaceId, fileId } = parseDocName(docName);
    if (!fileId) return;

    try {
      // 1. Try to load existing binary CRDT state
      const collabDoc = await CollaborativeDocument.findOne({ fileId });
      if (collabDoc && collabDoc.yjsState) {
        Y.applyUpdate(ydoc, new Uint8Array(collabDoc.yjsState));
        return;
      }

      // 2. Fallback: Seed from WorkspaceFile plain-text content
      const file = await WorkspaceFile.findById(fileId);
      if (file && file.content) {
        const ytext = ydoc.getText('monaco');
        ydoc.transact(() => {
          if (ytext.length === 0) {
            ytext.insert(0, file.content);
          }
        });

        // Save initial binary state
        const initialBinary = Buffer.from(Y.encodeStateAsUpdate(ydoc));
        await CollaborativeDocument.findOneAndUpdate(
          { fileId },
          {
            workspaceId: file.workspaceId,
            fileId: file._id,
            yjsState: initialBinary,
            lastSavedAt: new Date(),
          },
          { upsert: true, new: true }
        );
      }
    } catch (err) {
      console.error(`[Yjs Persistence] bindState failed for ${docName}:`, err);
    }

    // Attach debounced auto-save listener on every doc update
    ydoc.on('update', () => {
      if (debounceTimers.has(docName)) {
        clearTimeout(debounceTimers.get(docName));
      }
      debounceTimers.set(
        docName,
        setTimeout(() => {
          debounceTimers.delete(docName);
          mongoYjsPersistence.writeState(docName, ydoc);
        }, 1000)
      );
    });
  },

  /**
   * Writes the binary state snapshot and updates plain-text WorkspaceFile.content in MongoDB.
   */
  async writeState(docName, ydoc) {
    const { workspaceId, fileId } = parseDocName(docName);
    if (!fileId) return;

    // Check if mongoose is currently connected
    if (mongoose.connection.readyState !== 1) {
      return;
    }

    try {
      const binaryState = Buffer.from(Y.encodeStateAsUpdate(ydoc));
      const plainText = ydoc.getText('monaco').toString();

      // Upsert CollaborativeDocument
      await CollaborativeDocument.findOneAndUpdate(
        { fileId },
        {
          workspaceId,
          fileId,
          yjsState: binaryState,
          lastSavedAt: new Date(),
          $inc: { version: 1 },
        },
        { upsert: true }
      );

      // Mirror plain-text in WorkspaceFile for quick file explorer & preview access
      await WorkspaceFile.findByIdAndUpdate(fileId, {
        content: plainText,
      });
    } catch (err) {
      console.error(`[Yjs Persistence] writeState failed for ${docName}:`, err);
    }
  },
};
