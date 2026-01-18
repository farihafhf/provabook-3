'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { FileIcon, Download, Trash2, Eye, Image as ImageIcon, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDateTime } from '@/lib/utils';

interface Document {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  category: string;
  subcategory?: string;
  description?: string;
  orderLine?: string;
  orderLineLabel?: string;
  uploadedByName: string;
  createdAt: string;
}

interface DocumentListProps {
  documents: Document[];
  orderId: string;
  onDelete: (documentId: string) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  sample: 'Sample Photo',
  lc: 'LC Document',
  pi: 'PI Document',
  email: 'Email',
  other: 'Other',
};

const SUBCATEGORY_LABELS: Record<string, string> = {
  lab_dip: 'Lab Dip',
  strike_off: 'Strike-Off',
  quality_test: 'Quality Test',
  bulk_swatch: 'Bulk Swatch',
  pp_sample: 'PP Sample',
};

export function DocumentList({ documents, orderId, onDelete }: DocumentListProps) {
  const { toast } = useToast();
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterOrderLine, setFilterOrderLine] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string>('');
  const [viewingDocument, setViewingDocument] = useState<{ 
    id: string; 
    fileName: string; 
    fileType: string; 
    signedUrl: string;
  } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<{ id: string; fileName: string } | null>(null);

  const sortedDocuments = [...documents].sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    return bTime - aTime;
  });

  // Get unique order lines for filtering
  const uniqueOrderLines = Array.from(
    new Set(documents.filter(doc => doc.orderLineLabel).map(doc => doc.orderLineLabel))
  ).sort();

  const filteredDocuments = sortedDocuments.filter(doc => {
    const categoryMatch = filterCategory === 'all' || doc.category === filterCategory;
    const orderLineMatch = filterOrderLine === 'all' || doc.orderLineLabel === filterOrderLine;
    return categoryMatch && orderLineMatch;
  });

  const getCategoryBadgeClass = (category: string) => {
    const classes: Record<string, string> = {
      sample: 'bg-purple-100 text-purple-700 border-purple-200',
      lc: 'bg-blue-100 text-blue-700 border-blue-200',
      pi: 'bg-green-100 text-green-700 border-green-200',
      email: 'bg-gray-100 text-gray-700 border-gray-200',
      other: 'bg-slate-100 text-slate-700 border-slate-200',
    };
    return classes[category] || classes.other;
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <ImageIcon className="h-5 w-5 text-purple-500" />;
    } else if (fileType === 'application/pdf') {
      return <FileText className="h-5 w-5 text-red-500" />;
    } else {
      return <FileIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleView = async (documentId: string, fileName: string, fileType: string, fileUrl: string) => {
    try {
      if (fileType.startsWith('image/')) {
        setViewingDocument({
          id: documentId,
          fileName,
          fileType,
          signedUrl: fileUrl,
        });
      } else {
        window.open(fileUrl, '_blank');
      }
    } catch (error) {
      console.error('View error:', error);
      toast({
        title: 'View failed',
        description: 'Failed to open file',
        variant: 'destructive',
      });
    }
  };

  const handleDownload = async (documentId: string, fileName: string, fileUrl: string) => {
    try {
      toast({
        title: 'Download started',
        description: `Downloading ${fileName}...`,
      });

      // Fetch the file directly and force download via blob
      const response = await fetch(fileUrl, {
        method: 'GET',
        mode: 'cors',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Get the blob and download it
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      
      // Cleanup after a short delay
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 100);

      toast({
        title: 'Download complete',
        description: `${fileName} downloaded successfully`,
      });
    } catch (error) {
      console.error('Download error:', error);
      // Fallback: open in new tab and let user save
      window.open(fileUrl, '_blank');
      toast({
        title: 'Opening file',
        description: 'Right-click the file and select "Save As" to download',
      });
    }
  };

  const openDeleteDialog = (documentId: string, fileName: string) => {
    setDocumentToDelete({ id: documentId, fileName });
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!documentToDelete) return;

    const documentId = documentToDelete.id;
    setDeleteDialogOpen(false);
    setDeletingId(documentId);
    
    try {
      await onDelete(documentId);
      toast({
        title: 'Success',
        description: 'Document deleted successfully',
      });
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Delete failed',
        description: 'Failed to delete document',
        variant: 'destructive',
      });
    } finally {
      setDeletingId('');
      setDocumentToDelete(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="sample">Sample Photos</SelectItem>
              <SelectItem value="lc">LC Documents</SelectItem>
              <SelectItem value="pi">PI Documents</SelectItem>
              <SelectItem value="email">Emails</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {uniqueOrderLines.length > 0 && (
          <div>
            <Select value={filterOrderLine} onValueChange={setFilterOrderLine}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by order line" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Order Lines</SelectItem>
                {uniqueOrderLines.map((lineLabel) => (
                  <SelectItem key={lineLabel} value={lineLabel!}>
                    {lineLabel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="text-sm text-gray-500 ml-auto">
          {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Document List */}
      {filteredDocuments.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-gray-50">
          <FileIcon className="mx-auto h-12 w-12 text-gray-400 mb-3" />
          <p className="text-gray-500">
            {filterCategory === 'all' 
              ? 'No documents uploaded yet'
              : `No ${CATEGORY_LABELS[filterCategory]?.toLowerCase()} documents`
            }
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDocuments.map((doc) => (
            <div
              key={doc.id}
              className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                {/* File Icon/Preview */}
                <div className="flex-shrink-0">
                  {doc.fileType.startsWith('image/') ? (
                    <img
                      src={doc.fileUrl}
                      alt={doc.fileName}
                      className="h-16 w-16 object-cover rounded border"
                    />
                  ) : (
                    <div className="h-16 w-16 flex items-center justify-center bg-gray-100 rounded border">
                      {getFileIcon(doc.fileType)}
                    </div>
                  )}
                </div>

                {/* Document Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium text-gray-900 truncate">{doc.fileName}</h4>
                        {doc.orderLineLabel && (
                          <Badge className="bg-blue-600 text-white border-blue-700 font-semibold px-3 py-1">
                            📦 {doc.orderLineLabel}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Badge className={`${getCategoryBadgeClass(doc.category)} border`}>
                          {CATEGORY_LABELS[doc.category]}
                        </Badge>
                        {doc.subcategory && (
                          <Badge variant="outline" className="text-xs">
                            {SUBCATEGORY_LABELS[doc.subcategory]}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleView(doc.id, doc.fileName, doc.fileType, doc.fileUrl)}
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(doc.id, doc.fileName, doc.fileUrl)}
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteDialog(doc.id, doc.fileName)}
                        disabled={deletingId === doc.id}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>

                  {doc.description && (
                    <p className="text-sm text-gray-600 mt-2">{doc.description}</p>
                  )}

                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span>{formatFileSize(doc.fileSize)}</span>
                    <span>•</span>
                    <span>Uploaded by {doc.uploadedByName}</span>
                    <span>•</span>
                    <span>{formatDateTime(doc.createdAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image Viewer Modal */}
      <Dialog open={!!viewingDocument} onOpenChange={() => setViewingDocument(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="flex items-center justify-between">
              <span className="truncate pr-8">{viewingDocument?.fileName}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="relative w-full overflow-auto p-6 pt-4">
            {viewingDocument && (
              <img
                src={viewingDocument.signedUrl}
                alt={viewingDocument.fileName}
                className="w-full h-auto object-contain max-h-[70vh] mx-auto rounded-lg"
              />
            )}
          </div>
          <div className="flex items-center justify-end gap-2 p-6 pt-0 border-t">
            <Button
              variant="outline"
              onClick={() => {
                if (viewingDocument) {
                  handleDownload(viewingDocument.id, viewingDocument.fileName, viewingDocument.signedUrl);
                }
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button variant="outline" onClick={() => setViewingDocument(null)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{documentToDelete?.fileName}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDocumentToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
