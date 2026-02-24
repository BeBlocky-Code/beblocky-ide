"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, MessageSquare, Clock, ChevronLeft, X, Sparkles, Code, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "./context/theme-provider";

type Conversation = {
  _id: string;
  title: string;
  lastActivity: string;
  courseId: string;
  messages?: any[];
};

interface IdeConversationSidebarProps {
  conversations: Conversation[];
  selectedConversationId: string;
  isLoading: boolean;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onConversationSelect: (conversationId: string) => void;
  onNewConversation: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function IdeConversationSidebar({
  conversations,
  selectedConversationId,
  isLoading,
  activeTab,
  onTabChange,
  onConversationSelect,
  onNewConversation,
  isOpen,
  onClose,
}: IdeConversationSidebarProps) {
  const { theme } = useTheme();
  const accentColor = theme === "dark" ? "#892FFF" : "#FF932C";

  const formatLastActivity = (lastActivity: string) => {
    const date = new Date(lastActivity);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return "Just now";
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 168) {
      // 7 days
      return `${Math.floor(diffInHours / 24)}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-background/40 backdrop-blur-sm z-[60] lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed lg:absolute inset-y-0 left-0 z-[70] bg-card/95 dark:bg-slate-900/95 backdrop-blur-xl border border-border/40 transform transition-all duration-500 ease-in-out shadow-2xl lg:m-2 lg:rounded-xl",
          // Mobile: slide in/out; Desktop: collapse width
          isOpen
            ? "translate-x-0 w-80 lg:w-80 opacity-100"
            : "-translate-x-full lg:translate-x-0 w-0 lg:w-0 border-transparent overflow-hidden opacity-0 pointer-events-none"
        )}
      >
        <div
          className={cn(
            "flex flex-col h-full transition-opacity duration-300",
            !isOpen ? "opacity-0" : "opacity-100"
          )}
        >
          {/* Header */}
          <div className="p-4 border-b border-border/40 bg-muted/5 space-y-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="rounded-full hover:bg-muted/50 transition-colors h-8 w-8"
              >
                <ChevronLeft size={18} />
              </Button>
              <h3 className="text-lg font-black tracking-tight text-foreground">
                AI Utility
              </h3>
            </div>

            {/* Mode Switcher Tabs */}
            <Tabs
              value={activeTab}
              onValueChange={onTabChange}
              className="w-full"
            >
              <TabsList className="grid grid-cols-2 h-10 bg-background/50 border rounded-full p-1 gap-1 border-border/40 shadow-inner">
                <TabsTrigger
                  value="chat"
                  className="text-[10px] font-black rounded-full data-[state=active]:text-white transition-all duration-300 px-2 data-[state=active]:shadow-md"
                  style={{ backgroundColor: activeTab === "chat" ? accentColor : "transparent" }}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <MessageCircle size={14} />
                    <span className="tracking-tight uppercase">Chat</span>
                  </div>
                </TabsTrigger>
                <TabsTrigger
                  value="analysis"
                  className="text-[10px] font-black rounded-full data-[state=active]:text-white transition-all duration-300 px-2 data-[state=active]:shadow-md"
                  style={{ backgroundColor: activeTab === "analysis" ? accentColor : "transparent" }}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <Code size={14} />
                    <span className="tracking-tight uppercase">Tools</span>
                  </div>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {activeTab === "chat" && (
              <div className="pt-2">
                <Button
                  onClick={onNewConversation}
                  disabled={isLoading}
                  className="w-full rounded-full font-black text-xs h-10 shadow-md transition-all hover:scale-[1.02] active:scale-95 border-0 text-white"
                  style={{ backgroundColor: accentColor }}
                >
                  <Plus size={16} className="mr-2" />
                  New Conversation
                </Button>
              </div>
            )}
          </div>

          {/* Sidebar Content based on Active Tab */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {activeTab === "chat" ? (
              <>
                <div className="px-5 pt-4 flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/30 border border-border/20">
                    <Sparkles size={12} className="text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                      {conversations.length} {conversations.length === 1 ? "Session" : "Sessions"}
                    </span>
                  </div>
                </div>

                <ScrollArea className="flex-1 px-3 py-2">
                  {isLoading ? (
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className="p-4 rounded-3xl bg-muted/20 animate-pulse border border-border/10"
                        >
                          <div className="h-4 bg-muted/40 rounded-full w-3/4 mb-3"></div>
                          <div className="h-3 bg-muted/40 rounded-full w-1/2"></div>
                        </div>
                      ))}
                    </div>
                  ) : conversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-center px-4">
                      <div className="w-16 h-16 rounded-[2rem] bg-muted/20 flex items-center justify-center mb-4">
                        <MessageSquare size={32} className="text-muted-foreground/40" />
                      </div>
                      <p className="text-sm font-black text-foreground mb-1">
                        Nothing here yet
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Start a conversation with AI to see it in your history.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 pb-6 pt-2">
                      {conversations.map((conversation) => {
                        const isActive = selectedConversationId === conversation._id;
                        return (
                          <button
                            key={conversation._id}
                            onClick={() => onConversationSelect(conversation._id)}
                            className={cn(
                              "w-full p-4 rounded-[1.5rem] text-left transition-all duration-300 group relative overflow-hidden border",
                              isActive
                                ? "bg-muted/10 border-border/60 shadow-sm"
                                : "bg-transparent border-transparent hover:bg-muted/10 hover:border-border/20"
                            )}
                          >
                            {isActive && (
                              <div 
                                className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full"
                                style={{ backgroundColor: accentColor }}
                              />
                            )}
                            
                            <div className="flex items-start justify-between gap-3 relative z-10">
                              <div className="flex-1 min-w-0">
                                <h4 className={cn(
                                  "text-sm tracking-tight truncate mb-1.5",
                                  isActive ? "font-black text-foreground" : "font-bold text-muted-foreground group-hover:text-foreground"
                                )}>
                                  {conversation.title || "Untitled Chat"}
                                </h4>
                                <div className="flex items-center gap-2">
                                  <Clock
                                    size={12}
                                    className="text-muted-foreground/60 flex-shrink-0"
                                  />
                                  <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                                    {formatLastActivity(conversation.lastActivity)}
                                  </span>
                                </div>
                              </div>
                              {conversation.messages &&
                                conversation.messages.length > 0 && (
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] font-black h-5 px-1.5 rounded-full bg-muted/30 text-muted-foreground border-border/10"
                                  >
                                    {conversation.messages.length}
                                  </Badge>
                                )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-20 h-20 rounded-[2.5rem] bg-muted/20 flex items-center justify-center mb-6">
                  <Code size={40} className="text-muted-foreground/30" />
                </div>
                <h4 className="text-base font-black text-foreground mb-2">Code Analysis Mode</h4>
                <p className="text-sm text-muted-foreground leading-relaxed italic">
                  "Use the Code Lens to inspect your work, find bugs, and get instant feedback."
                </p>
                <div className="mt-8 space-y-4 w-full">
                  <div className="p-4 rounded-3xl bg-muted/10 border border-border/10 text-left">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Pro-Tip</span>
                    </div>
                    <p className="text-xs text-muted-foreground/80 leading-relaxed font-bold">
                      Click the 'Analyze' button in the main panel to start a scan.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
