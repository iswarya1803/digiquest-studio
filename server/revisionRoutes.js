import express from 'express';
import { dbData, saveDB } from './db.js';
import { authenticateToken, requireAdmin } from './middleware/auth.js';

const router = express.Router();

// Helper: generate next ID
function nextId(arr) {
  return arr.length > 0 ? Math.max(...arr.map(r => r.id)) + 1 : 1;
}

// GET /api/revisions – list revisions (admin sees all, client sees own)
router.get('/', authenticateToken, (req, res) => {
  try {
    let revisions = dbData.revision_requests || [];
    if (req.user.role !== 'admin') {
      // Clients see only revisions for projects they own
      const clientProjects = (dbData.projects || [])
        .filter(p => p.client_id === req.user.id)
        .map(p => p.id);
      revisions = revisions.filter(r => clientProjects.includes(r.project_id));
    }
    // Enrich with project title and requester name
    const enriched = revisions.map(r => {
      const project = (dbData.projects || []).find(p => p.id === r.project_id);
      const requester = (dbData.users || []).find(u => u.id === r.requested_by);
      return {
        ...r,
        projectTitle: project ? project.title : 'Unknown Project',
        requesterName: requester ? requester.full_name : 'Unknown User'
      };
    });
    res.json(enriched);
  } catch (err) {
    console.error('GET /revisions error:', err);
    res.status(500).json({ error: 'Failed to fetch revisions' });
  }
});

// GET /api/revisions/:id – single revision
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const revision = (dbData.revision_requests || []).find(r => r.id === id);
    if (!revision) return res.status(404).json({ error: 'Revision not found' });

    // Access check for clients
    if (req.user.role !== 'admin') {
      const project = (dbData.projects || []).find(p => p.id === revision.project_id);
      if (!project || project.client_id !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }
    res.json(revision);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch revision' });
  }
});

// POST /api/revisions – create new revision request
router.post('/', authenticateToken, (req, res) => {
  try {
    const { project_id, title, description, priority } = req.body;
    if (!project_id || !title || !description) {
      return res.status(400).json({ error: 'project_id, title, and description are required' });
    }

    // Verify the project exists
    const project = (dbData.projects || []).find(p => p.id === parseInt(project_id));
    if (!project) return res.status(404).json({ error: 'Project not found' });

    // Clients can only request revisions on their own projects
    if (req.user.role !== 'admin' && project.client_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: not your project' });
    }

    const newRevision = {
      id: nextId(dbData.revision_requests || []),
      project_id: parseInt(project_id),
      title: title.trim(),
      description: description.trim(),
      priority: priority || 'Medium',
      status: 'Pending',
      requested_by: req.user.id,
      admin_notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (!dbData.revision_requests) dbData.revision_requests = [];
    dbData.revision_requests.unshift(newRevision);

    // Create a notification for admin
    if (!dbData.notifications) dbData.notifications = [];
    dbData.notifications.unshift({
      id: nextId(dbData.notifications),
      user_id: null, // broadcast to admins
      type: 'revision_request',
      message: `New revision request "${title}" for project "${project.title}"`,
      is_read: false,
      created_at: new Date().toISOString()
    });

    // Audit log
    if (!dbData.audit_logs) dbData.audit_logs = [];
    dbData.audit_logs.unshift({
      id: nextId(dbData.audit_logs),
      user_id: req.user.id,
      action_type: 'REVISION_CREATED',
      description: `Created revision request "${title}" for project #${project_id}`,
      ip_address: req.ip || '127.0.0.1',
      created_at: new Date().toISOString()
    });

    saveDB();
    res.status(201).json(newRevision);
  } catch (err) {
    console.error('POST /revisions error:', err);
    res.status(500).json({ error: 'Failed to create revision' });
  }
});

// PUT /api/revisions/:id/status – admin updates revision status
router.put('/:id/status', authenticateToken, requireAdmin, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, admin_notes } = req.body;
    const allowed = ['Pending', 'In Progress', 'Resolved', 'Rejected'];
    if (!status || !allowed.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}` });
    }

    const idx = (dbData.revision_requests || []).findIndex(r => r.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Revision not found' });

    dbData.revision_requests[idx] = {
      ...dbData.revision_requests[idx],
      status,
      admin_notes: admin_notes || dbData.revision_requests[idx].admin_notes,
      updated_at: new Date().toISOString()
    };

    // Audit log
    dbData.audit_logs.unshift({
      id: nextId(dbData.audit_logs),
      user_id: req.user.id,
      action_type: 'REVISION_STATUS_UPDATED',
      description: `Updated revision #${id} status to "${status}"`,
      ip_address: req.ip || '127.0.0.1',
      created_at: new Date().toISOString()
    });

    saveDB();
    
    // Send email notification
    const revision = dbData.revision_requests[idx];
    const project = (dbData.projects || []).find(p => p.id === revision.project_id);
    if (project) {
      const clientUser = (dbData.users || []).find(u => u.id === project.client_id);
      if (clientUser) {
      }
    }

    res.json(revision);
  } catch (err) {
    console.error('PUT /revisions/:id/status error:', err);
    res.status(500).json({ error: 'Failed to update revision status' });
  }
});

// DELETE /api/revisions/:id – admin can delete a revision
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const idx = (dbData.revision_requests || []).findIndex(r => r.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Revision not found' });

    dbData.revision_requests.splice(idx, 1);
    saveDB();
    res.json({ message: 'Revision deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete revision' });
  }
});

export default router;
