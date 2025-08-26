import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Progress } from './ui/progress';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Zap, Cpu, Monitor, Sparkles, X, CheckCircle, AlertCircle } from 'lucide-react';
import { upscalingService, UpscalingOptions, UpscalingProgress } from './UpscalingService';
import { toast } from 'sonner@2.0.3';

interface UpscalingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSource: HTMLImageElement | string | null;
  onUpscaleComplete: (upscaledImageURL: string) => void;
  title?: string;
}

export default function UpscalingDialog({
  open,
  onOpenChange,
  imageSource,
  onUpscaleComplete,
  title = "AI Image Upscaling"
}: UpscalingDialogProps) {
  const [selectedModel, setSelectedModel] = useState<UpscalingOptions['model']>('general');
  const [selectedBackend, setSelectedBackend] = useState<UpscalingOptions['backend']>('webgl');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<UpscalingProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const models = upscalingService.constructor.getAvailableModels();
  const backends = upscalingService.constructor.getAvailableBackends();

  const selectedModelInfo = models.find(m => m.id === selectedModel);
  const selectedBackendInfo = backends.find(b => b.id === selectedBackend);

  const handleUpscale = async () => {
    if (!imageSource) {
      toast.error('No image selected for upscaling');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProgress(null);

    try {
      const options: UpscalingOptions = {
        model: selectedModel,
        backend: selectedBackend,
        factor: selectedModelInfo?.factor || 4
      };

      const upscaledImageURL = await upscalingService.upscaleImage(
        imageSource,
        options,
        (progressData) => {
          setProgress(progressData);
        }
      );

      onUpscaleComplete(upscaledImageURL);
      onOpenChange(false);
      toast.success('Image upscaled successfully!');
      
    } catch (error) {
      console.error('Upscaling error:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
      toast.error('Failed to upscale image');
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      onOpenChange(false);
      setError(null);
      setProgress(null);
    }
  };

  const getBackendIcon = (backendId: string) => {
    switch (backendId) {
      case 'webgpu': return <Zap className="w-4 h-4 text-yellow-400" />;
      case 'webgl': return <Monitor className="w-4 h-4 text-blue-400" />;
      case 'cpu': return <Cpu className="w-4 h-4 text-gray-400" />;
      default: return <Monitor className="w-4 h-4" />;
    }
  };

  const getModelIcon = (modelId: string) => {
    if (modelId.includes('anime')) {
      return <Sparkles className="w-4 h-4 text-pink-400" />;
    }
    return <Zap className="w-4 h-4 text-cyan-400" />;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl bg-gray-900 border-cyan-500/30 text-white">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-cyan-300 flex items-center">
              <Sparkles className="w-5 h-5 mr-2" />
              {title}
            </DialogTitle>
            {!isProcessing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Model Selection */}
          <Card className="p-4 bg-gray-800/50 border-purple-500/30">
            <h3 className="text-lg font-semibold text-purple-300 mb-3 flex items-center">
              <Sparkles className="w-5 h-5 mr-2" />
              AI Model Selection
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Upscaling Model</label>
                <Select value={selectedModel} onValueChange={setSelectedModel} disabled={isProcessing}>
                  <SelectTrigger className="bg-gray-800 border-gray-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {models.map((model) => (
                      <SelectItem key={model.id} value={model.id} className="text-white">
                        <div className="flex items-center space-x-2">
                          {getModelIcon(model.id)}
                          <span>{model.name}</span>
                          <Badge variant="outline" className="ml-2 text-xs">
                            {model.factor}x
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedModelInfo && (
                  <p className="text-xs text-gray-500 mt-1">{selectedModelInfo.description}</p>
                )}
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-2 block">Processing Backend</label>
                <Select value={selectedBackend} onValueChange={setSelectedBackend} disabled={isProcessing}>
                  <SelectTrigger className="bg-gray-800 border-gray-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {backends.map((backend) => (
                      <SelectItem key={backend.id} value={backend.id} className="text-white">
                        <div className="flex items-center space-x-2">
                          {getBackendIcon(backend.id)}
                          <span>{backend.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedBackendInfo && (
                  <p className="text-xs text-gray-500 mt-1">{selectedBackendInfo.description}</p>
                )}
              </div>
            </div>
          </Card>

          {/* Processing Status */}
          {(isProcessing || progress || error) && (
            <Card className="p-4 bg-gray-800/50 border-cyan-500/30">
              <h3 className="text-lg font-semibold text-cyan-300 mb-3 flex items-center">
                {isProcessing ? (
                  <div className="animate-spin w-5 h-5 mr-2 border-2 border-cyan-400 border-t-transparent rounded-full" />
                ) : error ? (
                  <AlertCircle className="w-5 h-5 mr-2 text-red-400" />
                ) : (
                  <CheckCircle className="w-5 h-5 mr-2 text-green-400" />
                )}
                Processing Status
              </h3>

              {progress && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-300">{progress.info}</span>
                    <span className="text-cyan-300">{Math.round(progress.progress)}%</span>
                  </div>
                  <Progress 
                    value={progress.progress} 
                    className="h-2 bg-gray-700"
                  />
                </div>
              )}

              {error && (
                <div className="text-red-300 text-sm bg-red-500/10 border border-red-500/30 rounded p-3">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>Error: {error}</span>
                  </div>
                </div>
              )}

              {isProcessing && !progress && (
                <div className="text-cyan-300 text-sm">
                  Initializing AI model...
                </div>
              )}
            </Card>
          )}

          {/* Info Card */}
          {!isProcessing && !error && (
            <Card className="p-4 bg-blue-500/10 border-blue-500/30">
              <div className="text-sm text-blue-300">
                <div className="flex items-center space-x-2 mb-2">
                  <Sparkles className="w-4 h-4" />
                  <span className="font-medium">AI Upscaling Information</span>
                </div>
                <ul className="space-y-1 text-blue-200/80 text-xs list-disc list-inside">
                  <li>First-time model download may take a few minutes</li>
                  <li>Models are cached locally for faster subsequent use</li>
                  <li>WebGPU backend offers best performance on supported browsers</li>
                  <li>Processing time depends on image size and complexity</li>
                </ul>
              </div>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isProcessing}
              className="border-gray-600 text-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpscale}
              disabled={isProcessing || !imageSource}
              className="bg-gradient-to-r from-cyan-500/20 to-purple-500/20 hover:from-cyan-500/30 hover:to-purple-500/30 border-cyan-400/50 text-cyan-300"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin w-4 h-4 mr-2 border-2 border-cyan-400 border-t-transparent rounded-full" />
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Upscale Image
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}