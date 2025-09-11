import { useState } from 'react';
import { User, FolderOpen, Calendar, Image as ImageIcon, CheckCircle2, Clock, AlertCircle, XCircle, RefreshCw, MoreVertical, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DeleteConfirmationDialog } from '@/components/shared/delete-confirmation-dialog';
import { useUserProjects } from '@/lib/admin/user-project-hooks';
import { useDeleteProject } from '@/lib/admin/project-hooks';
import type { UserWithProjects } from '@/lib/admin/user-project-schemas';
import type { AdvancedDelete } from '@/lib/shared/schemas/delete-schemas';
import { toast } from 'sonner';

interface UserProjectsModalProps {
  user: UserWithProjects | null;
  isOpen: boolean;
  onClose: () => void;
}

export function UserProjectsModal({ user, isOpen, onClose }: UserProjectsModalProps) {
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  const { data, isLoading, error, refetch } = useUserProjects(user?.id || null);

  // Delete mutation
  const deleteMutation = useDeleteProject({
    onSuccess: (data, variables) => {
      const options = variables.options
      let message = 'Project deleted successfully'
      
      if (options.deleteVariants && options.deleteSourceFile) {
        message += ' - All images and files removed'
      } else if (options.deleteVariants) {
        message += ' - Images deleted, source files preserved'
      } else if (options.deleteSourceFile) {
        message += ' - Images moved to unassigned, files deleted'
      } else {
        message += ' - Images moved to unassigned, files preserved'
      }
      
      toast.success(message)
      setDeleteProjectId(null)
      refetch() // Refresh the user's projects list
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete project: ${error.message}`)
    }
  });

  const getStatusColor = (count: number, type: 'completed' | 'pending' | 'processing' | 'failed') => {
    if (count === 0) return 'text-muted-foreground';
    
    switch (type) {
      case 'completed':
        return 'text-green-600';
      case 'pending':
        return 'text-yellow-600';
      case 'processing':
        return 'text-blue-600';
      case 'failed':
        return 'text-red-600';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (type: 'completed' | 'pending' | 'processing' | 'failed') => {
    switch (type) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'processing':
        return <AlertCircle className="h-4 w-4" />;
      case 'failed':
        return <XCircle className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {user && (
              <>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.image || undefined} alt={user.name || user.email} />
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start">
                  <span className="text-lg font-semibold">
                    {user.name || user.email}
                  </span>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{user.email}</span>
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                      {user.role}
                    </Badge>
                    {user.suspended && (
                      <Badge variant="destructive">Suspended</Badge>
                    )}
                  </div>
                </div>
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {user && (
          <div className="space-y-6">
            {/* User Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{user.projectCount}</div>
                <div className="text-xs text-muted-foreground">Projects</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{user.totalImages}</div>
                <div className="text-xs text-muted-foreground">Total Images</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${getStatusColor(user.completedImages, 'completed')}`}>
                  {user.completedImages}
                </div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${getStatusColor(user.processingImages, 'processing')}`}>
                  {user.processingImages}
                </div>
                <div className="text-xs text-muted-foreground">Processing</div>
              </div>
            </div>

            {/* Projects List */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <FolderOpen className="h-5 w-5" />
                  Projects ({user.projectCount})
                </h3>
                {error && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => refetch()}
                    className="text-xs"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Retry
                  </Button>
                )}
              </div>

              {isLoading && (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                      <Skeleton className="h-12 w-12 rounded" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-[250px]" />
                        <Skeleton className="h-4 w-[200px]" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {error && (
                <div className="text-red-600 p-4 bg-red-50 rounded-md">
                  Error loading projects: {error.message}
                </div>
              )}

              {data && (
                <div className="space-y-3">
                  {data.projects.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No projects found for this user</p>
                    </div>
                  ) : (
                    data.projects.map((project) => (
                      <div key={project.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <FolderOpen className="h-4 w-4 text-primary" />
                              <h4 className="font-medium">{project.name}</h4>
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Created {new Date(project.createdAt).toLocaleDateString()}
                              </div>
                              <div className="flex items-center gap-1">
                                <ImageIcon className="h-3 w-3" />
                                {project.imageCount} images
                              </div>
                            </div>

                            {/* Project Status Breakdown */}
                            <div className="flex items-center gap-4 text-xs">
                              <div className={`flex items-center gap-1 ${getStatusColor(project.completedImages, 'completed')}`}>
                                {getStatusIcon('completed')}
                                {project.completedImages} completed
                              </div>
                              <div className={`flex items-center gap-1 ${getStatusColor(project.processingImages, 'processing')}`}>
                                {getStatusIcon('processing')}
                                {project.processingImages} processing
                              </div>
                              <div className={`flex items-center gap-1 ${getStatusColor(project.pendingImages, 'pending')}`}>
                                {getStatusIcon('pending')}
                                {project.pendingImages} pending
                              </div>
                              {project.failedImages > 0 && (
                                <div className={`flex items-center gap-1 ${getStatusColor(project.failedImages, 'failed')}`}>
                                  {getStatusIcon('failed')}
                                  {project.failedImages} failed
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Project Actions */}
                          <div className="ml-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem 
                                  onClick={() => setDeleteProjectId(project.id)}
                                  className="flex items-center gap-2 text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Delete Project
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Delete Confirmation Dialog */}
        <DeleteConfirmationDialog
          isOpen={!!deleteProjectId}
          onClose={() => setDeleteProjectId(null)}
          onConfirm={(options) => {
            if (deleteProjectId) {
              // Type guard ensures we have AdvancedDelete for admin context
              const adminOptions: AdvancedDelete = 'deleteVariants' in options 
                ? options // Already AdvancedDelete from admin context
                : { 
                    // Transform SimpleDelete to AdvancedDelete with sensible defaults
                    deleteVariants: false, 
                    deleteSourceImage: false,
                    deleteSourceFile: false, // Default to NOT deleting files
                    reason: options.reason 
                  }
              
              deleteMutation.mutate({ 
                id: deleteProjectId, 
                options: adminOptions 
              })
            }
          }}
          context="admin"
          title="Delete Project"
          description="Are you sure you want to delete this project? This action cannot be undone and will remove the project and all its associated images."
          itemName="this project"
          isLoading={deleteMutation.isPending}
        />
      </DialogContent>
    </Dialog>
  );
}