import { Loader2 } from "lucide-react";
import React from "react";
import { SourceImage } from "./types";

interface GeneratingViewProps {
  sourceImage: SourceImage;
}

export function GeneratingView({ sourceImage }: GeneratingViewProps) {
  const originalImageUrl = `/api/files/${sourceImage.originalImagePath.split('/').pop()?.split('.')[0]}`;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8">
      <div className="relative overflow-hidden rounded-xl shadow-lg border border-border">
        <img
          src={originalImageUrl}
          alt={sourceImage.displayName || sourceImage.originalFileName}
          className="w-full h-96 object-cover blur-lg"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
      </div>
      <div className="flex flex-col items-center justify-center h-96">
        <Loader2 className="w-12 h-12 animate-spin text-accent mb-4" />
        <h3 className="text-xl font-semibold text-foreground">Staging your space...</h3>
        <p className="text-muted-foreground mt-2">This may take a moment. Please don't close this window.</p>
      </div>
    </div>
  );
}