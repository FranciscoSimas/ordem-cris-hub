import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface ImageCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  aspectRatio: number; // 9/16 para formato vertical
  onCropComplete: (croppedImageBlob: Blob) => void;
  cardWidth?: number; // Width of the card in pixels
  cardHeight?: number; // Height of the card in pixels
}

export function ImageCropDialog({ open, onOpenChange, imageSrc, aspectRatio, onCropComplete, cardWidth = 220, cardHeight = 390 }: ImageCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Calculate the image area size (card minus name area at bottom)
  // The name area is approximately 60px, so image area is cardHeight - 60
  const imageAreaHeight = cardHeight - 60;
  const imageAreaWidth = cardWidth;
  
  // Reset crop position when dialog opens
  useEffect(() => {
    if (open) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    }
  }, [open]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    
    // Calculate mouse position relative to container center
    const mouseX = e.clientX - rect.left - (rect.width / 2);
    const mouseY = e.clientY - rect.top - (rect.height / 2);
    
    setIsDragging(true);
    setDragStart({ 
      x: mouseX - crop.x, 
      y: mouseY - crop.y 
    });
  }, [crop]);

  // Global mouse move handler
  useEffect(() => {
    if (!isDragging || !imageRef.current || !containerRef.current) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!containerRef.current || !imageRef.current) return;
      
      const container = containerRef.current;
      const img = imageRef.current;
      const rect = container.getBoundingClientRect();
      
      // Calculate mouse position relative to container center
      const mouseX = e.clientX - rect.left - (rect.width / 2);
      const mouseY = e.clientY - rect.top - (rect.height / 2);
      
      // Calculate new crop position (relative to center)
      const newX = mouseX - dragStart.x;
      const newY = mouseY - dragStart.y;
      
      const containerWidth = imageAreaWidth;
      const containerHeight = imageAreaHeight;
      
      // Calculate scaled image dimensions based on object-fit: cover
      const imgAspect = img.naturalWidth / img.naturalHeight;
      const containerAspect = containerWidth / containerHeight;
      
      let scaledImgWidth, scaledImgHeight;
      
      if (imgAspect > containerAspect) {
        // Image is wider - fit to height, crop width
        scaledImgHeight = containerHeight * zoom;
        scaledImgWidth = scaledImgHeight * imgAspect;
      } else {
        // Image is taller - fit to width, crop height
        scaledImgWidth = containerWidth * zoom;
        scaledImgHeight = scaledImgWidth / imgAspect;
      }
      
      // Calculate max movement bounds (how much we can move from center)
      const maxX = Math.max(0, (scaledImgWidth - containerWidth) / 2);
      const maxY = Math.max(0, (scaledImgHeight - containerHeight) / 2);
      
      setCrop({
        x: Math.max(-maxX, Math.min(maxX, newX)),
        y: Math.max(-maxY, Math.min(maxY, newY)),
      });
    };

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, dragStart, zoom, imageAreaWidth, imageAreaHeight]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // This is handled by the global event listener
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleCrop = useCallback(() => {
    if (!imageRef.current || !containerRef.current) return;

    const img = imageRef.current;
    
    // Use exact card image area dimensions
    const containerWidth = imageAreaWidth;
    const containerHeight = imageAreaHeight;

    // The image is displayed at containerWidth x containerHeight with object-cover
    // We need to calculate what part of the natural image is visible
    const imgAspect = img.naturalWidth / img.naturalHeight;
    const containerAspect = containerWidth / containerHeight;
    
    let sourceWidth, sourceHeight, sourceX, sourceY;
    
    if (imgAspect > containerAspect) {
      // Image is wider - fit to height, crop width
      sourceHeight = img.naturalHeight;
      sourceWidth = sourceHeight * containerAspect;
      sourceX = (img.naturalWidth - sourceWidth) / 2;
      sourceY = 0;
    } else {
      // Image is taller - fit to width, crop height
      sourceWidth = img.naturalWidth;
      sourceHeight = sourceWidth / containerAspect;
      sourceX = 0;
      sourceY = (img.naturalHeight - sourceHeight) / 2;
    }
    
    // Apply zoom and crop offset
    const zoomedWidth = sourceWidth / zoom;
    const zoomedHeight = sourceHeight / zoom;
    
    // Calculate crop position accounting for zoom and user offset
    const offsetX = (-crop.x / containerWidth) * sourceWidth;
    const offsetY = (-crop.y / containerHeight) * sourceHeight;
    
    const finalX = Math.max(0, Math.min(img.naturalWidth - zoomedWidth, sourceX + offsetX));
    const finalY = Math.max(0, Math.min(img.naturalHeight - zoomedHeight, sourceY + offsetY));
    const finalWidth = Math.min(zoomedWidth, img.naturalWidth - finalX);
    const finalHeight = Math.min(zoomedHeight, img.naturalHeight - finalY);

    // Create canvas with exact card image area dimensions
    const canvas = document.createElement('canvas');
    canvas.width = imageAreaWidth;
    canvas.height = imageAreaHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    ctx.drawImage(
      img,
      finalX, finalY, finalWidth, finalHeight,
      0, 0, canvas.width, canvas.height
    );

    canvas.toBlob((blob) => {
      if (blob) {
        onCropComplete(blob);
        onOpenChange(false);
      }
    }, 'image/jpeg', 0.9);
  }, [crop, zoom, imageAreaWidth, imageAreaHeight, onCropComplete, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Recortar Imagem</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Preview Card - Shows exactly how it will look */}
          <div className="flex flex-col items-center gap-4">
            <div className="text-sm text-muted-foreground text-center">
              Preview: Como aparecerá no card
            </div>
            <div 
              className="relative bg-background border-2 rounded-lg overflow-hidden"
              style={{ 
                width: `${cardWidth}px`, 
                height: `${cardHeight}px`,
                borderColor: `hsl(var(--primary) / 0.3)`
              }}
            >
              {/* Image area - matches card exactly */}
              <div
                ref={containerRef}
                className="relative w-full overflow-hidden cursor-move"
                style={{ height: `${imageAreaHeight}px` }}
                onMouseDown={handleMouseDown}
              >
                <img
                  ref={imageRef}
                  src={imageSrc}
                  alt="Crop"
                  className="absolute select-none pointer-events-none"
                  style={{
                    width: `${imageAreaWidth}px`,
                    height: `${imageAreaHeight}px`,
                    objectFit: 'cover',
                    left: '50%',
                    top: '50%',
                    transform: `translate(calc(-50% + ${crop.x}px), calc(-50% + ${crop.y}px)) scale(${zoom})`,
                    transformOrigin: 'center center',
                  }}
                  draggable={false}
                />
                
                {/* Crop Overlay - shows exact crop area */}
                <div className="absolute inset-0 border-2 border-primary shadow-[0_0_0_9999px_rgba(0,0,0,0.3)] pointer-events-none" />
              </div>
              
              {/* Name area - matches card exactly */}
              <div 
                className="px-4 py-3 text-center border-t"
                style={{ 
                  borderColor: `hsl(var(--primary) / 0.3)`,
                  backgroundColor: `hsl(var(--primary) / 0.1)`,
                  height: `${cardHeight - imageAreaHeight}px`
                }}
              >
                <div className="font-display font-bold text-lg truncate" style={{ color: `hsl(var(--primary))` }}>
                  Preview
                </div>
              </div>
            </div>
          </div>
          
          {/* Instructions */}
          <div className="text-center text-sm text-muted-foreground">
            Arraste a imagem para posicionar • Use o zoom para ajustar
          </div>

          {/* Controls */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Zoom: {zoom.toFixed(1)}x</label>
              <Slider
                value={[zoom]}
                onValueChange={(value) => setZoom(value[0])}
                min={1}
                max={3}
                step={0.1}
                className="w-full"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCrop}>
                Confirmar Recorte
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
