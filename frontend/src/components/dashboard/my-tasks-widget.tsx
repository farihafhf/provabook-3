'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';

interface Task {
  id: string;
  title: string;
  order: string;
  orderNumber: string;
  status: string;
  priority: string;
  dueDate?: string;
  assignedByDetails?: {
    fullName: string;
  };
}

export function MyTasksWidget() {
  const router = useRouter();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyTasks();
  }, []);

  const fetchMyTasks = async () => {
    try {
      const response = await api.get('/orders/tasks/');
      // Filter to get only tasks assigned to current user
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const myTasks = response.data.filter(
        (task: Task) => task.status !== 'completed' && task.status !== 'cancelled'
      );
      setTasks(myTasks.slice(0, 5)); // Show top 5 tasks
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkCompleted = async (taskId: string) => {
    try {
      await api.post(`/orders/tasks/${taskId}/mark-completed`);
      toast({
        title: 'Success',
        description: 'Task marked as completed',
      });
      await fetchMyTasks();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update task',
        variant: 'destructive',
      });
    }
  };

  const handleMarkInProgress = async (taskId: string) => {
    try {
      await api.post(`/orders/tasks/${taskId}/mark-in-progress`);
      toast({
        title: 'Success',
        description: 'Task marked as in progress',
      });
      await fetchMyTasks();
    } catch (error: any) {
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
    if (status === 'in_progress') return 'bg-blue-100 text-blue-700 border-blue-300';
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
          <CardTitle>My Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-sm">Loading tasks...</p>
        </CardContent>
      </Card>
    );
  }

  if (tasks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-sm text-center py-4">No pending tasks assigned to you</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Tasks ({tasks.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {tasks.map((task) => (
            <div 
              key={task.id} 
              className="border rounded-lg p-3 hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => router.push(`/orders/${task.order}`)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 flex-1">
                  {getStatusIcon(task.status)}
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{task.title}</h4>
                    <p className="text-xs text-gray-500">Order #{task.orderNumber}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <Badge className={`${getStatusBadgeClass(task.status)} border text-xs`}>
                  {formatStatusLabel(task.status)}
                </Badge>
                <Badge className={`${getPriorityBadgeClass(task.priority)} border text-xs`}>
                  {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                </Badge>
                {task.dueDate && (
                  <span className="text-xs text-gray-500">
                    Due: {formatDate(task.dueDate)}
                  </span>
                )}
              </div>
              {task.assignedByDetails && (
                <p className="text-xs text-gray-500 mb-2">
                  Assigned by: {task.assignedByDetails.fullName}
                </p>
              )}
              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                {task.status === 'pending' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7"
                    onClick={() => handleMarkInProgress(task.id)}
                  >
                    Start Task
                  </Button>
                )}
                {task.status === 'in_progress' && (
                  <Button
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => handleMarkCompleted(task.id)}
                  >
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Mark Complete
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
