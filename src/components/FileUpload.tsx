'use client'

import { useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Upload, X, File } from 'lucide-react'

interface FileUploadProps {
  onUploadSuccess: (url: string, fileName: string) => void
  onUploadError: (error: string) => void
}

export default function FileUpload({ onUploadSuccess, onUploadError }: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  // Dosya format doğrulama
  const validateFile = (file: File): boolean => {
    const validTypes = ['audio/mp3', 'audio/mpeg', 'audio/wav']
    const maxSize = 50 * 1024 * 1024 // 50MB
    
    if (!validTypes.includes(file.type)) {
      onUploadError('Sadece MP3 ve WAV formatları desteklenir.')
      return false
    }
    
    if (file.size > maxSize) {
      onUploadError('Dosya boyutu 50MB\'dan büyük olamaz.')
      return false
    }
    
    return true
  }

  // Dosya yükleme işlemi
  const uploadFile = async (file: File) => {
    if (!validateFile(file)) return

    setUploading(true)
    setUploadProgress(0)

    try {
      // Benzersiz dosya adı oluştur
      const timestamp = new Date().getTime()
      const fileExtension = file.name.split('.').pop()
      const fileName = `meditation_${timestamp}.${fileExtension}`
      
      // Supabase Storage'e yükle
      const { error } = await supabase.storage
        .from('meditation-audio')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        throw error
      }

      // Public URL al
      const { data: urlData } = supabase.storage
        .from('meditation-audio')
        .getPublicUrl(fileName)

      onUploadSuccess(urlData.publicUrl, fileName)
      setSelectedFile(null)
      setUploadProgress(100)
      
    } catch (error: unknown) {
      console.error('Upload error:', error)
      onUploadError((error as Error).message || 'Dosya yükleme başarısız oldu.')
    } finally {
      setUploading(false)
      setTimeout(() => setUploadProgress(0), 1000)
    }
  }

  // Drag & drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      setSelectedFile(file)
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      setSelectedFile(files[0])
    }
  }

  const handleUpload = () => {
    if (selectedFile) {
      uploadFile(selectedFile)
    }
  }

  const removeFile = () => {
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="w-full">
      {/* Drag & Drop Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 ${
          dragActive 
            ? 'border-purple-500 bg-purple-50' 
            : 'border-gray-300 hover:border-purple-400'
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {selectedFile ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <File className="w-6 h-6 text-purple-600" />
              <span className="text-sm font-medium text-gray-700">
                {selectedFile.name}
              </span>
              <button
                onClick={removeFile}
                className="text-red-500 hover:text-red-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="text-xs text-gray-500">
              {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
            </div>

            {uploading && (
              <div className="space-y-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <div className="text-xs text-gray-600">
                  Yükleniyor... %{Math.round(uploadProgress)}
                </div>
              </div>
            )}

            {!uploading && (
              <button
                onClick={handleUpload}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Dosyayı Yükle
              </button>
            )}
          </div>
        ) : (
          <>
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">
              Ses dosyasını buraya sürükle veya seç
            </p>
            <p className="text-xs text-gray-500 mb-4">
              MP3, WAV formatları desteklenir (Max 50MB)
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Dosya Seç
            </button>
          </>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".mp3,.wav,audio/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  )
} 