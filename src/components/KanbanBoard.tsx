import React, { useState } from 'react';
import {
  Plus,
  Calendar,
  AlertCircle,
  MoreVertical,
  CheckCircle2,
  Clock,
  ArrowRight,
  ArrowLeft,
  Trash2,
  Edit2,
  User as UserIcon,
} from 'lucide-react';
import { useProject } from '../context/ProjectContext.js';
import { useAuth } from '../context/AuthContext.js';
import { Task } from '../types/index.js';
import { tasksApi } from '../services/api.js';
import { broadcastTaskChange } from '../services/socket.js';

export const KanbanBoard: React.FC = () => {
  const { project, tasks, members, refreshTasks, userRole } = useProject();
  const { user } = useAuth();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'todo' | 'in_progress' | 'completed'>('todo');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [dueDate, setDueDate] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const canEdit = userRole === 'owner' || userRole === 'editor';

  const openCreateModal = (initialStatus: 'todo' | 'in_progress' | 'completed' = 'todo') => {
    setTitle('');
    setDescription('');
    setStatus(initialStatus);
    setPriority('medium');
    setDueDate('');
    setAssigneeId(user?.id || '');
    setErrorMsg('');
    setEditingTask(null);
    setShowCreateModal(true);
  };

  const openEditModal = (task: Task) => {
    setTitle(task.title);
    setDescription(task.description || '');
    setStatus(task.status);
    setPriority(task.priority);
    setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : '');
    setAssigneeId(task.assigneeId || '');
    setErrorMsg('');
    setEditingTask(task);
    setShowCreateModal(true);
  };

  const handleSubmitTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !title.trim()) return;

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      if (editingTask) {
        const updated = await tasksApi.update(project.id, editingTask.id, {
          title: title.trim(),
          description: description.trim() || undefined,
          status,
          priority,
          dueDate: dueDate || undefined,
          assigneeId: assigneeId || undefined,
        });
        broadcastTaskChange(project.id, 'update', updated);
      } else {
        const created = await tasksApi.create(project.id, {
          title: title.trim(),
          description: description.trim() || undefined,
          status,
          priority,
          dueDate: dueDate || undefined,
          assigneeId: assigneeId || undefined,
        });
        broadcastTaskChange(project.id, 'create', created);
      }
      await refreshTasks();
      setShowCreateModal(false);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to save task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMoveStatus = async (task: Task, newStatus: 'todo' | 'in_progress' | 'completed') => {
    if (!project || !canEdit) return;
    try {
      const updated = await tasksApi.update(project.id, task.id, { status: newStatus });
      broadcastTaskChange(project.id, 'update', updated);
      await refreshTasks();
    } catch (err: any) {
      console.error('Failed to move task:', err);
    }
  };

  const handleDeleteTask = async () => {
    if (!project || !taskToDelete || !canEdit) return;
    setIsSubmitting(true);
    try {
      await tasksApi.delete(project.id, taskToDelete.id);
      broadcastTaskChange(project.id, 'delete', taskToDelete);
      await refreshTasks();
      setTaskToDelete(null);
    } catch (err: any) {
      console.error('Failed to delete task:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPriorityStyle = (p: Task['priority']) => {
    switch (p) {
      case 'urgent':
        return 'text-rose-400 bg-rose-950/40 border-rose-800/50';
      case 'high':
        return 'text-amber-400 bg-amber-950/40 border-amber-800/50';
      case 'medium':
        return 'text-indigo-400 bg-indigo-950/40 border-indigo-800/50';
      case 'low':
      default:
        return 'text-slate-400 bg-slate-800 border-slate-700';
    }
  };

  const columns: Array<{ id: 'todo' | 'in_progress' | 'completed'; label: string; count: number }> = [
    {
      id: 'todo',
      label: 'To Do',
      count: tasks.filter((t) => t.status === 'todo').length,
    },
    {
      id: 'in_progress',
      label: 'In Progress',
      count: tasks.filter((t) => t.status === 'in_progress').length,
    },
    {
      id: 'completed',
      label: 'Completed',
      count: tasks.filter((t) => t.status === 'completed').length,
    },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden select-none">
      {/* Top Bar */}
      <div className="h-12 px-6 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/40">
        <div>
          <h2 className="text-sm font-bold text-slate-100">Project Tasks & Kanban Board</h2>
          <p className="text-[11px] text-slate-400">
            Real-time collaborative task tracking synchronized across all team members
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => openCreateModal('todo')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Task</span>
          </button>
        )}
      </div>

      {/* Board Columns */}
      <div className="flex-1 overflow-x-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {columns.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id);
          return (
            <div
              key={col.id}
              className="bg-slate-900/70 border border-slate-800 rounded-lg flex flex-col max-h-[calc(100vh-140px)] min-h-[350px]"
            >
              {/* Column Header */}
              <div className="p-3 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-slate-200">{col.label}</span>
                  <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                    {col.count}
                  </span>
                </div>
                {canEdit && (
                  <button
                    onClick={() => openCreateModal(col.id)}
                    className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition-colors"
                    title={`Add task to ${col.label}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Task Cards Column Body */}
              <div className="p-3 space-y-3 overflow-y-auto flex-1">
                {colTasks.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-xs">
                    <p>No tasks in this column</p>
                  </div>
                ) : (
                  colTasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-3 bg-slate-950 border border-slate-800/90 hover:border-slate-700 rounded-lg space-y-2.5 transition-all text-xs"
                    >
                      {/* Priority and Actions */}
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded border ${getPriorityStyle(
                            task.priority
                          )}`}
                        >
                          {task.priority}
                        </span>

                        {canEdit && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEditModal(task)}
                              className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded"
                              title="Edit Task"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setTaskToDelete(task)}
                              className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded"
                              title="Delete Task"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Title & Description */}
                      <div>
                        <h4 className="font-semibold text-slate-100 text-xs leading-snug">{task.title}</h4>
                        {task.description && (
                          <p className="text-slate-400 text-xs mt-1 leading-relaxed line-clamp-3">
                            {task.description}
                          </p>
                        )}
                      </div>

                      {/* Footer: Due date & Assignee */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 text-[11px] text-slate-400">
                        {task.dueDate ? (
                          <div className="flex items-center gap-1 font-mono text-slate-400">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                          </div>
                        ) : (
                          <div />
                        )}

                        {task.assignee ? (
                          <div
                            className="flex items-center gap-1.5 text-slate-300"
                            title={`Assigned to ${task.assignee.name}`}
                          >
                            <div className="w-5 h-5 rounded-full bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 flex items-center justify-center text-[10px] font-bold">
                              {task.assignee.name[0]}
                            </div>
                            <span className="max-w-[80px] truncate text-[11px]">{task.assignee.name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-600 text-[11px]">Unassigned</span>
                        )}
                      </div>

                      {/* Column Movement Controls */}
                      {canEdit && (
                        <div className="pt-1 flex items-center justify-between gap-1 text-[11px]">
                          {col.id !== 'todo' && (
                            <button
                              onClick={() =>
                                handleMoveStatus(task, col.id === 'completed' ? 'in_progress' : 'todo')
                              }
                              className="flex items-center gap-1 px-2 py-0.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                            >
                              <ArrowLeft className="w-3 h-3" />
                              <span>{col.id === 'completed' ? 'In Progress' : 'To Do'}</span>
                            </button>
                          )}
                          <div className="flex-1" />
                          {col.id !== 'completed' && (
                            <button
                              onClick={() =>
                                handleMoveStatus(task, col.id === 'todo' ? 'in_progress' : 'completed')
                              }
                              className="flex items-center gap-1 px-2 py-0.5 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/40 rounded transition-colors"
                            >
                              <span>{col.id === 'todo' ? 'Start' : 'Complete'}</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create / Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 w-full max-w-md shadow-2xl">
            <h3 className="text-sm font-semibold text-slate-100 mb-1">
              {editingTask ? 'Edit Task' : 'Create New Task'}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Organize feature delivery and coordinate assignments across the team
            </p>

            {errorMsg && <p className="text-xs text-rose-400 mb-3">{errorMsg}</p>}

            <form onSubmit={handleSubmitTask} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Task Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Implement WebSocket reconnection retry"
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description (Optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Details, acceptance criteria, or context..."
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e: any) => setStatus(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e: any) => setPriority(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Assignee</label>
                  <select
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Unassigned</option>
                    {members.map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.user.name} ({m.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !title.trim()}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? 'Saving...' : editingTask ? 'Update Task' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {taskToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 w-full max-w-sm shadow-2xl">
            <h3 className="text-sm font-semibold text-slate-100 mb-1">Delete Task</h3>
            <p className="text-xs text-slate-300 mb-4">
              Are you sure you want to delete <span className="font-semibold text-slate-100">"{taskToDelete.title}"</span>?
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setTaskToDelete(null)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteTask}
                disabled={isSubmitting}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
