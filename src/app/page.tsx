'use client'

import { useState, useEffect } from 'react'
import { createClient, MeditationContent, MeditationCategory } from '@/lib/supabase'
import { Upload, Music, Play, Pause, Trash2, Edit } from 'lucide-react'
import Modal from '@/components/Modal'
import MeditationForm from '@/components/MeditationForm'
import AuthWrapper from '@/components/AuthWrapper'

export default function AdminPanel() {
  const [meditations, setMeditations] = useState<MeditationContent[]>([])
  const [categories, setCategories] = useState<MeditationCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingMeditation, setEditingMeditation] = useState<MeditationContent | null>(null)
  const [deletingMeditation, setDeletingMeditation] = useState<MeditationContent | null>(null)

  const supabase = createClient()

  useEffect(() => {
    loadMeditations()
    loadCategories()
  }, [])

  const loadMeditations = async () => {
    try {
      const { data, error } = await supabase
        .from('meditation_content')
        .select(`
          *,
          meditation_categories (
            name_turkish,
            color
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      setMeditations(data || [])
    } catch (error) {
      console.error('Error loading meditations:', error)
    } finally {
      setLoading(false)
    }
  }

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

  const handleAddMeditation = async (formData: any) => {
    setIsSubmitting(true)
    
    try {
      const { data, error } = await supabase
        .from('meditation_content')
        .insert([
          {
            title: formData.title,
            description: formData.description,
            category_id: formData.category_id,
            meditation_duration: formData.is_loop ? null : 300, // Normal meditasyon: placeholder (ses dosyası süresi sonra güncellenecek)
            audio_url: formData.audio_url,
            audio_file_duration: 300, // Placeholder - gerçek ses dosyası süresi API'den alınacak
            content_type: 'meditation', // Required field
            is_loop: formData.is_loop,
            loop_start_time: formData.loop_start_time,
            loop_end_time: formData.loop_end_time,
            available_durations: formData.available_durations,
            default_duration: formData.is_loop ? 600 : null, // Loop için varsayılan 10 dakika
            difficulty_level: formData.difficulty_level,
            benefits: formData.benefits,
            instructions: formData.instructions,
            is_active: true
          }
        ])
        .select()

      if (error) throw error

      alert('Meditasyon başarıyla eklendi! 🎉')
      setIsModalOpen(false)
      loadMeditations() // Listeyi yenile
      
    } catch (error: any) {
      console.error('Error adding meditation:', error)
      alert('Meditasyon eklenirken hata oluştu: ' + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditMeditation = async (formData: any) => {
    if (!editingMeditation) return
    
    setIsSubmitting(true)
    
    try {
      const { data, error } = await supabase
        .from('meditation_content')
        .update({
          title: formData.title,
          description: formData.description,
          category_id: formData.category_id,
          meditation_duration: formData.is_loop ? null : 300, // Normal meditasyon: placeholder (ses dosyası süresi sonra güncellenecek)
          audio_url: formData.audio_url,
          audio_file_duration: 300, // Placeholder - gerçek ses dosyası süresi API'den alınacak
          is_loop: formData.is_loop,
          loop_start_time: formData.loop_start_time,
          loop_end_time: formData.loop_end_time,
          available_durations: formData.available_durations,
          default_duration: formData.is_loop ? 600 : null, // Loop için varsayılan 10 dakika
          difficulty_level: formData.difficulty_level,
          benefits: formData.benefits,
          instructions: formData.instructions,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingMeditation.id)
        .select()

      if (error) throw error

      alert('Meditasyon başarıyla güncellendi! ✨')
      setEditingMeditation(null)
      loadMeditations() // Listeyi yenile
      
    } catch (error: any) {
      console.error('Error updating meditation:', error)
      alert('Meditasyon güncellenirken hata oluştu: ' + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteMeditation = async () => {
    if (!deletingMeditation) return
    
    try {
      const { error } = await supabase
        .from('meditation_content')
        .update({ is_active: false }) // Soft delete
        .eq('id', deletingMeditation.id)

      if (error) throw error

      alert('Meditasyon başarıyla silindi! 🗑️')
      setDeletingMeditation(null)
      loadMeditations() // Listeyi yenile
      
    } catch (error: any) {
      console.error('Error deleting meditation:', error)
      alert('Meditasyon silinirken hata oluştu: ' + error.message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-2xl font-semibold text-purple-600">Yükleniyor...</div>
      </div>
    )
  }

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">🧘‍♀️ Ruhunu Uyandır Panel</h1>
          <p className="text-gray-600">Meditasyon içeriklerini yönetmek için admin panel</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <Music className="w-8 h-8 text-purple-600 mr-3" />
              <div>
                <h3 className="text-2xl font-bold text-gray-800">{meditations.length}</h3>
                <p className="text-gray-600">Toplam Meditasyon</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <Upload className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <h3 className="text-2xl font-bold text-gray-800">{categories.length}</h3>
                <p className="text-gray-600">Kategori Sayısı</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <Play className="w-8 h-8 text-green-600 mr-3" />
              <div>
                <h3 className="text-2xl font-bold text-gray-800">
                  {meditations.filter(m => m.is_loop).length}
                </h3>
                <p className="text-gray-600">Loop Meditation</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">🚀 Hızlı İşlemler</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg flex items-center justify-center transition-colors"
            >
              <Upload className="w-5 h-5 mr-2" />
              Yeni Meditasyon Ekle
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-800">📋 Mevcut Meditasyonlar</h2>
          </div>
          <div className="p-6">
            {meditations.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Henüz meditasyon eklenmemiş...</p>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {meditations.map((meditation) => (
                  <div key={meditation.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-800">{meditation.title}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            meditation.is_loop 
                              ? 'bg-purple-100 text-purple-700' 
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {meditation.is_loop ? 'Loop' : 'Sabit'}
                          </span>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                            {meditation.difficulty_level === 'beginner' ? 'Başlangıç' : 
                             meditation.difficulty_level === 'intermediate' ? 'Orta' : 'İleri'}
                          </span>
                        </div>
                        
                        <p className="text-gray-600 text-sm mb-3">{meditation.description}</p>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          {meditation.meditation_categories && (
                            <span className="flex items-center gap-1">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: meditation.meditation_categories.color || '#8B5CF6' }}
                              />
                              {meditation.meditation_categories.name_turkish}
                            </span>
                          )}
                          
                          <span className="flex items-center gap-1">
                            <Music className="w-4 h-4" />
                            {meditation.is_loop 
                              ? `${meditation.default_duration ? Math.round(meditation.default_duration / 60) : 10} dk (varsayılan)`
                              : `${meditation.meditation_duration ? Math.round(meditation.meditation_duration / 60) : 5} dk`
                            }
                          </span>
                          
                          <span className="text-xs">
                            {new Date(meditation.created_at).toLocaleDateString('tr-TR')}
                          </span>
                        </div>
                        
                        {meditation.benefits && meditation.benefits.length > 0 && (
                          <div className="mt-3">
                            <div className="flex flex-wrap gap-1">
                              {meditation.benefits.slice(0, 3).map((benefit, index) => (
                                <span key={index} className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded">
                                  {benefit}
                                </span>
                              ))}
                              {meditation.benefits.length > 3 && (
                                <span className="px-2 py-1 bg-gray-50 text-gray-500 text-xs rounded">
                                  +{meditation.benefits.length - 3} daha
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => setEditingMeditation(meditation)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Düzenle"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingMeditation(meditation)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Meditation Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        size="xl"
      >
        <MeditationForm
          onSubmit={handleAddMeditation}
          onCancel={() => setIsModalOpen(false)}
          isSubmitting={isSubmitting}
        />
      </Modal>

      {/* Edit Meditation Modal */}
      <Modal 
        isOpen={!!editingMeditation} 
        onClose={() => setEditingMeditation(null)}
        size="xl"
      >
        {editingMeditation && (
          <MeditationForm
            onSubmit={handleEditMeditation}
            onCancel={() => setEditingMeditation(null)}
            isSubmitting={isSubmitting}
            initialData={editingMeditation}
            isEdit={true}
          />
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal 
        isOpen={!!deletingMeditation} 
        onClose={() => setDeletingMeditation(null)}
        size="md"
      >
        {deletingMeditation && (
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Meditasyonu Sil
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              <strong>"{deletingMeditation.title}"</strong> adlı meditasyonu silmek istediğinizden emin misiniz? 
              Bu işlem geri alınamaz.
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setDeletingMeditation(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                İptal
              </button>
              <button
                onClick={handleDeleteMeditation}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Sil
              </button>
            </div>
          </div>
        )}
      </Modal>
      </div>
    </AuthWrapper>
  )
}
