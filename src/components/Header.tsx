
import React from 'react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HelpCircle, Settings, Code } from "lucide-react";

const Header: React.FC = () => {
  return (
    <header className="w-full border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50 animate-slide-down">
      <div className="container flex items-center justify-between h-16 px-4 md:px-6">
        <div className="flex items-center gap-2">
          <div className="relative flex h-8 w-8 overflow-hidden rounded-full justify-center items-center bg-primary/10">
            <Code className="h-4 w-4 text-primary" />
          </div>
          <h1 className="text-xl font-medium">SCIM Magic Mapper</h1>
        </div>
        
        <div className="hidden md:flex">
          <Tabs defaultValue="mapper" className="w-full">
            <TabsList className="grid w-fit grid-cols-3">
              <TabsTrigger value="mapper" className="px-4">Mapper</TabsTrigger>
              <TabsTrigger value="test" className="px-4">Test</TabsTrigger>
              <TabsTrigger value="export" className="px-4">Export</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" aria-label="Help">
            <HelpCircle className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Settings">
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
