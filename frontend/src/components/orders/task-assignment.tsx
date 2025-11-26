'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { Plus, CheckCircle, Clock, AlertCircle, Trash2, Edit2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { formatDate } from '@/lib/utils';

interface User {
  id: string;
  fullName: string;
  email: string;
  role: string;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  assignedTo?: string;
  assignedToDetails?: User;
  assignedByDetails?: User;
  status: string;
  priority: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

interface TaskAssignmentProps {
  orderId: string;
}

export function TaskAssignment({ orderId }: TaskAssignmentProps) {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedTo: '',
    priority: 'medium',
    dueDate: '',
  });

  useEffect(() => {
    fetchTasks();
    fetchUsers();
  }, [orderId]);

  const fetchTasks = async () => {
    try {
      const response = await api.get(`/orders/tasks`, {
        params: { order_id: orderId }
      });
      setTasks(response.data);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/auth/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const handleOpenDialog = (task?: Task) => {
    if (task) {
      setEditingTask(task);
      setFormData({
        title: task.title,
        description: task.description || '',
        assignedTo: task.assignedTo || '',
        priority: task.priority,
        dueDate: task.dueDate || '',
      });
    } else {
      setEditingTask(null);
      setFormData({
        title: '',
        description: '',
        assignedTo: '',
        priority: 'medium',
        dueDate: '',
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const normalizedTitle = formData.title.trim() || 'Order task';
      const taskData = {
        order: orderId,
        title: normalizedTitle,
        description: formData.description || undefined,
        assignedTo: formData.assignedTo || undefined,
        priority: formData.priority,
        dueDate: formData.dueDate || undefined,
      };

      if (editingTask) {
        await api.patch(`/orders/tasks/${editingTask.id}/`, taskData);
        toast({
          title: 'Success',
          description: 'Task updated successfully',
        });
      } else {
        await api.post('/orders/tasks/', taskData);
        toast({
          title: 'Success',
          description: 'Task created successfully',
        });
      }

      setDialogOpen(false);
      await fetchTasks();
    } catch (error: any) {
      console.error('Error saving task:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to save task',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      await api.delete(`/orders/tasks/${taskId}/`);
      toast({
        title: 'Success',
        description: 'Task deleted successfully',
      });
      await fetchTasks();
    } catch (error: any) {
      console.error('Error deleting task:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete task',
        variant: 'destructive',
      });
    }
  };

  const handleMarkCompleted = async (taskId: string) => {
    try {
      await api.post(`/orders/tasks/${taskId}/mark-completed/`);
      toast({
        title: 'Success',
        description: 'Task marked as completed',
      });
      await fetchTasks();
    } catch (error: any) {
      console.error('Error marking task as completed:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update task',
        variant: 'destructive',
      });
    }
  };

  const handleMarkInProgress = async (taskId: string) => {
    try {
      await api.post(`/orders/tasks/${taskId}/mark-in-progress/`);
      toast({
        title: 'Success',
        description: 'Task marked as in progress',
      });
      await fetchTasks();
    } catch (error: any) {
      console.error('Error marking task as in progress:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update task',
        variant: 'destructive',
      });
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === 'completed') return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (status === 'in_progress') return <Clock className="h-4 w-4 text-blue-600" />;
    return <AlertCircle className="h-4 w-4 text-gray-400" />;
  };

  const getStatusBadgeClass = (status: string) => {
    if (status === 'completed') return 'bg-green-100 text-green-700 border-green-300';
    if (status === 'in_progress') return 'bg-blue-100 text-blue-700 border-blue-300';
    if (status === 'cancelled') return 'bg-gray-100 text-gray-700 border-gray-300';
    return 'bg-yellow-100 text-yellow-700 border-yellow-300';
  };

  const getPriorityBadgeClass = (priority: string) => {
    if (priority === 'urgent') return 'bg-red-100 text-red-700 border-red-300';
    if (priority === 'high') return 'bg-orange-100 text-orange-700 border-orange-300';
    if (priority === 'low') return 'bg-gray-100 text-gray-700 border-gray-300';
    return 'bg-blue-100 text-blue-700 border-blue-300';
  };

  const formatStatusLabel = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Loading tasks...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Tasks ({tasks.length})</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Assign Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingTask ? 'Edit Task' : 'Assign New Task'}</DialogTitle>
              <DialogDescription>
                {editingTask ? 'Update task details' : 'Create and assign a new task for this order'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Task Title (optional)</Label>
                <Input
                  id="title"
                  placeholder="e.g., Review Lab Dip"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Task description..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assignedTo">Assign To</Label>
                <Select value={formData.assignedTo} onValueChange={(value) => setFormData({ ...formData, assignedTo: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.fullName} ({user.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Saving...' : editingTask ? 'Update Task' : 'Create Task'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-3">No tasks assigned yet</p>
            <Button size="sm" variant="outline" onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Assign First Task
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div key={task.id} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(task.status)}
                    <h4 className="font-medium">{task.title}</h4>
                  </div>
                  <div className="flex items-center gap-1">
                    {task.status !== 'completed' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(task)}
                        title="Edit Task"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteTask(task.id)}
                      className="text-red-600 hover:text-red-700"
                      title="Delete Task"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                {task.description && (
                  <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                )}
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <Badge className={`${getStatusBadgeClass(task.status)} border`}>
                    {formatStatusLabel(task.status)}
                  </Badge>
                  <Badge className={`${getPriorityBadgeClass(task.priority)} border`}>
                    {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                  </Badge>
                  {task.dueDate && (
                    <span className="text-xs text-gray-500">
                      Due: {formatDate(task.dueDate)}
                    </span>
                  )}
                </div>
                {task.assignedToDetails && (
                  <p className="text-xs text-gray-600 mb-2">
                    Assigned to: <strong>{task.assignedToDetails.fullName}</strong> ({task.assignedToDetails.role})
                  </p>
                )}
                {task.assignedByDetails && (
                  <p className="text-xs text-gray-500">
                    Created by: {task.assignedByDetails.fullName}
                  </p>
                )}
                {task.status !== 'completed' && task.status !== 'cancelled' && (
                  <div className="flex gap-2 mt-3">
                    {task.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarkInProgress(task.id)}
                      >
                        Start Task
                      </Button>
                    )}
                    {task.status === 'in_progress' && (
                      <Button
                        size="sm"
                        onClick={() => handleMarkCompleted(task.id)}
                      >
                        <CheckCircle className="mr-2 h-3 w-3" />
                        Mark Complete
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
