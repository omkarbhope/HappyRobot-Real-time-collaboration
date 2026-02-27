/**
 * Central OpenAPI (Swagger) documentation for HappyRobot API.
 * Used by swagger-jsdoc to generate the spec. All paths are under /api and require session auth.
 */

/**
 * @openapi
 * /api/projects:
 *   get:
 *     summary: List projects for the current user
 *     tags: [Projects]
 *     security: [sessionAuth: []]
 *     responses:
 *       200:
 *         description: List of projects
 *       401:
 *         description: Unauthorized
 *   post:
 *     summary: Create a project
 *     tags: [Projects]
 *     security: [sessionAuth: []]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *     responses:
 *       201:
 *         description: Created project
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */

/**
 * @openapi
 * /api/projects/{id}:
 *   get:
 *     summary: Get a project by ID
 *     tags: [Projects]
 *     security: [sessionAuth: []]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Project
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not found
 *   patch:
 *     summary: Update a project
 *     tags: [Projects]
 *     security: [sessionAuth: []]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *     responses:
 *       200:
 *         description: Updated project
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not found
 *   delete:
 *     summary: Delete a project
 *     tags: [Projects]
 *     security: [sessionAuth: []]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Deleted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not found
 */

/**
 * @openapi
 * /api/projects/{id}/members:
 *   get:
 *     summary: List project members
 *     tags: [Projects]
 *     security: [sessionAuth: []]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of members
 *       401:
 *         description: Unauthorized
 */

/**
 * @openapi
 * /api/tasks:
 *   get:
 *     summary: List tasks (paginated or by viewport bounds)
 *     tags: [Tasks]
 *     security: [sessionAuth: []]
 *     parameters:
 *       - in: query
 *         name: projectId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: cursor
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: minX
 *         schema: { type: number }
 *       - in: query
 *         name: minY
 *         schema: { type: number }
 *       - in: query
 *         name: maxX
 *         schema: { type: number }
 *       - in: query
 *         name: maxY
 *         schema: { type: number }
 *     responses:
 *       200:
 *         description: List of tasks (or items in bounds)
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *   post:
 *     summary: Create a task
 *     tags: [Tasks]
 *     security: [sessionAuth: []]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [projectId]
 *             properties:
 *               projectId: { type: string }
 *               title: { type: string }
 *               configuration: { type: object }
 *               dependencies: { type: array, items: { type: string } }
 *     responses:
 *       201:
 *         description: Created task
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */

/**
 * @openapi
 * /api/tasks/{id}:
 *   get:
 *     summary: Get a task by ID
 *     tags: [Tasks]
 *     security: [sessionAuth: []]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Task
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not found
 *   patch:
 *     summary: Update a task
 *     tags: [Tasks]
 *     security: [sessionAuth: []]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               status: { type: string }
 *               configuration: { type: object }
 *               dependencies: { type: array, items: { type: string } }
 *     responses:
 *       200:
 *         description: Updated task
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not found
 *   delete:
 *     summary: Delete a task
 *     tags: [Tasks]
 *     security: [sessionAuth: []]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Deleted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not found
 */

/**
 * @openapi
 * /api/tasks/bulk:
 *   patch:
 *     summary: Bulk update tasks (e.g. positions)
 *     tags: [Tasks]
 *     security: [sessionAuth: []]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [updates]
 *             properties:
 *               updates:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     taskId: { type: string }
 *                     title: { type: string }
 *                     configuration: { type: object }
 *     responses:
 *       200:
 *         description: Update results
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */

/**
 * @openapi
 * /api/comments:
 *   get:
 *     summary: List comments for a task
 *     tags: [Comments]
 *     security: [sessionAuth: []]
 *     parameters:
 *       - in: query
 *         name: taskId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of comments
 *       401:
 *         description: Unauthorized
 *   post:
 *     summary: Add a comment
 *     tags: [Comments]
 *     security: [sessionAuth: []]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [taskId, content]
 *             properties:
 *               taskId: { type: string }
 *               content: { type: string }
 *               positionX: { type: number }
 *               positionY: { type: number }
 *     responses:
 *       201:
 *         description: Created comment
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */

/**
 * @openapi
 * /api/comments/summary:
 *   get:
 *     summary: Get comment counts per task
 *     tags: [Comments]
 *     security: [sessionAuth: []]
 *     parameters:
 *       - in: query
 *         name: projectId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Comment counts by task
 *       401:
 *         description: Unauthorized
 */

/**
 * @openapi
 * /api/comments/{id}:
 *   patch:
 *     summary: Update a comment
 *     tags: [Comments]
 *     security: [sessionAuth: []]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content: { type: string }
 *     responses:
 *       200:
 *         description: Updated comment
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not found
 *   delete:
 *     summary: Delete a comment
 *     tags: [Comments]
 *     security: [sessionAuth: []]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Deleted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not found
 */

/**
 * @openapi
 * /api/events:
 *   get:
 *     summary: Get board events (event log)
 *     tags: [Events]
 *     security: [sessionAuth: []]
 *     parameters:
 *       - in: query
 *         name: boardId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: after
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: List of events
 *       401:
 *         description: Unauthorized
 */

/**
 * @openapi
 * /api/events/undo:
 *   post:
 *     summary: Undo an event
 *     tags: [Events]
 *     security: [sessionAuth: []]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [eventId]
 *             properties:
 *               eventId: { type: string }
 *     responses:
 *       200:
 *         description: Undo result
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Event not found or cannot undo
 */

/**
 * @openapi
 * /api/events/redo:
 *   post:
 *     summary: Redo an undone event
 *     tags: [Events]
 *     security: [sessionAuth: []]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [eventId]
 *             properties:
 *               eventId: { type: string }
 *     responses:
 *       200:
 *         description: Redo result
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Event not found or cannot redo
 */

/**
 * @openapi
 * /api/notifications:
 *   get:
 *     summary: List notifications for the current user
 *     tags: [Notifications]
 *     security: [sessionAuth: []]
 *     responses:
 *       200:
 *         description: List of notifications
 *       401:
 *         description: Unauthorized
 */

/**
 * @openapi
 * /api/notifications/read-all:
 *   patch:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     security: [sessionAuth: []]
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *         description: Unauthorized
 */

/**
 * @openapi
 * /api/notifications/{id}:
 *   patch:
 *     summary: Mark a notification as read
 *     tags: [Notifications]
 *     security: [sessionAuth: []]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not found
 */

/**
 * @openapi
 * /api/invite/create:
 *   post:
 *     summary: Create an invite link for a project
 *     tags: [Invite]
 *     security: [sessionAuth: []]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [projectId]
 *             properties:
 *               projectId: { type: string }
 *     responses:
 *       200:
 *         description: Invite token/URL
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */

/**
 * @openapi
 * /api/invite/join:
 *   post:
 *     summary: Join a project via invite token
 *     tags: [Invite]
 *     security: [sessionAuth: []]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token: { type: string }
 *     responses:
 *       200:
 *         description: Joined project
 *       400:
 *         description: Invalid or expired token
 *       401:
 *         description: Unauthorized
 */
