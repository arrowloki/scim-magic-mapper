
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, MoveUpRight, MoveDownRight, Clock, AlertCircle, CheckCircle } from "lucide-react";
import RequestDetailDialog from './RequestDetailDialog';
import { useQuery } from '@tanstack/react-query';
import { apiService, APIHistory as APIHistoryType } from '@/utils/apiService';

// Define the interfaces that were missing
interface RequestDetailsItem {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: any;
  status?: number;
  statusText?: string;
  responseData?: any;
  responseHeaders?: Record<string, string>;
  timestamp: number;
}

interface DataItem {
  id: string;
  type: 'request' | 'response' | 'error';
  timestamp: number;
  details: RequestDetailsItem;
}

interface APIHistoryProps {
  applicationId: string;
}

const APIHistory: React.FC<APIHistoryProps> = ({ applicationId }) => {
  const [selectedItem, setSelectedItem] = useState<DataItem | null>(null);
  const [apiHistoryData, setApiHistoryData] = useState<APIHistoryType[]>([]);
  
  // Fetch history data from the apiService
  useEffect(() => {
    const historyData = apiService.getHistory(applicationId);
    setApiHistoryData(historyData);
  }, [applicationId]);

  // Create a mapping function to convert between the DataItem and APIHistoryType
  const mapToAPIHistory = (item: DataItem): APIHistoryType => {
    return {
      timestamp: item.details.timestamp,
      method: item.details.method,
      endpoint: '', // Required property for APIHistory
      baseUrl: item.details.url,
      status: item.details.status || 0,
      duration: 0, // Required property for APIHistory
      success: item.details.status ? item.details.status >= 200 && item.details.status < 300 : false, // Required property for APIHistory
      requestData: item.details.body,
      responseData: item.details.responseData,
      requestHeaders: item.details.headers,
      responseHeaders: item.details.responseHeaders || {},
      applicationId: applicationId
    };
  };
  
  // In a real implementation, we would fetch history from a service or context
  // For now, just display a placeholder
  return (
    <Card>
      <CardHeader>
        <CardTitle>API Request History</CardTitle>
        <CardDescription>View your recent API requests and responses</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="requests">Requests</TabsTrigger>
            <TabsTrigger value="errors">Errors</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="space-y-4">
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>No requests have been made yet.</p>
              <p className="text-sm">API requests will appear here once you start testing.</p>
            </div>
          </TabsContent>
          
          <TabsContent value="requests" className="space-y-4">
            <div className="text-center py-8 text-muted-foreground">
              <MoveUpRight className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>No requests found.</p>
            </div>
          </TabsContent>
          
          <TabsContent value="errors" className="space-y-4">
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>No errors found.</p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      {selectedItem && (
        <RequestDetailDialog 
          open={!!selectedItem}
          onOpenChange={() => setSelectedItem(null)}
          historyItem={mapToAPIHistory(selectedItem)}
        />
      )}
    </Card>
  );
};

export default APIHistory;
