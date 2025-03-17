
import React from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { APIHistory } from '@/utils/apiService';
import { Copy, Check, ArrowRight, AlertTriangle, Clock, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from 'date-fns';

interface RequestDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  historyItem: APIHistory | null;
}

const RequestDetailDialog: React.FC<RequestDetailDialogProps> = ({ open, onOpenChange, historyItem }) => {
  const [isCopied, setIsCopied] = React.useState<{[key: string]: boolean}>({});

  if (!historyItem) return null;

  const formatTimestamp = (timestamp: number) => {
    return format(new Date(timestamp), 'MMM d, yyyy HH:mm:ss');
  };

  const formatDuration = (duration: number) => {
    return `${Math.round(duration)}ms`;
  };

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setIsCopied({...isCopied, [section]: true});
        toast.success('Copied to clipboard');
        setTimeout(() => {
          setIsCopied({...isCopied, [section]: false});
        }, 2000);
      })
      .catch((err) => {
        console.error('Failed to copy text: ', err);
        toast.error('Failed to copy');
      });
  };

  // Format the URL with baseUrl and endpoint
  const getFullUrl = () => {
    let baseUrl = historyItem.baseUrl || '';
    const endpoint = historyItem.endpoint || '';
    
    // Ensure there's no double slash between baseUrl and endpoint
    if (baseUrl && baseUrl.endsWith('/') && endpoint.startsWith('/')) {
      return baseUrl + endpoint.substring(1);
    }
    
    // Ensure there's at least one slash between baseUrl and endpoint
    if (baseUrl && !baseUrl.endsWith('/') && !endpoint.startsWith('/')) {
      return `${baseUrl}/${endpoint}`;
    }
    
    return baseUrl + endpoint;
  };

  // Prepare response and request data for display
  const responseData = historyItem.responseData ? 
    (typeof historyItem.responseData === 'string' ? 
      historyItem.responseData : JSON.stringify(historyItem.responseData, null, 2)) : 
    'No response data';

  const requestData = historyItem.requestData ? 
    (typeof historyItem.requestData === 'string' ? 
      historyItem.requestData : JSON.stringify(historyItem.requestData, null, 2)) : 
    'No request data';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className={`px-2 py-1 text-xs font-mono rounded ${historyItem.method === 'GET' ? 'bg-blue-100 text-blue-800' : 
              historyItem.method === 'POST' ? 'bg-green-100 text-green-800' : 
              historyItem.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' : 
              historyItem.method === 'DELETE' ? 'bg-red-100 text-red-800' : 
              'bg-gray-100 text-gray-800'}`}>
              {historyItem.method}
            </span>
            <span className="font-mono text-sm truncate">
              {getFullUrl()}
            </span>
          </DialogTitle>
          <DialogDescription className="flex flex-wrap gap-3 pt-2">
            <div className="flex items-center gap-1 text-xs">
              <Clock className="h-3 w-3" />
              <span>{formatTimestamp(historyItem.timestamp)}</span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <Clock className="h-3 w-3" />
              <span>Duration: {formatDuration(historyItem.duration)}</span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              {historyItem.success ? 
                <CheckCircle className="h-3 w-3 text-green-500" /> : 
                <AlertTriangle className="h-3 w-3 text-amber-500" />}
              <span>Status: {historyItem.status || 'Unknown'}</span>
            </div>
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="response" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="request">Request</TabsTrigger>
            <TabsTrigger value="response">Response</TabsTrigger>
            <TabsTrigger value="headers">Headers</TabsTrigger>
          </TabsList>

          <TabsContent value="request" className="flex-1 overflow-hidden flex flex-col space-y-4 pt-4">
            <div className="space-y-1">
              <h4 className="text-sm font-medium">Request URL</h4>
              <div className="bg-muted/50 p-2 rounded-md font-mono text-xs flex items-center justify-between">
                <div className="truncate">{getFullUrl()}</div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 ml-2"
                  onClick={() => copyToClipboard(getFullUrl(), 'url')}
                >
                  {isCopied['url'] ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
            </div>

            <Separator />

            <div className="space-y-1 flex-1 overflow-hidden">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-medium">Request Body</h4>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7"
                  onClick={() => copyToClipboard(requestData, 'request')}
                >
                  {isCopied['request'] ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                  Copy
                </Button>
              </div>
              <div className="bg-muted/50 rounded-md relative overflow-hidden flex-1">
                <ScrollArea className="h-[calc(100vh-20rem)] pb-4">
                  <pre className="p-4 text-xs">{requestData}</pre>
                </ScrollArea>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="response" className="flex-1 overflow-hidden flex flex-col space-y-4 pt-4">
            <div className="space-y-1">
              <h4 className="text-sm font-medium">Status</h4>
              <div className="flex items-center gap-2">
                <div className={`px-2 py-1 text-xs font-medium rounded-full ${
                  historyItem.status >= 200 && historyItem.status < 300 ? 'bg-green-100 text-green-800' :
                  historyItem.status >= 400 ? 'bg-red-100 text-red-800' :
                  historyItem.status >= 300 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {historyItem.status || 'Unknown'}
                </div>
                <span className="text-sm text-muted-foreground">
                  {historyItem.status >= 200 && historyItem.status < 300 ? 'Success' :
                   historyItem.status >= 400 ? 'Client Error' :
                   historyItem.status >= 300 ? 'Redirection' :
                   'Unknown Status'}
                </span>
              </div>
            </div>

            <Separator />

            <div className="space-y-1 flex-1 overflow-hidden">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-medium">Response Body</h4>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7"
                  onClick={() => copyToClipboard(responseData, 'response')}
                >
                  {isCopied['response'] ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                  Copy
                </Button>
              </div>
              <div className="bg-muted/50 rounded-md relative overflow-hidden flex-1">
                <ScrollArea className="h-[calc(100vh-20rem)] pb-4">
                  <pre className="p-4 text-xs">{responseData}</pre>
                </ScrollArea>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="headers" className="flex-1 overflow-hidden flex flex-col space-y-4 pt-4">
            <div className="space-y-1">
              <h4 className="text-sm font-medium">Request Headers</h4>
              <div className="bg-muted/50 p-4 rounded-md font-mono text-xs">
                {historyItem.requestHeaders ? (
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(historyItem.requestHeaders).map(([key, value]) => (
                      <React.Fragment key={key}>
                        <div className="font-semibold">{key}:</div>
                        <div className="truncate">{String(value)}</div>
                      </React.Fragment>
                    ))}
                  </div>
                ) : (
                  <p>No request headers recorded</p>
                )}
              </div>
            </div>

            <Separator />

            <div className="space-y-1">
              <h4 className="text-sm font-medium">Response Headers</h4>
              <div className="bg-muted/50 p-4 rounded-md font-mono text-xs">
                {historyItem.responseHeaders ? (
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(historyItem.responseHeaders).map(([key, value]) => (
                      <React.Fragment key={key}>
                        <div className="font-semibold">{key}:</div>
                        <div className="truncate">{String(value)}</div>
                      </React.Fragment>
                    ))}
                  </div>
                ) : (
                  <p>No response headers recorded</p>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RequestDetailDialog;
