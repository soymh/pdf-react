import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from './ui/dialog';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Info } from 'lucide-react';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (includePDFs: boolean) => void;
  pdfCount: number;
}

export default function ExportDialog({ open, onOpenChange, onExport, pdfCount }: ExportDialogProps) {
  const [includePDFs, setIncludePDFs] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExport(includePDFs);
      onOpenChange(false);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-blue-500/30 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-blue-300">Export Workspaces</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="include-pdfs"
              checked={includePDFs}
              onCheckedChange={(checked) => setIncludePDFs(checked as boolean)}
              className="mt-1 border-blue-400/50 data-[state=checked]:bg-blue-500/20"
            />
            <div className="grid gap-1.5">
              <Label 
                htmlFor="include-pdfs" 
                className="text-sm font-medium text-blue-300 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Include PDF Files
              </Label>
              <p className="text-sm text-gray-400">
                Include {pdfCount} PDF file{pdfCount !== 1 ? 's' : ''} in the export for migration to another device
              </p>
            </div>
          </div>
          
          <Alert className="bg-blue-500/10 border-blue-500/30">
            <Info className="h-4 w-4 text-blue-400" />
            <AlertDescription className="text-blue-300 text-sm">
              {includePDFs 
                ? "Including PDF files will make the export larger but allows for complete migration." 
                : "Exporting without PDF files will require re-uploading PDFs on the new device."}
            </AlertDescription>
          </Alert>
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-gray-600 text-gray-300"
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="bg-blue-500/20 hover:bg-blue-500/30 border-blue-400/50 text-blue-300"
          >
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}