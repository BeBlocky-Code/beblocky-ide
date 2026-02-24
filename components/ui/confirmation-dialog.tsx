"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type DialogType = "confirm" | "error" | "success" | "info";

export interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: DialogType;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
  destructive?: boolean;
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  type,
  title,
  description,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  loading = false,
  destructive = false,
}: ConfirmationDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    if (onConfirm) {
      setIsLoading(true);
      try {
        await onConfirm();
      } finally {
        setIsLoading(false);
      }
    }
    onOpenChange(false);
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  const getIcon = () => {
    switch (type) {
      case "confirm":
        return <AlertTriangle className="h-6 w-6 text-yellow-500" />;
      case "error":
        return <XCircle className="h-6 w-6 text-red-500" />;
      case "success":
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case "info":
        return <Info className="h-6 w-6 text-blue-500" />;
      default:
        return null;
    }
  };

  const getDefaultTexts = () => {
    switch (type) {
      case "confirm":
        return {
          confirm: confirmText || "Confirm",
          cancel: cancelText || "Cancel",
        };
      case "error":
        return {
          confirm: confirmText || "OK",
          cancel: cancelText || "Cancel",
        };
      case "success":
        return {
          confirm: confirmText || "OK",
          cancel: cancelText || "Close",
        };
      case "info":
        return {
          confirm: confirmText || "OK",
          cancel: cancelText || "Cancel",
        };
      default:
        return {
          confirm: confirmText || "OK",
          cancel: cancelText || "Cancel",
        };
    }
  };

  const { confirm, cancel } = getDefaultTexts();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader className="flex flex-row items-start gap-3">
          {getIcon()}
          <div className="flex-1">
            <DialogTitle className="text-left">{title}</DialogTitle>
            {description && (
              <DialogDescription className="text-left mt-2">
                {description}
              </DialogDescription>
            )}
          </div>
        </DialogHeader>
        <DialogFooter className="flex gap-2">
          {type === "confirm" && (
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={loading || isLoading}
            >
              {cancel}
            </Button>
          )}
          <Button
            onClick={handleConfirm}
            disabled={loading || isLoading}
            variant={destructive ? "destructive" : "brand"}
            className={cn(
              "rounded-full px-6",
              (loading || isLoading) && "opacity-50 cursor-not-allowed"
            )}
          >
            {loading || isLoading ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                {type === "confirm" ? "Confirming..." : "Loading..."}
              </div>
            ) : (
              confirm
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
