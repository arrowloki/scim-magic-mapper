
import React from 'react';
import { ApplicationConfig } from '@/models/ApplicationConfig';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Pencil, Trash, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ApplicationCardProps {
  application: ApplicationConfig;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  isActive: boolean;
}

const ApplicationCard: React.FC<ApplicationCardProps> = ({ 
  application, 
  onSelect, 
  onEdit, 
  onDelete,
  isActive
}) => {
  const { id, name, apiConfig, mappings, updatedAt } = application;
  const apiType = apiConfig.baseUrl.includes('dummyjson.com') 
    ? 'DummyJSON' 
    : apiConfig.baseUrl.includes('jsonplaceholder.typicode.com')
      ? 'JSONPlaceholder'
      : 'Custom API';

  return (
    <Card className={`w-full transition-all hover:shadow-md ${isActive ? 'border-primary' : ''}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex justify-between items-center">
          <span>{name}</span>
          {isActive && <span className="text-xs font-normal text-primary">Active</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="text-sm text-muted-foreground space-y-1">
          <div className="flex justify-between">
            <span>API Type:</span>
            <span>{apiType}</span>
          </div>
          <div className="flex justify-between">
            <span>Mappings:</span>
            <span>{mappings.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Last Updated:</span>
            <span>{formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between pt-2 border-t">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onEdit(id)}>
            <Pencil className="h-3.5 w-3.5 mr-1" />
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={() => onDelete(id)}>
            <Trash className="h-3.5 w-3.5 mr-1" />
            Delete
          </Button>
        </div>
        <Button size="sm" onClick={() => onSelect(id)}>
          Open
          <ArrowRight className="h-3.5 w-3.5 ml-1" />
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ApplicationCard;
