const express  = require('express');
const zlib     = require('zlib');
const archiver = require('archiver');
const multer   = require('multer');
const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const ScriptVault = require('../models/ScriptVault');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Multer: accept zip files into memory (50 MB limit — large files go to GridFS, not the document)
const zipUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = file.mimetype === 'application/zip' ||
               file.mimetype === 'application/x-zip-compressed' ||
               file.mimetype === 'application/octet-stream' ||
               file.originalname.toLowerCase().endsWith('.zip');
    cb(ok ? null : new Error('Only .zip files are accepted'), ok);
  },
});

// ── GridFS bucket (lazy — only created after mongoose connects) ───────────────
let _zipBucket = null;
const getZipBucket = () => {
  if (!_zipBucket) {
    _zipBucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'scriptvault_zips' });
  }
  return _zipBucket;
};

// Store a Buffer in GridFS and return the GridFS file ObjectId
const storeInGridFS = (buffer, filename, metadata = {}) =>
  new Promise((resolve, reject) => {
    const bucket = getZipBucket();
    const uploadStream = bucket.openUploadStream(filename, { metadata });
    uploadStream.on('finish', () => resolve(uploadStream.id));
    uploadStream.on('error', reject);
    uploadStream.end(buffer);
  });

// Delete a GridFS file by its ObjectId (no-op if not found)
const deleteFromGridFS = async (id) => {
  if (!id) return;
  try { await getZipBucket().delete(id); } catch { /* already gone */ }
};

// All routes require authentication
router.use(protect);

// ── Compression helpers ───────────────────────────────────────────────────────
const compress = (text) => new Promise((resolve, reject) => {
  zlib.gzip(Buffer.from(text, 'utf8'), (err, buf) => err ? reject(err) : resolve(buf));
});

const decompress = (buf) => new Promise((resolve, reject) => {
  // buf may be a MongoDB Binary; coerce to real Buffer first
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf.buffer || buf);
  zlib.gunzip(b, (err, out) => err ? reject(err) : resolve(out.toString('utf8')));
});

// Decompress a stored snippet doc and return plain-text content
const getContent = async (doc) => {
  if (!doc.content) return '';
  // Strict check: only decompress when the flag is EXPLICITLY true.
  // Old docs have no isCompressed field → Mongoose returns undefined (schema has no default),
  // so they safely fall through to the plain-text branch.
  if (doc.isCompressed === true) {
    return decompress(doc.content);
  }
  // Legacy plain-text: Mongoose may have already coerced the BSON string to a Buffer.
  return Buffer.isBuffer(doc.content)
    ? doc.content.toString('utf8')
    : String(doc.content);
};

