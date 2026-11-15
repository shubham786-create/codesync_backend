import * as Y from 'yjs';
import mongoose from 'mongoose';
import { CollaborativeDocument } from '../models/CollaborativeDocument.js';
import { WorkspaceFile } from '../models/WorkspaceFile.js';

// Debounce timer map: docName -> timeout handle
const debounceTimers = new Map();

// Helper to parse workspaceId and fileId from docName safely
export function parseDocName(docName) {
  if (!docName) return { workspaceId: null, fileId: null };

  try {
    // Decode in case it's URL encoded (e.g. %3A for colon)
    let clean = decodeURIComponent(docName).trim().replace(/^\/+/, '');
    // Strip any leading 'yjs/' prefix
    clean = clean.replace(/^yjs\//, '');

    const parts = clean.split(/[:/]/);
    if (parts.length >= 2) {
      const wsId = parts[0].trim();
      const fId = parts[1].trim();
      return {
        workspaceId: mongoose.Types.ObjectId.isValid(wsId) ? wsId : null,
        fileId: mongoose.Types.ObjectId.isValid(fId) ? fId : null,
      };
    }

    return {
      workspaceId: null,
      fileId: mongoose.Types.ObjectId.isValid(clean) ? clean : null,
    };
  } catch (err) {
    return { workspaceId: null, fileId: null };
  }
}

export const mongoYjsPersistence = {
  /**
   * Called when a Y.Doc is initialized in memory.
   * Loads existing binary CRDT state from MongoDB, or seeds with plain-text content from WorkspaceFile.
   */
  async bindState(docName, ydoc) {
    const { workspaceId, fileId } = parseDocName(docName);
    if (!fileId) {
      return;
    }

    try {
      // 1. Try to load existing binary CRDT state
      const collabDoc = await CollaborativeDocument.findOne({ fileId });
      if (collabDoc && collabDoc.yjsState) {
        Y.applyUpdate(ydoc, new Uint8Array(collabDoc.yjsState));
        return;
      }

      // 2. Fallback: Seed from WorkspaceFile plain-text content
      const file = await WorkspaceFile.findById(fileId);
      if (file && typeof file.content === 'string') {
        const ytext = ydoc.getText('monaco');
        ydoc.transact(() => {
          if (ytext.length === 0 && file.content.length > 0) {
            ytext.insert(0, file.content);
          }
        });

        // Save initial binary state
        if (file.content.length > 0) {
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
      }
    } catch (err) {
      console.error(`[Yjs Persistence] bindState error for ${docName}:`, err.message);
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

      await Promise.all([
        CollaborativeDocument.findOneAndUpdate(
          { fileId },
          {
            ...(workspaceId && { workspaceId }),
            fileId,
            yjsState: binaryState,
            lastSavedAt: new Date(),
            $inc: { version: 1 },
          },
          { upsert: true }
        ),
        WorkspaceFile.findByIdAndUpdate(fileId, {
          content: plainText,
        }),
      ]);
    } catch (err) {
      console.error(`[Yjs Persistence] writeState error for ${docName}:`, err.message);
    }
  },
};
