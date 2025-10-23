'use client';

import { useState, useRef, DragEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, X, FileIcon, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FileUploadProps {
  orderId: string;
  onUploadComplete: () => void;
}

const CATEGORY_OPTIONS = [
  { value: 'sample', label: 'Sample Photo' },
  { value: 'lc', label: 'LC Document' },
  { value: 'pi', label: 'PI Document' },
  { value: 'test_report', label: 'Test Report' },
  { value: 'email', label: 'Email/Communication' },
  { value: 'other', label: 'Other' },
];

const SUBCATEGORY_OPTIONS = [
  { value: 'lab_dip', label: 'Lab Dip' },
  { value: 'strike_off', label: 'Strike-Off' },
  { value: 'quality_test', label: 'Quality Test' },
  { value: 'bulk_swatch', label: 'Bulk Swatch' },
  { value: 'pp_sample', label: 'PP Sample' },
];

export function FileUpload({ orderId, onUploadComplete }: FileUploadProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState<string>('');
  const [subcategory, setSubcategory] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string>('');

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf', 
                         'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                         'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload JPG, PNG, PDF, Excel, or Word files only',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'File size must be less than 10MB',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);

    // Generate preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview('');
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !category) {
      toast({
        title: 'Missing information',
        description: 'Please select a file and category',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('category', category);
      if (subcategory) formData.append('subcategory', subcategory);
      if (description) formData.append('description', description);

      const token = localStorage.getItem('access_token');
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'}/orders/${orderId}/documents/upload`;
      
      console.log('=== UPLOAD DEBUG ===');
      console.log('API URL:', apiUrl);
      console.log('Order ID:', orderId);
      console.log('Category:', category);
      console.log('File:', selectedFile.name, selectedFile.type, selectedFile.size);
      console.log('Token exists:', !!token);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const responseText = await response.text();
        console.error('Response text:', responseText);
        
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch {
          errorData = { message: `Upload failed with status ${response.status}: ${responseText || 'No error details'}` };
        }
        
        console.error('Parsed error:', errorData);
        throw new Error(errorData.message || errorData.error || `Upload failed (${response.status})`);
      }

      toast({
        title: 'Success',
        description: 'Document uploaded successfully',
      });

      // Reset form
      setSelectedFile(null);
      setCategory('');
      setSubcategory('');
      setDescription('');
      setPreview('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      onUploadComplete();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload document. Please check the console for details.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setPreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Drag & Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${selectedFile ? 'bg-gray-50' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.gif,.pdf,.xlsx,.xls,.docx,.doc"
          onChange={handleFileInputChange}
          className="hidden"
        />
        
        {!selectedFile ? (
          <div className="space-y-2">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <div className="text-sm text-gray-600">
              <span className="font-semibold text-blue-600">Click to upload</span> or drag and drop
            </div>
            <p className="text-xs text-gray-500">
              PNG, JPG, PDF, Excel, Word (max 10MB)
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {preview ? (
              <img src={preview} alt="Preview" className="mx-auto max-h-48 rounded" />
            ) : (
              <FileIcon className="mx-auto h-12 w-12 text-blue-500" />
            )}
            <div className="text-sm font-medium text-gray-900">{selectedFile.name}</div>
            <div className="text-xs text-gray-500">
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                clearFile();
              }}
            >
              <X className="h-4 w-4 mr-1" />
              Remove
            </Button>
          </div>
        )}
      </div>

      {/* Category Selection */}
      {selectedFile && (
        <div className="space-y-4 border rounded-lg p-4 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {category === 'sample' && (
              <div className="space-y-2">
                <Label htmlFor="subcategory">Sample Type</Label>
                <Select value={subcategory} onValueChange={setSubcategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select sample type" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBCATEGORY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="Add notes about this document..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={clearFile}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleUpload}
              disabled={!category || uploading}
            >
              {uploading ? 'Uploading...' : 'Upload Document'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
