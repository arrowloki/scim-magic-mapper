
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { History, Trash2, RefreshCw, RotateCw, ArrowRight, Info } from "lucide-react";
import { apiService, APIHistory } from '@/utils/apiService';
import { format } from 'date-fns';
import { toast } from "sonner";
import RequestDetailDialog from './RequestDetailDialog';

const APIHistoryComponent: React.FC = () => {
  const [history, setHistory] = useState<APIHistory[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<APIHistory | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const loadHistory = () => {
    setHistory(apiService.getHistory());
  };
  
  useEffect(() => {
    loadHistory();
    // Refresh history every 10 seconds
    const interval = setInterval(loadHistory, 10000);
    return () => clearInterval(interval);
  }, []);
  
  const handleRefresh = () => {
    setIsRefreshing(true);
    loadHistory();
    setTimeout(() => setIsRefreshing(false), 500);
  };
  
  const handleClear = () => {
    apiService.clearHistory();
    loadHistory();
    toast.success('History cleared', {
      description: 'API request history has been cleared.',
    });
  };
  
  const handleRowClick = (item: APIHistory) => {
    setSelectedItem(item);
    setDialogOpen(true);
  };
  
  // Format the timestamp to a readable date
  const formatTimestamp = (timestamp: number) => {
    return format(new Date(timestamp), 'MMM d, yyyy HH:mm:ss');
  };
  
  // Format the duration to ms
  const formatDuration = (duration: number) => {
    return `${Math.round(duration)}ms`;
  };
  
  return (
    <>
      <Card className="w-full shadow-card animate-scale-in">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              <span>API Request History</span>
            </CardTitle>
            <CardDescription>
              Recent API requests and their results
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              className="h-8 w-8 transition-all-200"
            >
              {isRefreshing ? (
                <RotateCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleClear}
              className="h-8 w-8 transition-all-200"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {history.length > 0 ? (
            <ScrollArea className="h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Endpoint</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((item, index) => (
                    <TableRow 
                      key={index} 
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleRowClick(item)}
                    >
                      <TableCell className="font-mono text-xs">
                        {formatTimestamp(item.timestamp)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.method === 'GET' ? 'outline' : 'default'} className={
                          item.method === 'POST' ? 'bg-green-500 hover:bg-green-600' :
                          item.method === 'PUT' ? 'bg-amber-500 hover:bg-amber-600' :
                          item.method === 'DELETE' ? 'bg-red-500 hover:bg-red-600' : ''
                        }>
                          {item.method}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs max-w-40 truncate">
                        {item.endpoint}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          item.status >= 200 && item.status < 300 ? 'outline' :
                          item.status >= 400 ? 'destructive' : 'secondary'
                        }>
                          {item.status > 0 ? item.status : 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDuration(item.duration)}</TableCell>
                      <TableCell>
                        <Badge variant={item.success ? 'secondary' : 'destructive'}>
                          {item.success ? 'Success' : 'Failed'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <div className="py-6 text-center text-muted-foreground">
              No API requests recorded yet.
            </div>
          )}
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Info className="h-3 w-3" />
            <span>Click on any request to view details. History is limited to the last 50 requests.</span>
          </div>
        </CardFooter>
      </Card>
      
      <RequestDetailDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
        historyItem={selectedItem} 
      />
    </>
  );
};

export default APIHistoryComponent;
