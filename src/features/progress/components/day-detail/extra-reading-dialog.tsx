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

interface ExtraReadingDialogProps {
  /** The notice from extraReadingMessage, or null when closed. */
  message: string | null;
  /** True when accepting also moves the plan on from the logged chapter. */
  movesPlan: boolean;
  onAccept: () => void;
  onClose: () => void;
}

/**
 * Tells the reader a Custom log was recorded as an extra reading, and offers to make it
 * part of the plan instead. Same shape and button order as ContinueDialog: keeping
 * things as they are comes first.
 */
export function ExtraReadingDialog({
  message,
  movesPlan,
  onAccept,
  onClose,
}: ExtraReadingDialogProps) {
  return (
    <AlertDialog
      open={message !== null}
      onOpenChange={(open) => (open ? null : onClose())}
    >
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Logged as an extra reading</AlertDialogTitle>
          <AlertDialogDescription className="whitespace-pre-line">
            {message}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="keep-extra">
            Keep as extra
          </AlertDialogCancel>
          <AlertDialogAction onClick={onAccept} data-testid="count-toward-plan">
            {movesPlan ? "Move my plan" : "Count toward plan"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
