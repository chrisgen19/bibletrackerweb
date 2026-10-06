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

interface ContinueDialogProps {
  /** The question from continuationMessage, or null when closed. */
  message: string | null;
  onAccept: () => void;
  onClose: () => void;
}

/** "Continue from here?" with the iOS alert's copy and button order. */
export function ContinueDialog({
  message,
  onAccept,
  onClose,
}: ContinueDialogProps) {
  return (
    <AlertDialog
      open={message !== null}
      onOpenChange={(open) => (open ? null : onClose())}
    >
      {/* "sm" lays the two buttons side by side in DOM order: Cancel first, as on iOS. */}
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Continue from here?</AlertDialogTitle>
          <AlertDialogDescription className="whitespace-pre-line">
            {message}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep my plan</AlertDialogCancel>
          <AlertDialogAction onClick={onAccept}>
            Continue from here
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
