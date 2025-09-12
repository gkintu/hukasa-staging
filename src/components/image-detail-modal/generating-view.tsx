import { Loader2 } from "lucide-react";
import React from "react";
import { SourceImage } from "./types";

interface GeneratingViewProps {
  sourceImage: SourceImage;
}

export function GeneratingView({ sourceImage }: GeneratingViewProps) {
  const originalImageUrl = `/api/images/${sourceImage.id}/file`;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8">
      <div className="relative overflow-hidden rounded-xl shadow-lg border border-border">
        <img
          src={originalImageUrl}
          alt={sourceImage.displayName || sourceImage.originalFileName}
          className="w-full h-96 object-cover blur-sm"
        />
        <div className="absolute inset-0 bg-black/40" />
        {/* Spinner overlay on the image */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Loader2 className="w-12 h-12 animate-spin text-white mb-4" />
          <h3 className="text-xl font-semibold text-white text-center px-4">Staging your space...</h3>
          <p className="text-white/80 mt-2 text-center px-4">Please wait.</p>
        </div>
      </div>
      <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
        <p className="text-center">Your AI-staged result will appear here shortly.</p>
      </div>
    </div>
  );
}