// ── File-block parser (mirrors frontend logic) ────────────────────────────────
const FILE_PATH_RE = /^(?:\/\/|#|--)\s*((?:[\w.\-/\\]*\/)?[\w.\-]+\.\w+)\s*$/;

const parseFileBlocks = (content) => {
  const lines = content.split('\n');
  const blocks = [];
  let current = null;
  lines.forEach((line) => {
    const m = line.match(FILE_PATH_RE);
    if (m) {
      if (current) blocks.push(current);
      current = { filePath: m[1], lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  });
  if (current) blocks.push(current);
  return blocks.map(b => ({ filePath: b.filePath, code: b.lines.join('\n').replace(/^\n+/, '') }));
};

// ── Serialize a snippet doc to a plain JSON-friendly object ──────────────────
const serializeSnippet = async (doc) => {
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  plain.content = await getContent(doc);
  return plain;
};

// ── Access helper ─────────────────────────────────────────────────────────────
const canView = (snippet, user) => {
  if (user.role === 'admin') return true;
  const v = snippet.visibility;
  if (v === 'all') return true;
  if (v === 'staff') return ['agent', 'admin'].includes(user.role);
  if (v === 'admins') return user.role === 'admin';
  if (v === 'custom') {
    // allowedUsers may be populated objects OR raw ObjectIds depending on the query.
    // Use (id._id || id) so both cases normalise to an ObjectId string.
    return (snippet.allowedUsers || []).some(
      (id) => (id._id || id).toString() === user._id.toString()
    );
  }
  return false;
};

// ── Build mongo filter for the current user ───────────────────────────────────
const buildFilter = (user) => {
  if (user.role === 'admin') return {};
  const orConds = [
    { visibility: 'all' },
    { visibility: 'custom', allowedUsers: user._id },
  ];
  if (user.role === 'agent') {
    orConds.push({ visibility: 'staff' });
  }
  return { $or: orConds };
};

// GET /api/codeshare/has-access — lightweight check
router.get('/has-access', async (req, res) => {
  try {
    const count = await ScriptVault.countDocuments(buildFilter(req.user));
    res.json({ hasAccess: count > 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/codeshare — list snippets (decompress content for each)
router.get('/', async (req, res) => {
  try {
    const docs = await ScriptVault.find(buildFilter(req.user))
      .populate('allowedUsers', 'name email role')
      .sort({ updatedAt: -1 });
    const snippets = await Promise.all(docs.map(serializeSnippet));
    res.json({ snippets });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/codeshare/:id — single snippet (decompress)
router.get('/:id', async (req, res) => {
  try {
    const doc = await ScriptVault.findById(req.params.id)
      .populate('allowedUsers', 'name email role');
    if (!doc) return res.status(404).json({ error: 'Snippet not found' });
    if (!canView(doc, req.user)) {
      return res.status(403).json({ error: 'You do not have access to this snippet' });
    }
    const snippet = await serializeSnippet(doc);
    res.json({ snippet });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/codeshare/:id/download
// — if the snippet was uploaded as a zip, serve the original bytes unchanged
// — otherwise build a zip on-the-fly from the stored file blocks
router.get('/:id/download', async (req, res) => {
  try {
    // Must include zipBuffer for raw-zip snippets
    const doc = await ScriptVault.findById(req.params.id)
      .populate('allowedUsers', 'name email role');
    if (!doc) return res.status(404).json({ error: 'Snippet not found' });
    if (!canView(doc, req.user)) {
      return res.status(403).json({ error: 'You do not have access to this snippet' });
    }

    // ── Raw zip: stream directly from GridFS ───────────────────────────────
    if (doc.isZip && doc.gridfsId) {
      const filename = doc.zipName || `${doc.title.replace(/[^a-zA-Z0-9_\-]/g, '_')}.zip`;
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      if (doc.zipSize) res.setHeader('Content-Length', doc.zipSize);
      const downloadStream = getZipBucket().openDownloadStream(doc.gridfsId);
      downloadStream.on('error', (err) => {
        if (!res.headersSent) res.status(500).json({ error: 'File not found in storage' });
      });
      return downloadStream.pipe(res);
    }

    // ── Text/multi-file snippet: build zip on the fly ────────────────────────
    const content = await getContent(doc);
    const blocks = parseFileBlocks(content);
    const safeName = doc.title.replace(/[^a-zA-Z0-9_\-]/g, '_');

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.zip"`);

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (err) => { throw err; });
    archive.pipe(res);

    if (blocks.length > 0 && blocks[0].filePath) {
      for (const block of blocks) {
        archive.append(block.code, { name: block.filePath });
      }
    } else {
      archive.append(content, { name: `${safeName}.txt` });
    }

    await archive.finalize();
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});

// PATCH /api/codeshare/:id/contribute — any viewer can append new content (files/text)
router.patch('/:id/contribute', async (req, res) => {
  try {
    const doc = await ScriptVault.findById(req.params.id)
      .populate('allowedUsers', 'name email role');
    if (!doc) return res.status(404).json({ error: 'Snippet not found' });
    if (!canView(doc, req.user)) {
      return res.status(403).json({ error: 'You do not have access to this snippet' });
    }

    const { newContent } = req.body;
    if (!newContent || !newContent.trim()) {
      return res.status(400).json({ error: 'newContent is required' });
    }

    const existing = await getContent(doc);
    const combined = existing.trimEnd() + '\n\n' + newContent.trim();
    doc.content = await compress(combined);
    doc.isCompressed = true;
    await doc.save();

    const snippet = await serializeSnippet(doc);
    res.json({ snippet });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/codeshare — create (admin only, compress content)
router.post('/', adminOnly, async (req, res) => {
  try {
    const { title, content, language, description, visibility, allowedUsers } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Title and content are required' });
    const compressed = await compress(content);
    const doc = await ScriptVault.create({
      title,
      content: compressed,
      isCompressed: true,
      language: language || 'text',
      description: description || '',
      visibility: visibility || 'all',
      allowedUsers: visibility === 'custom' ? (allowedUsers || []) : [],
      createdBy: req.user._id,
      authorName: req.user.name,
    });
    await doc.populate('allowedUsers', 'name email role');
    const snippet = await serializeSnippet(doc);
    res.status(201).json({ snippet });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/codeshare/:id — update (admin only, compress content)
router.put('/:id', adminOnly, async (req, res) => {
  try {
    const { title, content, language, description, visibility, allowedUsers } = req.body;
    const compressed = await compress(content);
    const doc = await ScriptVault.findByIdAndUpdate(
      req.params.id,
      {
        title,
        content: compressed,
        isCompressed: true,
        language,
        description,
        visibility,
        allowedUsers: visibility === 'custom' ? (allowedUsers || []) : [],
      },
      { new: true, runValidators: true }
    ).populate('allowedUsers', 'name email role');
    if (!doc) return res.status(404).json({ error: 'Snippet not found' });
    const snippet = await serializeSnippet(doc);
    res.json({ snippet });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/codeshare/:id — delete (admin only)
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    const snippet = await ScriptVault.findByIdAndDelete(req.params.id);
    if (!snippet) return res.status(404).json({ error: 'Snippet not found' });
    // Also remove the GridFS file if this was a zip snippet
    if (snippet.gridfsId) await deleteFromGridFS(snippet.gridfsId);
    res.json({ message: 'Snippet deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/codeshare/upload-zip — store a zip file as-is (admin only)
// The original zip bytes are preserved and served unchanged on download.
// Multipart field: "file" (.zip), optional body: title, description, visibility
router.post('/upload-zip', adminOnly, zipUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No zip file provided' });

    const originalName = req.file.originalname;
    const title = (req.body.title || originalName.replace(/\.zip$/i, '')).slice(0, 200);
    const description = req.body.description || `Zip file: ${originalName}`;
    const visibility  = req.body.visibility  || 'all';

    // Minimal placeholder content so the required field is satisfied
    const placeholder = `// zip: ${originalName}`;
    const compressed  = await compress(placeholder);

    // Store the zip bytes in GridFS (no MongoDB document size limit)
    const gridfsId = await storeInGridFS(req.file.buffer, originalName, {
      uploadedBy: req.user._id,
      snippetTitle: title,
    });

    const doc = await ScriptVault.create({
      title,
      content: compressed,
      isCompressed: true,
      language:    'zip',
      description,
      visibility,
      allowedUsers: [],
      createdBy:   req.user._id,
      authorName:  req.user.name,
      isZip:       true,
      zipName:     originalName,
      zipSize:     req.file.size,
      gridfsId,
    });
    await doc.populate('allowedUsers', 'name email role');
    const snippet = await serializeSnippet(doc);
    res.status(201).json({ snippet });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;

