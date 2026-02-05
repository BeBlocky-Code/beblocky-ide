"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { LoadingButton } from "@/components/ui/loading-button";

export function DialogExamples() {
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const [loadingDialogOpen, setLoadingDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirmAction = async () => {
    // Simulate async action
    await new Promise((resolve) => setTimeout(resolve, 2000));
  };

  const handleLoadingAction = async () => {
    setIsLoading(true);
    // Simulate async action
    await new Promise((resolve) => setTimeout(resolve, 3000));
    setIsLoading(false);
  };

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-lg font-semibold">Dialog Examples</h2>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setConfirmDialogOpen(true)}>
          Show Confirm Dialog
        </Button>

        <Button onClick={() => setErrorDialogOpen(true)} variant="destructive">
          Show Error Dialog
        </Button>

        <Button onClick={() => setSuccessDialogOpen(true)} variant="outline">
          Show Success Dialog
        </Button>

        <Button onClick={() => setInfoDialogOpen(true)} variant="secondary">
          Show Info Dialog
        </Button>

        <LoadingButton
          onClick={() => setLoadingDialogOpen(true)}
          loading={isLoading}
          loadingText="Processing..."
        >
          Show Loading Dialog
        </LoadingButton>
      </div>

      {/* Confirm Dialog */}
      <ConfirmationDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        type="confirm"
        title="Delete Item"
        description="Are you sure you want to delete this item? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmAction}
        destructive
      />

      {/* Error Dialog */}
      <ConfirmationDialog
        open={errorDialogOpen}
        onOpenChange={setErrorDialogOpen}
        type="error"
        title="Error Occurred"
        description="Something went wrong while processing your request. Please try again."
        confirmText="OK"
      />

      {/* Success Dialog */}
      <ConfirmationDialog
        open={successDialogOpen}
        onOpenChange={setSuccessDialogOpen}
        type="success"
        title="Success!"
        description="Your action was completed successfully."
        confirmText="Continue"
      />

      {/* Info Dialog */}
      <ConfirmationDialog
        open={infoDialogOpen}
        onOpenChange={setInfoDialogOpen}
        type="info"
        title="Information"
        description="This is an informational message. You can use this to provide helpful context to users."
        confirmText="Got it"
      />

      {/* Loading Dialog */}
      <ConfirmationDialog
        open={loadingDialogOpen}
        onOpenChange={setLoadingDialogOpen}
        type="confirm"
        title="Process Data"
        description="This will process a large amount of data. It may take a few minutes."
        confirmText="Process"
        cancelText="Cancel"
        onConfirm={handleLoadingAction}
        loading={isLoading}
      />
    </div>
  );
}
