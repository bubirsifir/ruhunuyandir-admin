'use client'

import { useState, useEffect } from 'react'
import { createClient, MeditationCategory, MeditationContent } from '@/lib/supabase'
import { Plus, X, AlertCircle, CheckCircle } from 'lucide-react'
import FileUpload from './FileUpload'

interface MeditationFormData {
  title: string
  description: string
  category_id: string
  meditation_duration: number
  is_loop: boolean
  loop_start_time: number
  loop_end_time: number
  available_durations: number[]
  difficulty_level: string
  benefits: string[]
  instructions: string
  audio_url: string
}

interface MeditationFormProps {
  onSubmit: (data: MeditationFormData) => Promise<void>
  onCancel: () => void
  isSubmitting: boolean
  initialData?: MeditationContent | null
  isEdit?: boolean
}

export default function MeditationForm({ onSubmit, onCancel, isSubmitting, initialData, isEdit = false }: MeditationFormProps) {
  const [categories, setCategories] = useState<MeditationCategory[]>([])
  const [, setAudioUrl] = useState('')
  const [audioFileName, setAudioFileName] = useState('')
  const [newBenefit, setNewBenefit] = useState('')
  const [newDuration, setNewDuration] = useState('')
  const [uploadError, setUploadError] = useState('')
  const [uploadSuccess, setUploadSuccess] = useState(false)

  const [formData, setFormData] = useState<MeditationFormData>({
    title: '',
    description: '',
    category_id: '',
    meditation_duration: 0,
    is_loop: false,
    loop_start_time: 0,
    loop_end_time: 0,
    available_durations: [5, 10, 15, 20, 30, 60], // Varsayılan süreler (dakika)
    difficulty_level: 'beginner',
    benefits: [],
    instructions: '',
    audio_url: ''
  })

  const supabase = createClient()

  useEffect(() => {
    loadCategories()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (initialData && isEdit) {
      // Database'den gelen available_durations saniye cinsinden, dakikaya çevir
      const availableDurationsInMinutes = initialData.available_durations 
        ? initialData.available_durations.map((duration: number) => Math.round(duration / 60))
        : [5, 10, 15, 20, 30, 60]; // Varsayılan değerler

      setFormData({
        title: initialData.title || '',
        description: initialData.description || '',
        category_id: initialData.category_id || '',
        meditation_duration: 0, // Artık kullanılmıyor, ses dosyası süresi otomatik
        is_loop: initialData.is_loop || false,
        loop_start_time: initialData.loop_start_time || 0,
        loop_end_time: initialData.loop_end_time || 0,
        available_durations: availableDurationsInMinutes,
        difficulty_level: initialData.difficulty_level || 'beginner',
        benefits: initialData.benefits || [],
        instructions: initialData.instructions || '',
        audio_url: initialData.audio_url || ''
      })
      setAudioUrl(initialData.audio_url || '')
      if (initialData.audio_url) {
        setAudioFileName(initialData.audio_url.split('/').pop() || 'Mevcut dosya')
        setUploadSuccess(true)
      }
    }
  }, [initialData, isEdit])

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('meditation_categories')
        .select('*')
        .order('name')

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  const handleInputChange = (field: keyof MeditationFormData, value: string | number | boolean | string[] | number[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleUploadSuccess = (url: string, fileName: string) => {
    setAudioUrl(url)
    setAudioFileName(fileName)
    setUploadError('')
    setUploadSuccess(true)
    handleInputChange('audio_url', url)
    
    setTimeout(() => setUploadSuccess(false), 3000)
  }

  const handleUploadError = (error: string) => {
    setUploadError(error)
    setUploadSuccess(false)
    setTimeout(() => setUploadError(''), 5000)
  }

  const addBenefit = () => {
    if (newBenefit.trim() && !formData.benefits.includes(newBenefit.trim())) {
      handleInputChange('benefits', [...formData.benefits, newBenefit.trim()])
      setNewBenefit('')
    }
  }

  const removeBenefit = (index: number) => {
    handleInputChange('benefits', formData.benefits.filter((_, i) => i !== index))
  }

  const addDuration = () => {
    const duration = parseInt(newDuration)
    if (duration > 0 && !formData.available_durations.includes(duration)) {
      handleInputChange('available_durations', [...formData.available_durations, duration].sort((a, b) => a - b))
      setNewDuration('')
    }
  }

  const removeDuration = (index: number) => {
    handleInputChange('available_durations', formData.available_durations.filter((_, i) => i !== index))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim()) {
      alert('Meditasyon başlığı gerekli!')
      return
    }
    
    if (!isEdit && !formData.audio_url) {
      alert('Ses dosyası yüklenmesi gerekli!')
      return
    }
    
    if (!formData.category_id) {
      alert('Kategori seçimi gerekli!')
      return
    }

    // Form'daki dakika değerlerini saniyeye çevir (database için)
    const submitData = {
      ...formData,
      available_durations: formData.available_durations.map(duration => duration * 60) // Dakikayı saniyeye çevir
    }

    onSubmit(submitData)
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          🧘‍♀️ {isEdit ? 'Meditasyon Düzenle' : 'Yeni Meditasyon Ekle'}
        </h2>
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Ses Dosyası Yükleme */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ses Dosyası *
          </label>
          <FileUpload
            onUploadSuccess={handleUploadSuccess}
            onUploadError={handleUploadError}
          />
          {uploadError && (
            <div className="mt-2 flex items-center text-red-600 text-sm">
              <AlertCircle className="w-4 h-4 mr-1" />
              {uploadError}
            </div>
          )}
          {uploadSuccess && (
            <div className="mt-2 flex items-center text-green-600 text-sm">
              <CheckCircle className="w-4 h-4 mr-1" />
              Dosya başarıyla yüklendi: {audioFileName}
            </div>
          )}
        </div>

        {/* Başlık */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Meditasyon Başlığı *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Örnek: Sabah Nefes Çalışması"
            required
          />
        </div>

        {/* Açıklama */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Açıklama
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Meditasyon hakkında kısa açıklama..."
          />
        </div>

        {/* Kategori */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Kategori *
          </label>
          <select
            value={formData.category_id}
            onChange={(e) => handleInputChange('category_id', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            required
          >
            <option value="">Kategori seçin</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name_turkish}
              </option>
            ))}
          </select>
        </div>

        {/* Süre Açıklaması */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Süre Bilgisi
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  <strong>Normal Meditasyon:</strong> Ses dosyasının süresi kadar çalacak (süre girmenize gerek yok)
                </p>
                <p className="mt-1">
                  <strong>Loop Meditasyon:</strong> Kullanıcı uygulamada süre seçecek, aşağıdan seçenekleri belirleyin
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Loop Ayarları */}
        <div>
          <label className="flex items-center space-x-2 mb-4">
            <input
              type="checkbox"
              checked={formData.is_loop}
              onChange={(e) => handleInputChange('is_loop', e.target.checked)}
              className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
            />
            <span className="text-sm font-medium text-gray-700">
              Loop Meditasyonu (Tekrarlanabilir)
            </span>
          </label>

          {formData.is_loop && (
            <div className="ml-6 space-y-4 border-l-4 border-purple-200 pl-4">
              <div className="bg-purple-50 rounded-lg p-3 mb-4">
                <p className="text-sm text-purple-700">
                  <strong>Loop Meditasyon:</strong> Ses dosyasının belirli bir bölümü tekrarlanacak. 
                  Kullanıcılar uygulamada aşağıdaki süre seçeneklerinden birini seçecek.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Loop Başlangıç (saniye)
                    <span className="text-xs text-gray-500 block">Tekrarın başlayacağı nokta</span>
                  </label>
                  <input
                    type="number"
                    value={formData.loop_start_time}
                    onChange={(e) => handleInputChange('loop_start_time', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    min="0"
                    placeholder="5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Loop Bitiş (saniye)
                    <span className="text-xs text-gray-500 block">Tekrarın biteceği nokta</span>
                  </label>
                  <input
                    type="number"
                    value={formData.loop_end_time}
                    onChange={(e) => handleInputChange('loop_end_time', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    min="0"
                    placeholder="60"
                  />
                </div>
              </div>

              {/* Kullanıcı Süre Seçenekleri */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kullanıcı Süre Seçenekleri (dakika)
                  <span className="text-xs text-gray-500 block">Uygulamada kullanıcının seçebileceği süreler</span>
                </label>
                <div className="flex items-center space-x-2 mb-3">
                  <input
                    type="number"
                    value={newDuration}
                    onChange={(e) => setNewDuration(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Örnek: 5, 10, 15..."
                    min="1"
                  />
                  <button
                    type="button"
                    onClick={addDuration}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-md flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Ekle
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.available_durations.map((duration, index) => (
                    <span
                      key={index}
                      className="bg-purple-100 text-purple-800 px-3 py-2 rounded-full text-sm flex items-center font-medium"
                    >
                      {duration} dakika
                      <button
                        type="button"
                        onClick={() => removeDuration(index)}
                        className="ml-2 text-purple-600 hover:text-purple-800"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                {formData.available_durations.length === 0 && (
                  <p className="text-sm text-gray-500 mt-2">
                    Henüz süre seçeneği eklenmemiş. Varsayılan: 5, 10, 15, 20, 30, 60 dakika
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Zorluk Seviyesi */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Zorluk Seviyesi
          </label>
          <select
            value={formData.difficulty_level}
            onChange={(e) => handleInputChange('difficulty_level', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="beginner">Başlangıç</option>
            <option value="intermediate">Orta</option>
            <option value="advanced">İleri</option>
          </select>
        </div>

        {/* Faydalar */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Faydalar
          </label>
          <div className="flex items-center space-x-2 mb-2">
            <input
              type="text"
              value={newBenefit}
              onChange={(e) => setNewBenefit(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Stresi azaltır"
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addBenefit())}
            />
            <button
              type="button"
              onClick={addBenefit}
              className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-md"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.benefits.map((benefit, index) => (
              <span
                key={index}
                className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm flex items-center"
              >
                {benefit}
                <button
                  type="button"
                  onClick={() => removeBenefit(index)}
                  className="ml-1 text-green-600 hover:text-green-800"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Talimatlar */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Talimatlar
          </label>
          <textarea
            value={formData.instructions}
            onChange={(e) => handleInputChange('instructions', e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Meditasyon yapmak için talimatlar..."
          />
        </div>

        {/* Butonlar */}
        <div className="flex justify-end space-x-4 pt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            İptal
          </button>
          <button
            type="submit"
            disabled={isSubmitting || (!isEdit && !formData.audio_url)}
            className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSubmitting 
              ? (isEdit ? 'Güncelleniyor...' : 'Kaydediliyor...') 
              : (isEdit ? 'Meditasyon Güncelle' : 'Meditasyon Ekle')
            }
          </button>
        </div>
      </form>
    </div>
  )
} 