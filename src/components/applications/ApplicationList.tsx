
import React, { useState } from 'react';
import { useApplications } from '@/contexts/ApplicationContext';
import ApplicationCard from './ApplicationCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const ApplicationList: React.FC = () => {
  const { 
    applications, 
    activeApplicationId, 
    addApplication, 
    deleteApplication,
    setActiveApplication 
  } = useApplications();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newAppName, setNewAppName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [appToDelete, setAppToDelete] = useState<string | null>(null);

  const handleAddApplication = () => {
    if (newAppName.trim()) {
      addApplication(newAppName.trim());
      setNewAppName('');
      setIsDialogOpen(false);
    }
  };

  const handleDeleteConfirm = () => {
    if (appToDelete) {
      deleteApplication(appToDelete);
      setAppToDelete(null);
    }
  };

  const handleSelectApplication = (id: string) => {
    console.log("Selecting application:", id);
    setActiveApplication(id);
  };

  const filteredApplications = searchTerm 
    ? applications.filter(app => 
        app.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : applications;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="relative w-full md:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search applications..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Application
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Application</DialogTitle>
              <DialogDescription>
                Enter a name for your new application. You can configure it later.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input 
                placeholder="Application name" 
                value={newAppName}
                onChange={(e) => setNewAppName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddApplication();
                }}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddApplication} disabled={!newAppName.trim()}>
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {applications.length === 0 ? (
        <div className="bg-muted/30 rounded-lg border border-border p-6 text-center">
          <h3 className="text-lg font-medium mb-2">No Applications</h3>
          <p className="text-muted-foreground mb-4">
            Get started by creating your first application.
          </p>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Application
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredApplications.map(app => (
            <ApplicationCard
              key={app.id}
              application={app}
              isActive={app.id === activeApplicationId}
              onSelect={handleSelectApplication}
              onEdit={handleSelectApplication}
              onDelete={(id) => setAppToDelete(id)}
            />
          ))}
        </div>
      )}

      <AlertDialog open={!!appToDelete} onOpenChange={(open) => !open && setAppToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Application</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this application
              and all associated configurations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ApplicationList;
