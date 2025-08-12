import { openDB } from 'idb';

const DB_NAME = 'PDFWorkspaceDB';
const WORKSPACES_STORE = 'workspaces';
const PDF_STORE = 'pdfs';

async function initDB() {
  const db = await openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(WORKSPACES_STORE)) {
        db.createObjectStore(WORKSPACES_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(PDF_STORE)) {
        db.createObjectStore(PDF_STORE, { keyPath: 'id' });
      }
    },
  });
  return db;
}

// --- Workspace Methods ---

export async function getAllWorkspaces() {
  const db = await initDB();
  return db.getAll(WORKSPACES_STORE);
}

export async function saveWorkspace(workspace) {
  const db = await initDB();
  return db.put(WORKSPACES_STORE, workspace);
}

export async function deleteWorkspace(workspaceId) {
  const db = await initDB();
  // We also need to delete associated PDFs
  const workspace = await db.get(WORKSPACES_STORE, workspaceId);
  if (workspace && workspace.pdfDocuments) {
    for (const doc of workspace.pdfDocuments) {
      await deletePdf(doc.id);
    }
  }
  return db.delete(WORKSPACES_STORE, workspaceId);
}


// --- PDF Methods ---

export async function savePdf(pdfData) {
  const db = await initDB();
  return db.put(PDF_STORE, pdfData);
}

export async function getPdf(pdfId) {
  const db = await initDB();
  return db.get(PDF_STORE, pdfId);
}

export async function deletePdf(pdfId) {
  const db = await initDB();
  return db.delete(PDF_STORE, pdfId);
}
