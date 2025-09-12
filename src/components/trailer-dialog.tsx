
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface TrailerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trailerUrl: string;
  title: string;
}

export function TrailerDialog({
  open,
  onOpenChange,
  trailerUrl,
  title,
}: TrailerDialogProps) {

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle>{title} - Trailer</DialogTitle>
        </DialogHeader>
        <div className="aspect-video">
          <iframe
            width="100%"
            height="100%"
            src={trailerUrl}
            title={`${title} trailer`}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          ></iframe>
        </div>
      </DialogContent>
    </Dialog>
  );
}
