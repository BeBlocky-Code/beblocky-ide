"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Maximize, RefreshCw, Play } from "lucide-react";

export default function IdePreview({ mainCode }: { mainCode: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const buildSrcDoc = useCallback(() => {
    // Keep this minimal and deterministic.
    // We intentionally avoid allow-same-origin to prevent sandbox escape warnings.
    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Preview</title>
  </head>
  <body>
${mainCode ?? ""}
  </body>
</html>`;
  }, [mainCode]);

  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
    };
  }, []);

  const updateIframeContent = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    iframe.srcdoc = buildSrcDoc();
  }, [buildSrcDoc]);

  // Debounce iframe updates when code changes to avoid heavy DOM work on every keystroke
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const PREVIEW_DEBOUNCE_MS = 450;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      updateIframeContent();
    }, PREVIEW_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [updateIframeContent]);

  const refreshPreview = () => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
    setIsRefreshing(true);
    updateIframeContent();
    refreshTimeoutRef.current = setTimeout(() => {
      refreshTimeoutRef.current = null;
      setIsRefreshing(false);
    }, 500);
  };

  const openInNewTab = () => {
    const newTab = window.open("", "_blank");
    if (newTab) {
      newTab.document.write(mainCode);
      newTab.document.close();
    }
  };

  return (
    <Card className="h-full flex flex-col border rounded-xl overflow-hidden shadow-sm transition-all duration-300 ease-in-out">
      <CardHeader className="p-2.5 border-b flex-row items-center justify-between space-y-0 bg-muted/20 backdrop-blur-sm">
        <div className="flex items-center space-x-3">
          <div className="flex space-x-1.5 px-1">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400 shadow-sm"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 shadow-sm"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-green-400 shadow-sm"></div>
          </div>
          <div className="flex items-center gap-1.5 bg-background/50 px-3 py-1 rounded-md border border-border/50 shadow-inner">
            <Play size={12} className="text-primary" />
            <span className="text-xs font-semibold tracking-tight text-muted-foreground">Preview</span>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={refreshPreview}
            className={`h-8 w-8 ${isRefreshing ? "animate-spin" : ""}`}
          >
            <RefreshCw size={16} />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={openInNewTab}
            className="h-8 w-8"
          >
            <Maximize size={16} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden bg-white">
        <iframe
          ref={iframeRef}
          className="w-full h-full border-none"
          title="Code Preview"
          sandbox="allow-scripts"
        ></iframe>
      </CardContent>
    </Card>
  );
}
